/**
 * Artha seed content — 8 identity categories, 128 items.
 *
 * Source of truth for the seed script. Format per line:
 *   difficulty | Title                     (slug derived from the title)
 *   difficulty | Title | explicit-slug     (when the title may be reworded)
 *
 * difficulty:
 *   quick    — doable this week, little cost or courage required
 *   moderate — needs planning, money, or a bit of nerve
 *   stretch  — a real undertaking, or a real risk of feeling something
 *
 * Tone is intentionally not uniform across categories: Rebel is playful,
 * Connector and Caretaker are tender. Keep it that way when editing.
 */

import { parseItems, type SeedItem } from "./parse";
import type { CategoryType } from "@/lib/types";

export type SeedCategory = {
  slug: string;
  name: string;
  type: CategoryType;
  tagline: string;
  items: SeedItem[];
};

const ADVENTURER = `
quick    | Watched a sunrise from start to finish
moderate | Watched a sunset over the ocean
moderate | Swam in the ocean
moderate | Slept under the stars with no tent
moderate | Been on a plane
stretch  | Visited another country
stretch  | Visited another continent
moderate | Gone camping
moderate | Hiked to a summit
stretch  | Gone scuba diving or snorkeling
quick    | Jumped into cold water on purpose
moderate | Ridden a motorcycle
stretch  | Gone skydiving or bungee jumping
moderate | Seen snow for the first time
moderate | Explored a place completely alone
stretch  | Road-tripped with no fixed plan
moderate | Slept in an airport
moderate | Seen the Milky Way away from city lights
moderate | Swam in a natural lake or river
`;

const CREATOR = `
moderate | Finished writing something you were proud of
stretch  | Learned a musical instrument, even a little
quick    | Cooked a meal completely from scratch
moderate | Baked bread from scratch
quick    | Painted or drawn something and kept it
moderate | Built something with your hands (furniture, shelf, repair) | built-something-with-your-hands
stretch  | Started a creative project you actually finished
stretch  | Performed in front of people (music, comedy, speech) | performed-in-front-of-people
moderate | Taught yourself a skill from a video or book
moderate | Grown a plant from seed and kept it alive
quick    | Written a letter you never sent
moderate | Made a gift instead of buying one
quick    | Created something just for yourself, with no audience in mind
quick    | Fixed something broken instead of replacing it
moderate | Learned to sew or mend clothing
quick    | Recorded your own voice singing or speaking, on purpose
stretch  | Kept a journal for at least a month
quick    | Made something that made someone else laugh
`;

const CONNECTOR = `
stretch  | Said "I love you" first | said-i-love-you-first
moderate | Apologized first, even when it was hard
stretch  | Forgiven someone who didn't apologize
stretch  | Made a genuine friend as an adult
moderate | Reconnected with someone you'd lost touch with
stretch  | Told a parent or guardian something you'd never said before
moderate | Been vulnerable with someone about a fear
moderate | Comforted someone in a hard moment
moderate | Asked for help when you needed it
stretch  | Set a boundary with someone, even when it was uncomfortable
quick    | Sent a message just to say you were thinking of someone
moderate | Had a deep conversation past 2am
quick    | Given a genuine compliment to a stranger
moderate | Stood up for someone else
stretch  | Let someone see you cry
moderate | Spent quality time with an older relative, just to listen
quick    | Called someone instead of texting, on purpose
stretch  | Forgiven yourself for something
`;

const LEARNER = `
moderate | Read a book that changed how you think
quick    | Sat in silence for 10+ minutes on purpose
quick    | Meditated, even once
stretch  | Learned a new language's basics
moderate | Learned something from someone much older than you
moderate | Learned something from someone much younger than you
stretch  | Changed your mind about something important
quick    | Asked a question you were embarrassed to ask
stretch  | Went to therapy or counseling
stretch  | Kept a habit going for 30+ days
moderate | Learned basic first aid
moderate | Read a book outside your usual genre
quick    | Watched a documentary that shifted your perspective
stretch  | Unlearned a belief you grew up with
moderate | Sat with a difficult emotion without trying to fix it
moderate | Taught someone else something you know
stretch  | Learned to be alone without feeling lonely
`;

