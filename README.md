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
| 5 | Aggregate completion stats | done |
| 6 | Tone setting + message engine | done |
| 7 | Wire up triggers | next |
| 8–15 | see the build plan | not started |

## Stack

Next.js 15 (App Router) · React 19 · Tailwind CSS v4 · Supabase (Postgres + Auth) ·
deployed on Vercel.

## Signing in while developing

`/dev/login` signs you in as a seeded persona with one click — a real Supabase
session, so RLS and every auth check behave exactly as they do in production.

```bash
# in .env.local
ENABLE_DEV_LOGIN=true

npm run dev:seed                # personas + 40 synthetic users so stats appear
npm run dev:seed -- --users=0   # personas only
npm run dev:seed:clean          # delete every dev account and its progress
```

| Persona | For testing |
|---|---|
| Nia | Nothing checked — empty states, first-check, 0% |
| Rey | A scattered third of the list — the ordinary case |
| Ras | Roast tone, mid progress — the message engine |
| Cam | Adventurer at 100%, most categories past 75% — milestones and badges |

The synthetic users exist because completion stats stay hidden below
`MIN_USERS_FOR_STATS`; without them you cannot see the "X% of users have done
this" hook while developing. Every seeded account uses a `dev-` prefix on the
reserved `.test` TLD, so `--clean` finds them all and no address can reach a
real inbox.

**This must never be enabled in a deployed environment** — it lets anyone sign
in as any seeded account. Four guards:

1. `devLoginEnabled()` requires `NODE_ENV !== "production"` *and*
   `ENABLE_DEV_LOGIN === "true"` (exactly that string).
2. The page 404s when disabled.
3. The middleware 404s anything under `/dev`, including POSTs to the Server
   Action.
4. `next.config.ts` **fails the production build** if the flag is set — the one
   guard a misconfigured deploy cannot route around at runtime.

The seed script refuses to run unless the flag is set, so it cannot be pointed
at a production project by accident.

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

Migration `0003` schedules an hourly rebuild of the completion-rate view with
pg_cron. If pg_cron is not available on your project the migration says so and
does nothing else — point a scheduler at `POST /api/admin/refresh-stats`
instead, with `CRON_SECRET` set (Vercel Cron sends it automatically).

`npm run db:seed` is idempotent — rows are matched on their natural keys, so
re-running updates in place. `npm run db:seed:prune` additionally deactivates
items that no longer appear in `src/content/`. Items are deactivated, never
deleted, so user progress is never orphaned.

### Auth providers

Email/password works out of the box. For Google sign-in, enable the Google
provider in **Supabase → Authentication → Providers** and add
`<site-url>/auth/callback` to the allowed redirect URLs.

## Completion stats

"X% of users have done this" is computed by the `item_stats` materialized view.
Two decisions worth knowing:

- **The denominator is engaged users**, not registrations — people who have
  completed at least one item. Counting dormant signups would drag every rate
  toward zero as they accumulate.
- **Nothing is shown below `MIN_USERS_FOR_STATS`** (25, in `src/lib/stats.ts`).
  Under that, the first user to check an item would be told 100% of users have
  done it, which is true and useless.

## The message engine

`selectMessage()` in `src/lib/messages/engine.ts` takes a trigger, the user's
tone preference and some context, and returns one filled message. Nothing calls
it automatically yet — Step 7 wires the triggers. To see it work:

```bash
npm run messages:demo
```

That runs a matrix of trigger x tone x context against the real copy library and
prints what a user would be shown. Read the `via` field: it names the rule that
decided the tone, so any de-escalation is auditable rather than mysterious.

Tone resolution (`src/lib/messages/tone.ts`) applies the product's rules in
order, and every branch is a *de-escalation* — nothing can turn a motivate
preference into a roast, so a wrong signal can only ever produce a message
kinder than it needed to be:

| Condition | Tone | Why |
|---|---|---|
| Distress language in free text | support | Hard override, checked first. No joke, no gamification |
| `distress_support` / `plateau` | support | Never a joke |
| `needs_help_flag`, or the item is flagged | motivate | Rule 2 |
| `inactivity`, `streak_break` | motivate | Rule 3 |
| Away 14+ days, or a streak just broke | motivate | Rule 3 as *context* — softens any trigger |
| otherwise | the user's setting | |

Two details worth knowing:

- **A long absence softens every trigger, not just the absence ones.** Coming
  back after three weeks to a joke about being absent is the failure that rule
  prevents.
- **Variants whose placeholders cannot be filled are skipped.** A `{days}` line
  is never chosen when no day count was supplied — shipping a literal `{item}`
  to a user is worse than showing different copy.

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
