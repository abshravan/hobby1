import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LONG_ABSENCE_DAYS, resolveTone } from "./tone";
import type { MessageTrigger, TonePreference } from "@/lib/types";

const ALL_TRIGGERS: MessageTrigger[] = [
  "item_stagnant",
  "first_check",
  "streak",
  "streak_break",
  "inactivity",
  "needs_help_flag",
  "category_milestone",
  "plateau",
  "distress_support",
];

const PREFERENCES: TonePreference[] = ["roast", "motivate"];

describe("resolveTone — the rules that must never break", () => {
  it("rule 2: needs_help always overrides to motivate", () => {
    for (const preference of PREFERENCES) {
      assert.equal(resolveTone("needs_help_flag", preference).tone, "motivate");
      // And as a per-item signal on any other trigger.
      assert.equal(
        resolveTone("item_stagnant", preference, { needsHelp: true }).tone,
        "motivate",
      );
    }
  });

  it("rule 3: inactivity and streak_break never roast", () => {
    for (const trigger of ["inactivity", "streak_break"] as MessageTrigger[]) {
      assert.equal(resolveTone(trigger, "roast").tone, "motivate");
    }
  });

  it("rule 3: a long absence softens ANY trigger, not just the absence ones", () => {
    // Coming back after three weeks to a joke is the failure this prevents.
    const decision = resolveTone("streak", "roast", { daysSinceLastActive: LONG_ABSENCE_DAYS });
    assert.equal(decision.tone, "motivate");
    assert.equal(decision.reason, "long_absence");
  });

  it("rule 3: one day short of the threshold still allows roast", () => {
    const decision = resolveTone("streak", "roast", {
      daysSinceLastActive: LONG_ABSENCE_DAYS - 1,
    });
    assert.equal(decision.tone, "roast");
  });

  it("rule 3: a just-broken streak softens any trigger", () => {
    assert.equal(
      resolveTone("category_milestone", "roast", { streakJustBroke: true }).tone,
      "motivate",
    );
  });

  it("rule 4: distress language overrides everything, including needs_help", () => {
    const decision = resolveTone("first_check", "roast", {
      distressDetected: true,
      needsHelp: true,
    });
    assert.equal(decision.tone, "support");
    assert.equal(decision.reason, "distress_override");
    assert.equal(decision.suppressGamification, true);
  });

  it("plateau is support, never a joke", () => {
    for (const preference of PREFERENCES) {
      assert.equal(resolveTone("plateau", preference).tone, "support");
    }
  });

  it("NO trigger and NO signal combination can produce roast for a motivate user", () => {
    // A de-escalation must never run backwards.
    for (const trigger of ALL_TRIGGERS) {
      for (const signals of [
        {},
        { needsHelp: true },
        { streakJustBroke: true },
        { daysSinceLastActive: 0 },
        { daysSinceLastActive: 99 },
        { distressDetected: true },
      ]) {
        assert.notEqual(
          resolveTone(trigger, "motivate", signals).tone,
          "roast",
          `${trigger} with ${JSON.stringify(signals)} escalated a motivate user to roast`,
        );
      }
    }
  });

  it("roast is only ever reachable on the four playful triggers", () => {
    const roastable = ALL_TRIGGERS.filter(
      (trigger) => resolveTone(trigger, "roast").tone === "roast",
    );
    assert.deepEqual(roastable.sort(), [
      "category_milestone",
      "first_check",
      "item_stagnant",
      "streak",
    ]);
  });

  it("only the distress path suppresses gamification", () => {
    for (const trigger of ALL_TRIGGERS) {
      const decision = resolveTone(trigger, "roast");
      assert.equal(
        decision.suppressGamification,
        trigger === "distress_support",
        `${trigger} got the wrong gamification flag`,
      );
    }
  });

  it("respects the user's preference when nothing overrides", () => {
    assert.equal(resolveTone("first_check", "roast").reason, "user_preference");
    assert.equal(resolveTone("first_check", "motivate").tone, "motivate");
  });
});
