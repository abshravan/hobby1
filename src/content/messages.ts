/**
 * Artha copy library — seeded into public.messages.
 *
 * Non-negotiable rules, encoded here and enforced by CHECK constraints on the
 * table so no future code path can route around them:
 *
 *   1. Roast the pattern, never the person. Every roast line below targets a
 *      behaviour ("this has sat here since March"), never worth or identity.
 *   2. needs_help_flag is motivate-only, whatever the global tone says.
 *   3. inactivity, plateau and streak_break are motivate/support-only — a long
 *      absence is a weak signal for jokes and a strong one for checking in.
 *   4. distress_support is plain support: no joke, no gamification, no streak.
 *   5. Every roast pairs with a concrete micro-action. No exceptions.
 *
 * Placeholders are filled by the message engine in Step 6:
 *   {item} {category} {percent} {days} {count}
 */

import type { MessageTone, MessageTrigger } from "@/lib/types";

export type SeedMessage = {
  trigger_type: MessageTrigger;
  tone: MessageTone;
  copy_text: string;
  /** Required for roast copy; optional elsewhere. */
  micro_action?: string;
};

const roast = (
  trigger_type: MessageTrigger,
  copy_text: string,
  micro_action: string,
): SeedMessage => ({ trigger_type, tone: "roast", copy_text, micro_action });

const motivate = (
  trigger_type: MessageTrigger,
  copy_text: string,
  micro_action?: string,
): SeedMessage => ({ trigger_type, tone: "motivate", copy_text, micro_action });

const support = (
  trigger_type: MessageTrigger,
  copy_text: string,
  micro_action?: string,
): SeedMessage => ({ trigger_type, tone: "support", copy_text, micro_action });

