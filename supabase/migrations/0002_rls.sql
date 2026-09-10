-- Artha — Row Level Security (Step 3)
--
-- Privacy contract, enforced here rather than in application code:
--   * A profile is friends-only by default.
--   * A user's private items are invisible to everyone but that user —
--     in feeds, comparisons and leaderboards alike.
--   * Aggregate "X% of users have done this" stays public and anonymous.

-- ---------------------------------------------------------------------------
-- Helpers (security definer so policies never recurse through RLS)
-- ---------------------------------------------------------------------------

-- Does the current user follow `target`?
create or replace function public.follows(target uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.friendships f
    where f.user_id = auth.uid()
      and f.friend_id = target
      and f.status = 'accepted'
  );
$$;

-- May the current user see `target`'s profile and non-private progress?
create or replace function public.can_view_profile(target uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    target = auth.uid()
    or exists (
      select 1
      from public.users u
      where u.id = target
        and (
          u.visibility = 'public'
          or (u.visibility = 'friends' and public.follows(target))
        )
    );
$$;

revoke all on function public.follows(uuid) from public;
revoke all on function public.can_view_profile(uuid) from public;
grant execute on function public.follows(uuid) to authenticated;
grant execute on function public.can_view_profile(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Reference data: readable by anyone signed in, writable only by service role.
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.badges enable row level security;
alter table public.messages enable row level security;

create policy "categories are readable" on public.categories
  for select to authenticated, anon using (true);

create policy "active items are readable" on public.items
  for select to authenticated, anon using (is_active);

create policy "badges are readable" on public.badges
  for select to authenticated, anon using (true);

-- Copy is served to the client through the message engine, but reading the
-- library directly is harmless and keeps client-side preview simple.
create policy "active messages are readable" on public.messages
  for select to authenticated using (is_active);

-- Aggregate stats: public and anonymous by design.
grant select on public.item_stats to authenticated, anon;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;

create policy "read own or visible profiles" on public.users
  for select to authenticated
  using (public.can_view_profile(id));

create policy "update own profile" on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Rows are normally created by the on_auth_user_created trigger; this covers
-- a self-heal insert if that trigger ever misses.
create policy "insert own profile" on public.users
  for insert to authenticated
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- user_item_progress
-- ---------------------------------------------------------------------------

alter table public.user_item_progress enable row level security;

create policy "read own progress" on public.user_item_progress
  for select to authenticated
  using (user_id = (select auth.uid()));

-- The `is_private` check is what keeps a private item out of a friend's
-- comparison view, activity feed and any "friends who did this" list.
create policy "read visible friends progress" on public.user_item_progress
  for select to authenticated
  using (
    user_id <> (select auth.uid())
    and is_private = false
    and public.can_view_profile(user_id)
  );

create policy "insert own progress" on public.user_item_progress
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "update own progress" on public.user_item_progress
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "delete own progress" on public.user_item_progress
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- user_badges
-- ---------------------------------------------------------------------------

alter table public.user_badges enable row level security;

create policy "read own or visible badges" on public.user_badges
  for select to authenticated
  using (public.can_view_profile(user_id));

-- Awarding is done server-side with the service role (Step 9), never by the
-- client, so there is no insert/update policy for authenticated users.

-- ---------------------------------------------------------------------------
-- streaks  (own only — a friend sees badges and checks, not streak internals)
-- ---------------------------------------------------------------------------

alter table public.streaks enable row level security;

create policy "read own streak" on public.streaks
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- friendships
-- ---------------------------------------------------------------------------

alter table public.friendships enable row level security;

create policy "read own friendships" on public.friendships
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or friend_id = (select auth.uid())
  );

create policy "follow someone" on public.friendships
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "unfollow someone" on public.friendships
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Blocking is a status change on your own row.
create policy "update own friendships" on public.friendships
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