const EXPLORER = `
quick    | Tried a food you couldn't pronounce
quick    | Explored a new neighborhood on foot with no destination
quick    | Visited a museum or gallery alone
moderate | Learned a few phrases of another language before traveling
quick    | Eaten food from a culture different from your own, made properly
moderate | Attended a cultural event outside your own background
moderate | Talked to a stranger while traveling
quick    | Gotten lost somewhere new on purpose
stretch  | Visited a place purely because a book or film made you curious
stretch  | Tried a local dish in the place it comes from
moderate | Learned the history of the place you live in
quick    | Watched a film entirely in another language
moderate | Visited a place of worship different from your own beliefs, respectfully | visited-a-different-place-of-worship
moderate | Tried a sport or activity unique to another culture
`;

const CARETAKER = `
moderate | Gone to the doctor for a checkup with no emergency
quick    | Slept a full 8 hours, guilt-free
moderate | Went a full day without your phone
stretch  | Exercised consistently for a month
quick    | Cooked a healthy meal instead of ordering out
moderate | Said no to something to protect your energy
moderate | Took a mental health day, on purpose
stretch  | Quit a habit that wasn't serving you
moderate | Drank water instead of something else, consistently
quick    | Stretched or moved your body first thing in the morning
moderate | Went outside every day for a week
quick    | Noticed and named a feeling instead of pushing it down
moderate | Rested without feeling guilty about it
moderate | Asked your body what it needed and listened
moderate | Took a real break from social media
`;

const PROVIDER = `
moderate | Earned your own first paycheck
moderate | Saved money on purpose, for something specific
stretch  | Negotiated for more (salary, price, terms) | negotiated-for-more
stretch  | Lived on your own
quick    | Paid a bill completely on your own
stretch  | Started a side project or business, even small
stretch  | Said no to a job or opportunity that wasn't right
moderate | Built a budget and actually followed it
stretch  | Asked for a raise
moderate | Mentored someone at work or in a skill
stretch  | Turned a hobby into some income, even a little
moderate | Made a big decision without asking anyone's permission
stretch  | Recovered from a financial mistake
moderate | Invested in yourself (course, tool, coach) and used it | invested-in-yourself
`;

const REBEL = `
moderate | Danced in public, unashamed
moderate | Sang karaoke
quick    | Talked to a stranger for no reason
moderate | Did something out of character just to see how it felt
quick    | Said yes to something spontaneous
moderate | Wore something bold you were nervous to wear
quick    | Laughed until it hurt
moderate | Pulled an all-nighter for something fun, not work
moderate | Went somewhere alone that people usually go in groups
quick    | Told a joke that bombed and laughed about it anyway
moderate | Tried something you were sure you'd hate — and were wrong | tried-something-you-were-sure-youd-hate
quick    | Skipped a "should" to do something you actually wanted | skipped-a-should
stretch  | Let yourself be a beginner at something in public
`;

export const CATEGORIES: SeedCategory[] = [
  {
    slug: "adventurer",
    name: "Adventurer",
    type: "checkbox",
    tagline: "Thrill, nature, and going somewhere without a plan.",
    items: parseItems(ADVENTURER),
  },
  {
    slug: "creator",
    name: "Creator",
    type: "checkbox",
    tagline: "Making things, finishing things, keeping the evidence.",
    items: parseItems(CREATOR),
  },
  {
    slug: "connector",
    name: "Connector",
    type: "checkbox",
    tagline: "The brave, unglamorous work of loving people well.",
    items: parseItems(CONNECTOR),
  },
  {
    slug: "learner",
    name: "Learner",
    type: "checkbox",
    tagline: "Changing your mind on purpose.",
    items: parseItems(LEARNER),
  },
  {
    slug: "explorer",
    name: "Explorer",
    type: "checkbox",
    tagline: "Curiosity about places and people that aren't yours.",
    items: parseItems(EXPLORER),
  },
  {
    slug: "caretaker",
    name: "Caretaker",
    type: "checkbox",
    tagline: "Treating yourself like someone you're responsible for.",
    items: parseItems(CARETAKER),
  },
  {
    slug: "provider",
    name: "Provider",
    type: "checkbox",
    tagline: "Money, work, and standing on your own feet.",
    items: parseItems(PROVIDER),
  },
  {
    slug: "rebel",
    name: "Rebel",
    type: "checkbox",
    tagline: "Fun for its own sake. No justification required.",
    items: parseItems(REBEL),
  },
];

export const TOTAL_ITEMS = CATEGORIES.reduce((sum, c) => sum + c.items.length, 0);
