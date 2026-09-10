/**
 * Exercises the message engine against the real copy library.
 *
 * Step 6 builds the engine but wires no automatic triggers, so this is how you
 * see it work: it runs a matrix of trigger x tone x context and prints what a
 * user would actually be shown, along with which rule decided the tone.
 *
 *   npm run messages:demo
 *
 * Read the `via` column — it is the audit trail for the override rules. Any row
 * where a roast-preference user gets motivate or support copy should name the
 * rule that de-escalated it.
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { selectMessage, type MessageRequest } from "../src/lib/messages/engine";
import type { MessageTrigger } from "../src/lib/types";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or a Supabase key in .env.local.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Case = { label: string } & MessageRequest;

const CONTEXT = {
  item: "Learned a musical instrument, even a little",
  category: "Adventurer",
  percent: 50,
  days: 23,
  count: 4,
};

const PLAYFUL: MessageTrigger[] = [
  "first_check",
  "streak",
  "item_stagnant",
  "category_milestone",
];

const CASES: Case[] = [
  // The ordinary path: both preferences, every playful trigger.
  ...PLAYFUL.flatMap((trigger): Case[] => [
    { label: `${trigger} · roast user`, trigger, preference: "roast", context: CONTEXT },
    { label: `${trigger} · motivate user`, trigger, preference: "motivate", context: CONTEXT },
  ]),

  // Rule 2 — needs_help always wins.
  {
    label: "item_stagnant · roast user · item flagged needs help",
    trigger: "item_stagnant",
    preference: "roast",
    context: CONTEXT,
    signals: { needsHelp: true },
  },
  { label: "needs_help_flag · roast user", trigger: "needs_help_flag", preference: "roast", context: CONTEXT },

  // Rule 3 — absence and broken streaks soften everything.
  { label: "inactivity · roast user", trigger: "inactivity", preference: "roast", context: CONTEXT },
  { label: "streak_break · roast user", trigger: "streak_break", preference: "roast", context: CONTEXT },
  {
    label: "streak · roast user · back after 23 days",
    trigger: "streak",
    preference: "roast",
    context: CONTEXT,
    signals: { daysSinceLastActive: 23 },
  },
  {
    label: "category_milestone · roast user · streak just broke",
    trigger: "category_milestone",
    preference: "roast",
    context: CONTEXT,
    signals: { streakJustBroke: true },
  },

  // Never a joke.
  { label: "plateau · roast user", trigger: "plateau", preference: "roast", context: CONTEXT },

  // Rule 4 — the hard override.
  {
    label: "first_check · roast user · free text shows distress",
    trigger: "first_check",
    preference: "roast",
    context: CONTEXT,
    freeText: "honestly I feel worthless and nothing matters",
  },

  // Context gating: no {days} supplied, so day-counting variants are skipped.
  {
    label: "item_stagnant · roast user · no day count in context",
    trigger: "item_stagnant",
    preference: "roast",
    context: { item: CONTEXT.item },
  },
];

async function main() {
  console.log(`Message engine against ${url}\n`);

  let failures = 0;

  for (const { label, ...request } of CASES) {
    const message = await selectMessage(supabase, request);

    if (!message) {
      console.log(`✕ ${label}\n    no message returned\n`);
      failures++;
      continue;
    }

    const flags = [
      `tone=${message.tone}`,
      `via=${message.reason}`,
      message.suppressGamification ? "no-gamification" : null,
    ]
      .filter(Boolean)
      .join(" ");

    console.log(`${label}\n    [${flags}]`);
    console.log(`    “${message.text}”`);
    if (message.microAction) console.log(`    → ${message.microAction}`);
    if (message.text.includes("{")) {
      console.log("    ✕ UNFILLED PLACEHOLDER");
      failures++;
    }
    if (message.tone === "roast" && !message.microAction) {
      console.log("    ✕ ROAST WITH NO NEXT STEP");
      failures++;
    }
    console.log("");
  }

  console.log(failures === 0 ? "All cases produced valid copy." : `${failures} PROBLEM(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
