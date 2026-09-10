-- Artha — aggregate completion stats (Step 5)
--
-- Redefines item_stats so the denominator is *engaged* users rather than every
-- registered account. A signup that never checked anything tells us nothing
-- about how common an experience is, and counting them drags every rate toward
-- zero as dead accounts accumulate.
--
-- Privacy: this view is deliberately blind to is_private. A private item still
-- counts toward the aggregate, because the aggregate identifies nobody — that
-- is exactly the trade the spec asks for ("aggregate stats stay public and
-- anonymous; that's the core hook").

drop materialized view if exists public.item_stats;

create materialized view public.item_stats as
with engaged as (
  -- One row per user who has completed at least one item, ever.
  select count(distinct user_id) as total
  from public.user_item_progress
  where status = 'completed'
)
select
  i.id as item_id,
  (select total from engaged) as total_users,
  count(p.user_id) filter (where p.status = 'completed') as completed_users,
  case
    when (select total from engaged) = 0 then 0::numeric
    else round(
      count(p.user_id) filter (where p.status = 'completed')::numeric
        / (select total from engaged),
      4
    )
  end as completion_rate
from public.items i
left join public.user_item_progress p on p.item_id = i.id
group by i.id;

-- CONCURRENTLY requires a unique index, and refreshing concurrently is what
-- keeps the checklist readable while the view rebuilds.
create unique index item_stats_item_id_idx on public.item_stats (item_id);

grant select on public.item_stats to authenticated, anon;

create or replace function public.refresh_item_stats()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.item_stats;
exception
  -- CONCURRENTLY fails if the view has never been populated; fall back once.
  when object_not_in_prerequisite_state then
    refresh materialized view public.item_stats;
end;
$$;

-- Refreshing is a trusted operation: it is cheap but not free, and no end user
-- should be able to trigger it on demand.
revoke all on function public.refresh_item_stats() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.refresh_item_stats() to service_role';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Scheduled refresh
-- ---------------------------------------------------------------------------
-- Preferred path: pg_cron inside Postgres, hourly. If pg_cron is not available
-- on this project, this block is a no-op and POST /api/admin/refresh-stats is
-- the fallback — point any external scheduler at it.

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;

    begin
      perform cron.unschedule('refresh-item-stats');
    exception
      when others then null;  -- not scheduled yet
    end;

    perform cron.schedule(
      'refresh-item-stats',
      '7 * * * *',  -- offset from the hour so it does not collide with other jobs
      $job$ select public.refresh_item_stats(); $job$
    );
    raise notice 'item_stats refresh scheduled hourly via pg_cron';
  else
    raise notice 'pg_cron unavailable — schedule POST /api/admin/refresh-stats instead';
  end if;
end;
$$;
