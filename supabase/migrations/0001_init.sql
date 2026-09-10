-- Artha — core schema (Step 3)
--
-- Naming follows the product spec's data model. `public.users` mirrors
-- `auth.users` one-to-one; Supabase Auth owns identity, this table owns
-- app-level profile state.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.tone_preference as enum ('roast', 'motivate');
create type public.profile_visibility as enum ('private', 'friends', 'public');
create type public.category_type as enum ('checkbox', 'entry');
create type public.item_difficulty as enum ('quick', 'moderate', 'stretch');
create type public.progress_status as enum ('saved', 'in_progress', 'completed');
create type public.friendship_status as enum ('accepted', 'blocked');
create type public.badge_criteria_type as enum (
  'category_percent', 'all_categories_touched', 'behavior', 'rarity'
);
create type public.message_trigger as enum (
  'item_stagnant', 'first_check', 'streak', 'streak_break',
  'inactivity', 'needs_help_flag', 'category_milestone', 'plateau',
  -- Not a behavioural trigger: the hard override used when a distress-language
  -- check fires on free-text input. Plain support, no joke, no gamification.
  'distress_support'
);
-- 'support' is deliberately distinct from 'motivate': it is the plain,
-- un-gamified voice used for the distress-language override.
create type public.message_tone as enum ('roast', 'motivate', 'support');

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  tone_preference public.tone_preference not null default 'motivate',
  -- Privacy default per spec: friends-only, never public on signup.
  visibility public.profile_visibility not null default 'friends',
  -- Drives the `inactivity` and `plateau` triggers.
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on column public.users.tone_preference is
  'Global default only. needs_help, inactivity, plateau and streak_break always override to a supportive tone.';

-- Mirror new auth users into public.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- categories / items
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  -- 'entry' is reserved for future list-style categories (books/movies/music).
  type public.category_type not null default 'checkbox',
  tagline text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text,
  difficulty public.item_difficulty not null default 'moderate',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index items_category_id_idx on public.items (category_id);
create index items_active_idx on public.items (category_id, sort_order) where is_active;

-- ---------------------------------------------------------------------------
-- user_item_progress
-- ---------------------------------------------------------------------------

create table public.user_item_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  status public.progress_status not null default 'saved',
  completed_at timestamptz,
  -- "I want help with this" — forces motivate tone for every message about
  -- this item, regardless of the user's global tone_preference.
  needs_help boolean not null default false,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, item_id),
  -- completed_at and status can never disagree.
  constraint progress_completed_at_matches_status check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create index user_item_progress_user_idx on public.user_item_progress (user_id);
create index user_item_progress_item_idx on public.user_item_progress (item_id);
-- Supports the item_stagnant trigger scan.
create index user_item_progress_stagnant_idx
  on public.user_item_progress (updated_at)
  where status <> 'completed';

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_item_progress_touch
  before update on public.user_item_progress
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- item_stats  (Step 5 surfaces this; the refresh schedule is wired there)
-- ---------------------------------------------------------------------------

create materialized view public.item_stats as
select
  i.id as item_id,
  (select count(*) from public.users) as total_users,
  count(p.user_id) filter (where p.status = 'completed') as completed_users,
  case
    when (select count(*) from public.users) = 0 then 0::numeric
    else round(
      count(p.user_id) filter (where p.status = 'completed')::numeric
        / (select count(*) from public.users),
      4
    )
  end as completion_rate
from public.items i
left join public.user_item_progress p on p.item_id = i.id
group by i.id;

-- Aggregate stats are public and anonymous by design — private item flags
-- deliberately do NOT exclude a row here, because no individual is identifiable.
create unique index item_stats_item_id_idx on public.item_stats (item_id);

create or replace function public.refresh_item_stats()
returns void
language sql
security definer
set search_path = public
as $$
  refresh materialized view concurrently public.item_stats;
$$;

-- ---------------------------------------------------------------------------
-- badges
-- ---------------------------------------------------------------------------

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  criteria_type public.badge_criteria_type not null,
  -- Percent for category_percent, threshold for rarity/behavior, null otherwise.
  criteria_value numeric,
  -- Set only for per-category badges.
  category_id uuid references public.categories (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.user_badges (
  user_id uuid not null references public.users (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- ---------------------------------------------------------------------------
-- streaks  (weekly cadence per spec, not daily)
-- ---------------------------------------------------------------------------

create table public.streaks (
  user_id uuid primary key references public.users (id) on delete cascade,
  current_count integer not null default 0,
  longest_count integer not null default 0,
  last_action_date date,
  freeze_available boolean not null default true,
  freeze_refreshed_at timestamptz,
  updated_at timestamptz not null default now()
);

create trigger streaks_touch
  before update on public.streaks
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- friendships  (follow model — no mutual approval for MVP)
-- ---------------------------------------------------------------------------

create table public.friendships (
  user_id uuid not null references public.users (id) on delete cascade,
  friend_id uuid not null references public.users (id) on delete cascade,
  status public.friendship_status not null default 'accepted',
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  constraint friendship_not_self check (user_id <> friend_id)
);

create index friendships_friend_idx on public.friendships (friend_id);

-- ---------------------------------------------------------------------------
-- messages  (roast/motivate copy library)
-- ---------------------------------------------------------------------------

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  trigger_type public.message_trigger not null,
  tone public.message_tone not null,
  copy_text text not null,
  -- Rule 5: a roast without a concrete next step is not shippable copy.
  micro_action text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (trigger_type, tone, copy_text),

  constraint roast_requires_micro_action check (
    tone <> 'roast' or (micro_action is not null and length(btrim(micro_action)) > 0)
  ),

  -- Rules 2 and 3, enforced in the schema so no future code path can bypass
  -- them: these triggers can never carry roast copy.
  constraint no_roast_on_supportive_triggers check (
    tone <> 'roast'
    or trigger_type not in (
         'needs_help_flag', 'inactivity', 'plateau', 'streak_break', 'distress_support'
       )
  )
);

create index messages_lookup_idx on public.messages (trigger_type, tone) where is_active;
