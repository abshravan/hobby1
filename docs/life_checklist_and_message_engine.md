# Life Checklist — Item List & Message Engine

## How this is organized

Items are grouped into 8 **identity categories** — completing items in a category tells the user a story about who they're becoming, not just "tasks done." Each item has:
- `id` — for referencing in code/database
- `title` — short, punchy, shown in the UI
- `difficulty` — quick/moderate/stretch (helps balance easy wins vs aspirational items)

Use these as your seed data — trim, reorder, and localize as you see fit. Aim to keep the *tone* consistent within a category (some are playful, some are tender — that's intentional).

---

## 1. Adventurer (physical thrill, nature, travel)

1. Watched a sunrise from start to finish
2. Watched a sunset over the ocean
3. Swam in the ocean
4. Slept under the stars with no tent
5. Been on a plane
6. Visited another country
7. Visited another continent
8. Gone camping
9. Hiked to a summit
10. Gone scuba diving or snorkeling
11. Jumped into cold water on purpose
12. Ridden a motorcycle
13. Gone skydiving or bungee jumping
14. Seen snow for the first time
15. Explored a place completely alone
16. Road-tripped with no fixed plan
17. Slept in an airport
18. Seen the Milky Way away from city lights
19. Swam in a natural lake or river

## 2. Creator (making things, creative skill)

1. Finished writing something you were proud of
2. Learned a musical instrument, even a little
3. Cooked a meal completely from scratch
4. Baked bread from scratch
5. Painted or drawn something and kept it
6. Built something with your hands (furniture, shelf, repair)
7. Started a creative project you actually finished
8. Performed in front of people (music, comedy, speech)
9. Taught yourself a skill from a video or book
10. Grown a plant from seed and kept it alive
11. Written a letter you never sent
12. Made a gift instead of buying one
13. Created something just for yourself, with no audience in mind
14. Fixed something broken instead of replacing it
15. Learned to sew or mend clothing
16. Recorded your own voice singing or speaking, on purpose
17. Kept a journal for at least a month
18. Made something that made someone else laugh

## 3. Connector (relationships, vulnerability, community)

1. Said "I love you" first
2. Apologized first, even when it was hard
3. Forgiven someone who didn't apologize
4. Made a genuine friend as an adult
5. Reconnected with someone you'd lost touch with
6. Told a parent or guardian something you'd never said before
7. Been vulnerable with someone about a fear
8. Comforted someone in a hard moment
9. Asked for help when you needed it
10. Set a boundary with someone, even when it was uncomfortable
11. Sent a message just to say you were thinking of someone
12. Had a deep conversation past 2am
13. Given a genuine compliment to a stranger
14. Stood up for someone else
15. Let someone see you cry
16. Spent quality time with an older relative, just to listen
17. Called someone instead of texting, on purpose
18. Forgiven yourself for something

## 4. Learner (growth, knowledge, mind)

1. Read a book that changed how you think
2. Sat in silence for 10+ minutes on purpose
3. Meditated, even once
4. Learned a new language's basics
5. Learned something from someone much older than you
6. Learned something from someone much younger than you
7. Changed your mind about something important
8. Asked a question you were embarrassed to ask
9. Went to therapy or counseling
10. Kept a habit going for 30+ days
11. Learned basic first aid
12. Read a book outside your usual genre
13. Watched a documentary that shifted your perspective
14. Unlearned a belief you grew up with
15. Sat with a difficult emotion without trying to fix it
16. Taught someone else something you know
17. Learned to be alone without feeling lonely

## 5. Explorer (places, culture, curiosity)

1. Tried a food you couldn't pronounce
2. Explored a new neighborhood on foot with no destination
3. Visited a museum or gallery alone
4. Learned a few phrases of another language before traveling
5. Eaten food from a culture different from your own, made properly
6. Attended a cultural event outside your own background
7. Talked to a stranger while traveling
8. Gotten lost somewhere new on purpose
9. Visited a place purely because a book or film made you curious
10. Tried a local dish in the place it comes from
11. Learned the history of the place you live in
12. Watched a film entirely in another language
13. Visited a place of worship different from your own beliefs, respectfully
14. Tried a sport or activity unique to another culture

## 6. Caretaker (health, body, self)

1. Gone to the doctor for a checkup with no emergency
2. Slept a full 8 hours, guilt-free
3. Went a full day without your phone
4. Exercised consistently for a month
5. Cooked a healthy meal instead of ordering out
6. Said no to something to protect your energy
7. Took a mental health day, on purpose
8. Quit a habit that wasn't serving you
9. Drank water instead of something else, consistently
10. Stretched or moved your body first thing in the morning
11. Went outside every day for a week
12. Noticed and named a feeling instead of pushing it down
13. Rested without feeling guilty about it
14. Asked your body what it needed and listened
15. Took a real break from social media

## 7. Provider (career, money, independence)

1. Earned your own first paycheck
2. Saved money on purpose, for something specific
3. Negotiated for more (salary, price, terms)
4. Lived on your own
5. Paid a bill completely on your own
6. Started a side project or business, even small
7. Said no to a job or opportunity that wasn't right
8. Built a budget and actually followed it
9. Asked for a raise
10. Mentored someone at work or in a skill
11. Turned a hobby into some income, even a little
12. Made a big decision without asking anyone's permission
13. Recovered from a financial mistake
14. Invested in yourself (course, tool, coach) and used it

## 8. Rebel (fun, dares, spontaneity)

1. Danced in public, unashamed
2. Sang karaoke
3. Talked to a stranger for no reason
4. Did something out of character just to see how it felt
5. Said yes to something spontaneous
6. Wore something bold you were nervous to wear
7. Laughed until it hurt
8. Pulled an all-nighter for something fun, not work
9. Went somewhere alone that people usually go in groups
10. Told a joke that bombed and laughed about it anyway
11. Tried something you were sure you'd hate — and were wrong
12. Skipped a "should" to do something you actually wanted
13. Let yourself be a beginner at something in public

---

# Roast / Motivate Message Engine

## Core principle
**Roast the pattern, never the person.** The joke targets the behavior ("you've said someday for a year"), never identity ("you're lazy/a failure"). This keeps roast mode funny-affectionate instead of demoralizing.

## Trigger types

| Trigger | Condition | Purpose |
|---|---|---|
| `item_stagnant` | Item saved/starred but untouched 14–30+ days | Nudge without nagging |
| `first_check` | User's very first item completed | Reward activation |
| `streak` | 3+ items checked within a session or week | Reinforce momentum |
| `inactivity` | No app open in 14+ days | Re-engagement |
| `needs_help_flag` | User explicitly marks an item "I want help with this" | Switch to full support mode, ignore global tone setting |
| `category_milestone` | User hits 25%/50%/75%/100% in a category | Celebrate + reframe identity ("You're becoming an Adventurer") |
| `plateau` | No new items checked in 30+ days despite app opens | Gentle check-in, not a joke |

## Tone rules
- Global `tone_preference` (roast / motivate-only) controls default copy shown.
- `needs_help_flag = true` **always overrides** to motivate-only copy, regardless of global setting.
- `plateau` and any trigger following a long inactivity gap should lean supportive by default even in roast mode — repeated absence is a weaker signal for "give them a hard time" and a stronger signal for "check in gently."
- Keep every roast line paired with a concrete micro-action. Never end a roast without a next step.

## Example copy by trigger (write ~5-10 variants per row before launch to avoid repetition)

**item_stagnant**
- Roast: "This one's been sitting so long it's basically furniture now. Wanna finally deal with it?"
- Motivate: "No rush — even a tiny first step on this counts as progress."

**first_check**
- Roast: "Look at you, doing a thing. Slow claps all around."
- Motivate: "That's one — and it's often the hardest one to start with. Nice work."

**streak**
- Roast: "Okay, who are you and what did you do with the person who never finishes anything?"
- Motivate: "You're building real momentum — this is what change actually looks like."

**inactivity**
- Roast: "It's been a minute. Your list missed you (it can't actually miss you, but you know)."
- Motivate: "No pressure — whenever you're ready, pick one small thing and come back to it."

**needs_help_flag** (always motivate tone, more specific and concrete than default motivate copy)
- "Let's shrink this down — what's the smallest possible version of this you could do today?"
- "You don't need to do the whole thing. Just the next 2 minutes of it."

**category_milestone**
- "You're 50% through Adventurer. At this point it's not a phase, it's who you are."

**plateau** (always gentle, never roast)
- "Just checking in — no pressure to check anything off today. Even opening this counts."

## Safety guardrail
If free-text input is ever added (notes, "why I want help" fields), run a lightweight check for language suggesting genuine distress (hopelessness, self-worth language beyond normal frustration) and route to a plain supportive message with no joke and no gamification — never a roast, regardless of the user's tone setting. Treat this as a hard override in the trigger logic, not a style choice.

---

# Discovery, Streaks, Badges & Friends

## Discovery
- **Suggested for you feed** — unchecked items from categories the user is already active in, plus a rotating "trending this week" item based on aggregate check rate
- **"Surprise me" random item button** — one-tap, low-effort daily touchpoint
- **Category exploration grid** — browsable view so users find categories they haven't touched yet
- **"People like you also did..."** — collaborative filtering; design schema to support it now, implement post-MVP once there's enough usage data

## Streaks
- Streak counts a **meaningful action** (item checked), not just app opens
- **Streak freeze / grace day** — protect a streak once every N days to prevent rage-quit churn on missed days
- **Weekly streak option**, not just daily — "3+ actions this week" fits big, slow life-goals better than daily habit-tracker pacing
- Streak-break copy always routes to motivate tone, regardless of global roast/motivate setting

## Badges
- **Category badges** — 25/50/75/100% per identity category
- **Cross-category badge** — "Well-Rounded": at least 1 item done in every category
- **Behavior badges** — first item, first share, first friend added, first streak week, "comeback" badge for returning after inactivity
- **Rarity badges** — for items with <5% global completion rate — drives bragging rights and sharing

## Friends / social
- **Lightweight follow/add-friend model** — no mutual approval needed for MVP
- **Side-by-side progress comparison** per category
- **Activity feed** — highlights only (checks, badges), not a full firehose
- **Nudge a friend** — reuses the roast/motivate copy engine, sent friend-to-friend on a stagnant item
- **Group challenges** (post-MVP) — friends opt into a shared themed list or timeframe

## Privacy defaults
- New profiles default to **friends-only visibility**, not public
- Users can mark individual items or whole categories private (important for vulnerable items like grief/relationships)
- Aggregate stats ("X% of all users have done this") stay public/anonymous — that's the core hook and doesn't expose individuals
- Never let algorithmic feed or leaderboard logic surface another user's private items, even indirectly (e.g. via a "friends who did this" list)
