# Artha

A life-experience checklist with a tone problem. 128 things worth having done,
grouped into eight identity categories, each showing how many other people have
done it. Pick "roast me" or "motivate me" and the app reacts to how you actually
behave.

Build plan: [`docs/build-plan.md`](docs/build-plan.md).
Item list and copy source: [`docs/life_checklist_and_message_engine.md`](docs/life_checklist_and_message_engine.md).

## Status

| Step | | |
|---|---|---|
| 1 | Project setup | done |
| 2 | Auth | done |
| 3 | Core data + seeding | done |
| 4 | Checklist core loop | done |
| 5 | Aggregate completion stats | next |
| 6–15 | see the build plan | not started |

## Stack

Next.js 15 (App Router) · React 19 · Tailwind CSS v4 · Supabase (Postgres + Auth) ·
deployed on Vercel.

## Tests

```bash
npm test           # progress math
npm run lint
npm run typecheck
```

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in your Supabase keys
npm run dev
```

Visit http://localhost:3000/status to confirm the stack is wired together — it
reports on every environment variable and probes both Supabase Auth and the
database.

### Database

Apply the migrations in order, either through the Supabase SQL editor or the CLI:

```bash
supabase db push          # or paste supabase/migrations/*.sql into the SQL editor
npm run db:seed           # loads 8 categories, 128 items, 79 copy lines
```

`npm run db:seed` is idempotent — rows are matched on their natural keys, so
re-running updates in place. `npm run db:seed:prune` additionally deactivates
items that no longer appear in `src/content/`. Items are deactivated, never
deleted, so user progress is never orphaned.

### Auth providers

Email/password works out of the box. For Google sign-in, enable the Google
provider in **Supabase → Authentication → Providers** and add
`<site-url>/auth/callback` to the allowed redirect URLs.

## How the tone rules are enforced

The roast/motivate rules are not style guidance — they are constraints on
`public.messages`, so no future code path can route around them:

- `roast_requires_micro_action` — roast copy without a concrete next step is
  rejected at insert time.
- `no_roast_on_supportive_triggers` — `needs_help_flag`, `inactivity`,
  `plateau`, `streak_break` and `distress_support` can never hold roast copy.

Privacy is enforced the same way, in Row Level Security rather than in queries:
a profile is friends-only by default, and an item marked private is invisible to
everyone but its owner — in comparisons, feeds and leaderboards alike. Aggregate
"X% of users have done this" is public and anonymous by design.

## Layout

```
src/app/            routes (landing, auth, the checklist, status, health API)
src/components/     shared UI
src/content/        seed content — items and the copy library, edit these
src/lib/            progress math, shared queries, types
src/lib/supabase/   browser / server / admin clients + session middleware
supabase/migrations schema and RLS policies
scripts/seed.ts     idempotent seeder
```