export const MESSAGES: SeedMessage[] = [
  // ---- item_stagnant --------------------------------------------------
  roast("item_stagnant", "“{item}” has been sitting there so long it's basically furniture now.", "Give it fifteen minutes this week and see what happens."),
  roast("item_stagnant", "{days} days on “{item}.” At this point it's less a goal and more a houseplant you forgot to water.", "Pick the smallest possible version of it and do that."),
  roast("item_stagnant", "“{item}” is still waiting. It has been very patient. Suspiciously patient.", "Put it in your calendar for one specific day."),
  roast("item_stagnant", "You starred “{item}” and then immediately went back to your regularly scheduled life.", "Take the first two minutes of it right now."),
  roast("item_stagnant", "Bold of you to save “{item}” and then do nothing about it for {days} days straight.", "Name one thing that would make it easier, then do that thing."),
  roast("item_stagnant", "“{item}” has been on your list longer than most people keep a New Year's resolution. Respect, honestly.", "Break it in half. Do the easier half."),
  roast("item_stagnant", "Still unchecked: “{item}.” Your list is not going to nag you. That's what I'm for.", "Decide right now: this month, or off the list?"),

  motivate("item_stagnant", "“{item}” is still there whenever you're ready. No rush.", "Even the smallest first step counts as progress."),
  motivate("item_stagnant", "It's been a while since you looked at “{item}.” That's completely normal — life gets loud.", "Try the two-minute version of it today."),
  motivate("item_stagnant", "Some things sit for a while before they're ready. “{item}” might be one of them.", "If it still matters, pick one small piece of it this week."),
  motivate("item_stagnant", "No pressure on “{item}.” It's been {days} days, and that's fine.", "Ask yourself what would make it 10% easier to start."),
  motivate("item_stagnant", "You saved “{item}” for a reason. That reason is probably still true.", "Write down the very next action and stop there."),
  motivate("item_stagnant", "“{item}” doesn't have a deadline. It just has you, eventually.", "Choose a day this month and put it in the calendar."),

  // ---- first_check ----------------------------------------------------
  roast("first_check", "Look at you, doing a thing. Slow clap, genuinely.", "Now find one more that takes under an hour."),
  roast("first_check", "One down. Only the rest of your entire life to go.", "Pick your next one before the momentum wears off."),
  roast("first_check", "First check-off. The hardest part was apparently finding the button.", "Browse one category you haven't touched yet."),
  roast("first_check", "Well, that's one more than you had this morning. Low bar, cleared beautifully.", "Check off something you've already done — you're further along than you think."),
  roast("first_check", "You've officially started. Historians will note the date and then move on.", "Scan a category and check everything you've already lived through."),
  roast("first_check", "One item. A journey of a thousand miles, and so on, except you're at mile one.", "Find three more you've already done. They're in there."),

  motivate("first_check", "That's one — and starting is usually the hardest part. Nice work.", "Have a look through a category and see what else you've already done."),
  motivate("first_check", "First one down. It counts, even the ones that felt small at the time.", "Keep going while it's easy — check off what you've already lived."),
  motivate("first_check", "You've started. That's the part most people don't get to.", "Pick a category that sounds like you and work through it."),
  motivate("first_check", "Nice. Now the list knows something true about you.", "See what else is already true — you'll be surprised."),
  motivate("first_check", "One item in, and the list already looks less intimidating.", "Try a second one right now."),
  motivate("first_check", "That's a real thing you did. Good start.", "Have a wander through the categories and claim what's yours."),

  // ---- streak ---------------------------------------------------------
  roast("streak", "{count} items this week. Who are you and what did you do with the person who never finishes anything?", "Keep it going — one more before the week's out."),
  roast("streak", "Okay, someone's showing off. {count} in a week.", "Try a stretch item next, since you're clearly feeling brave."),
  roast("streak", "You're on a streak. Try not to make it weird by stopping now.", "Pick tomorrow's item today."),
  roast("streak", "{count} checks in and suddenly you're a person with follow-through. Character development.", "Find one in a category you've been avoiding."),
  roast("streak", "This is dangerously close to a habit. Careful.", "Do one more this week and it's official."),
  roast("streak", "At this rate you'll finish the list and have to get a new personality.", "Line up your next one now."),

  motivate("streak", "{count} this week — you're building real momentum. This is what change actually looks like.", "One more keeps the streak alive."),
  motivate("streak", "You're on a roll. Momentum is doing half the work now.", "Pick the next one while it still feels easy."),
  motivate("streak", "{count} items in a week is genuinely good going.", "Try something from a category you haven't touched yet."),
  motivate("streak", "Streak intact. Small consistent moves beat big rare ones.", "Choose one quick item for later this week."),
  motivate("streak", "This is the good part — when it stops feeling like effort.", "Keep the streak with one more."),
  motivate("streak", "You're stacking wins. That compounds faster than you'd think.", "Next one's on you."),

  // ---- streak_break (motivate only — rule 3) --------------------------
  motivate("streak_break", "Streak's ended. They all do eventually — it doesn't undo the {count} weeks before it.", "One item this week starts a new one."),
  motivate("streak_break", "The streak broke. The things you actually did are still done.", "Pick one small thing and begin again."),
  motivate("streak_break", "Missed a week. That's a week, not a verdict.", "Start fresh with a quick item."),
  motivate("streak_break", "Streaks are a nudge, not a scoreboard. Yours reset — no harm done.", "Check off one thing whenever you're ready."),
  motivate("streak_break", "You had a good run. Runs end. New one starts whenever you want.", "One item is all it takes."),
  motivate("streak_break", "Your longest streak is still {count} weeks. That number doesn't go away.", "Start the next one with something easy."),

  // ---- inactivity (motivate only — rule 3) ----------------------------
  motivate("inactivity", "It's been a while. Your list has been sitting here, not judging.", "No pressure — pick one small thing whenever you're ready."),
  motivate("inactivity", "Welcome back. {days} days is nothing in the scheme of a life.", "Have a look at a category and see what's changed."),
  motivate("inactivity", "You've been away. That's allowed — life happens away from apps.", "Check off anything you did while you were gone."),
  motivate("inactivity", "Still here whenever you want it. Nothing expired.", "Start with the easiest thing you can find."),
  motivate("inactivity", "Good to see you. Take it at whatever pace suits.", "One item, if you feel like it. If not, that's fine too."),
  motivate("inactivity", "Some of these last {days} days probably counted for something.", "See if any of it is already on the list."),

  // ---- needs_help_flag (motivate only — rule 2) -----------------------
  motivate("needs_help_flag", "Let's shrink this down. What's the smallest possible version of “{item}” you could do?", "Do only that. The rest can wait."),
  motivate("needs_help_flag", "You don't need to do the whole thing. Just the next two minutes of it.", "Set a timer for two minutes and stop when it goes off."),
  motivate("needs_help_flag", "“{item}” is flagged as one you want help with, so here's the help: it doesn't have to happen soon, or all at once.", "Name the single next action, nothing beyond it."),
  motivate("needs_help_flag", "Hard ones stay hard for a reason. That's not a personal failing.", "Write down what's actually in the way. Sometimes that's the whole job."),
  motivate("needs_help_flag", "This one's marked as difficult, so no jokes about it. What would make it 10% easier?", "Change one thing to make it easier, then try again."),
  motivate("needs_help_flag", "You asked for help on “{item}.” Good instinct — that's a skill, not a shortcut.", "Ask one person for one specific thing."),
  motivate("needs_help_flag", "There's no clock on this one.", "Take the smallest step that still counts as a step."),

  // ---- category_milestone ---------------------------------------------
  roast("category_milestone", "{percent}% through {category}. At this point it's not a phase, it's a personality.", "Pick one more before you lose your nerve."),
  roast("category_milestone", "{percent}% of {category} done. Your friends are going to have to hear about this, aren't they.", "Line up the next one."),
  roast("category_milestone", "You've hit {percent}% in {category}. Someone's been busy being interesting.", "Find a stretch item in there and commit to it."),
  roast("category_milestone", "{category}: {percent}%. You may now describe yourself this way at parties.", "One more item and it's not even bragging."),
  roast("category_milestone", "{percent}% {category}. The other categories are watching this with some concern.", "Go check one thing off somewhere else."),
  roast("category_milestone", "Look at {category} go. {percent}% and climbing.", "Pick the next one now, while you're smug."),

  motivate("category_milestone", "You're {percent}% through {category}. At this point it's not a goal — it's who you are.", "Keep going: pick one more that appeals."),
  motivate("category_milestone", "{percent}% of {category}. That's a real pattern, not a coincidence.", "Have a look at what's left."),
  motivate("category_milestone", "{category} is {percent}% complete. You've been living this one.", "Choose the next item that actually excites you."),
  motivate("category_milestone", "Milestone: {percent}% in {category}. Worth noticing.", "One more when you're ready."),
  motivate("category_milestone", "You've built something real in {category} — {percent}% of it.", "See which of the remaining ones feels closest."),
  motivate("category_milestone", "{percent}% through {category}. The rest will come.", "Pick a quick one to keep the thread going."),

  // ---- plateau (support only — never a joke) --------------------------
  support("plateau", "Just checking in. No pressure to check anything off today — even opening this counts.", "If something comes to mind, it's here."),
  support("plateau", "You've been around but nothing's felt right to check off. That's a normal season.", "Nothing needs doing today."),
  support("plateau", "Nothing new in a while. Sometimes that's what life looks like, and it's fine.", "Have a look around if you feel like it."),
  support("plateau", "No new checks lately. Not everything worth doing shows up on a list.", "Come back to it whenever."),
  support("plateau", "Still here. Still no expectations.", "One small thing, or nothing at all."),
  support("plateau", "Progress isn't always visible from the outside — or from a checklist.", "Take your time."),

  // ---- distress_support (hard override — rule 4) ----------------------
  // Never shown alongside streaks, badges, percentages or a next action.
  support("distress_support", "That sounds genuinely hard, and this list isn't the point right now. Be gentle with yourself."),
  support("distress_support", "Thanks for writing that down. It sounds heavy — please don't carry it alone if you don't have to."),
  support("distress_support", "This isn't something a checklist should have an opinion about. If you're struggling, talking to someone you trust is worth more than anything on this page."),
  support("distress_support", "Nothing here matters more than you being okay. Take whatever time you need."),
  support("distress_support", "That reads like a hard moment. There's no progress to make today — just take care of yourself."),
];
