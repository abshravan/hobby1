# Metaprompt: Build "The Life Checklist" App Step-by-Step

Paste this into your AI coding assistant (Claude Code, Cursor, etc.) as the starting context. It's designed to be used across many sessions — the assistant should build incrementally, checking in with you rather than trying to do everything in one shot.

---

## SYSTEM CONTEXT — READ FIRST

You are helping me build a web app called **[APP NAME]** — a life-goals checklist app with a twist: it has a "roast or motivate" message engine that reacts to user behavior, plus streaks, badges, and friends. The full product spec is below. Your job is to build this **incrementally, one clearly-scoped step at a time**, confirming each step works before moving to the next. Do not try to build the whole app in one response.

### Core product concept
Users check off "life experience" items (e.g. "watched a sunrise," "learned an instrument") grouped into 8 identity categories (Adventurer, Creator, Connector, Learner, Explorer, Caretaker, Provider, Rebel). Each item shows "X% of users have done this." The app has a tone system — users pick "Roast me" or "Motivate me" — and the app sends contextual messages based on triggers (stagnant items, streaks, inactivity, etc.). Users can add friends, compare progress, earn badges, and generate a shareable "life score" card.

### Tech stack (use these — do not substitute without asking me first)
- **Frontend:** Next.js (App Router) + React + Tailwind CSS
- **Backend:** Next.js API routes to start
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth
- **Hosting:** Vercel (app) + Supabase (DB/auth/storage)
- **Share card image generation:** `@vercel/og` (Satori)
- **Analytics:** PostHog
- **Background jobs (later phase):** Supabase Edge Functions with cron, or Inngest

### Data model (build to this shape; extend only with my sign-off)
```
users (id, email, tone_preference, created_at)
categories (id, name, slug, type)  -- type = "checkbox" for MVP; "entry" reserved for future (books/movies/music)
items (id, category_id, title, description, difficulty, is_active)
user_item_progress (id, user_id, item_id, status, completed_at, needs_help, is_private)
item_stats (item_id, total_users, completed_users, completion_rate)  -- can be a materialized view
badges (id, name, description, criteria_type, criteria_value)
user_badges (user_id, badge_id, earned_at)
streaks (user_id, current_count, longest_count, last_action_date, freeze_available)
friendships (user_id, friend_id, status, created_at)
messages (id, trigger_type, tone, copy_text)  -- roast/motivate copy library
```

### Roast/Motivate rules (non-negotiable — build these into the logic, not just the copy)
1. Roast the **behavior/pattern**, never the person's identity or worth.
2. `needs_help_flag = true` on an item **always overrides** to motivate-only tone, regardless of the user's global tone setting.
3. Triggers following a long inactivity gap (14+ days) or a broken streak default to **motivate tone even in roast mode** — these are weak signals for "joke with them," strong signals for "check in gently."
4. If free-text input is ever added anywhere in the app, it must pass through a lightweight distress-language check before any roast copy can be shown; on a match, always show a plain supportive message with no gamification. This is a hard override in the trigger logic, not a style choice — do not let me skip this when we get to that feature.
5. Every roast message must pair with a concrete, small next action — never leave a roast with no path forward.

### Full item list and message copy
[Paste the contents of your life_checklist_and_message_engine.md file here, or tell the assistant "the item list and message copy are in life_checklist_and_message_engine.md, read that file first" if you're working in an environment like Claude Code that can read local files.]

---

## HOW I WANT YOU TO WORK

1. **Confirm scope before coding.** At the start of each step below, briefly restate what you're about to build and ask if I want to adjust anything, unless I've explicitly said "go ahead and build the next N steps."
2. **One step at a time.** Finish and explain a step, tell me how to test it, and wait for me to confirm it works before moving to the next step.
3. **Explain non-obvious decisions.** If you choose a library, pattern, or shortcut I didn't specify, tell me why in a sentence or two.
4. **Flag scope creep.** If a request from me would expand a step's scope significantly, say so before doing it.
5. **Keep security and privacy defaults in mind** without being asked every time: friends-only visibility by default, private-item flags respected everywhere (feeds, comparisons, leaderboards), no exposing another user's private items even indirectly.
6. **Don't invent features not in this spec** without checking with me first — extend the spec deliberately, not by accretion.

---

## BUILD ORDER — WORK THROUGH THESE IN SEQUENCE

### Step 1: Project setup
Set up the Next.js + Tailwind + Supabase project skeleton. Get a basic page deployed to Vercel with a Supabase connection confirmed working. No features yet — just prove the stack is wired together.

### Step 2: Auth
Implement Supabase Auth (email + at least one social provider). Users can sign up, log in, log out, and see a basic authenticated "home" page.

### Step 3: Core data + seeding
Create the database tables per the schema above. Write a seed script that loads the 8 categories and the full item list into the `items` table.

### Step 4: Checklist core loop
Build the main checklist UI: browse items by category, check/uncheck an item, see live % completion per category and overall. This is the core loop — get it feeling good before adding anything else.

### Step 5: Aggregate completion stats
Implement the "X% of users have done this" calculation (materialized view or scheduled recalculation) and surface it on each item.

### Step 6: Tone setting + message engine (no triggers yet)
Add the roast/motivate toggle in user settings. Build the message engine as a function that takes a trigger type + tone + context and returns copy — but don't wire up automatic triggers yet, just prove the function works with manual test calls.

### Step 7: Wire up triggers
Connect real triggers: `item_stagnant`, `first_check`, `streak`, `inactivity`, `needs_help_flag`, `category_milestone`, `plateau`. Follow the override rules above exactly (needs_help and inactivity/plateau always route to motivate tone).

### Step 8: Streaks
Implement streak tracking (weekly, not daily, per the spec), streak freeze/grace mechanic, and streak-break messaging routed through motivate tone.

### Step 9: Badges
Implement category badges, the cross-category "Well-Rounded" badge, behavior badges, and rarity badges. Build the logic that checks and awards badges after relevant actions (not on every page load).

### Step 10: Shareable result card
Build the "life score" card as a dynamically generated image (via @vercel/og) plus a public share page with good link-preview metadata.

### Step 11: Friends
Implement the friend model (add/follow, no mutual approval needed for MVP), side-by-side progress comparison respecting privacy flags, and a lightweight activity feed (highlights only).

### Step 12: Nudge a friend
Let a user send a friend a nudge on a stagnant item, reusing the message engine's roast/motivate copy.

### Step 13: Analytics instrumentation
Wire up PostHog for: signup → first item checked, items checked per session, share card generated/clicked, day 1/7/30 retention, roast vs motivate mode selection split.

### Step 14: Polish pass
Onboarding flow, empty states, mobile responsiveness pass, loading/error states throughout.

### Step 15 (post-MVP, don't start until I confirm): Community item submissions
User-submitted items with upvoting, plus a lightweight moderation queue for me to review before items go live.

---

## WHEN WE'RE DONE WITH A STEP

At the end of each step, give me:
1. A one-paragraph summary of what was built
2. Exactly how to test it locally
3. Anything you skipped, simplified, or flagged as a decision I should weigh in on later

Do not start Step 2 until I've told you Step 1 is confirmed working, unless I explicitly say to keep going.
