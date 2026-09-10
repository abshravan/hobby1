import type { MessageTone, MessageTrigger, TonePreference } from "@/lib/types";

/**
 * Signals about the user's recent behaviour that can override their chosen
 * tone. All optional: an absent signal never escalates to roast, it only fails
 * to de-escalate.
 */
export type ToneSignals = {
  /** Days since the user last did anything. */
  daysSinceLastActive?: number;
  /** Their streak ended in the event that produced this message. */
  streakJustBroke?: boolean;
  /** The item this message is about is flagged "I want help with this". */
  needsHelp?: boolean;
  /** Free text the user wrote that matched the distress check. */
  distressDetected?: boolean;
};

/** A gap this long makes jokes the wrong instinct, whatever the trigger. */
export const LONG_ABSENCE_DAYS = 14;

export type ToneDecision = {
  tone: MessageTone;
  /** Why, in a word — surfaced in the dev harness and useful in logs. */
  reason:
    | "distress_override"
    | "support_only_trigger"
    | "needs_help_override"
    | "supportive_trigger"
    | "long_absence"
    | "streak_broken"
    | "user_preference";
  /**
   * True when the message must appear without streaks, badges, percentages or
   * any other gamification — the distress case only.
   */
  suppressGamification: boolean;
};

/**
 * Decides the tone a message may actually use.
 *
 * The order is the product's rule order, and every branch above
 * `user_preference` is a de-escalation. Nothing here can turn a motivate
 * preference into a roast, so the worst case of a wrong signal is a message
 * that is kinder than it needed to be.
 *
 * public.messages carries CHECK constraints mirroring these rules, so a bug
 * here cannot surface roast copy on a protected trigger — the database has no
 * such rows to return.
 */
export function resolveTone(
  trigger: MessageTrigger,
  preference: TonePreference,
  signals: ToneSignals = {},
): ToneDecision {
  // Rule 4. Hard override, checked first so nothing below can reach past it.
  if (signals.distressDetected) {
    return { tone: "support", reason: "distress_override", suppressGamification: true };
  }

  if (trigger === "distress_support") {
    return { tone: "support", reason: "support_only_trigger", suppressGamification: true };
  }

  // Never a joke, per the copy spec.
  if (trigger === "plateau") {
    return { tone: "support", reason: "support_only_trigger", suppressGamification: false };
  }

  // Rule 2. Beats the global preference in both directions of reading it.
  if (trigger === "needs_help_flag" || signals.needsHelp) {
    return { tone: "motivate", reason: "needs_help_override", suppressGamification: false };
  }

  // Rule 3, as triggers.
  if (trigger === "inactivity" || trigger === "streak_break") {
    return { tone: "motivate", reason: "supportive_trigger", suppressGamification: false };
  }

  // Rule 3, as context: a long gap or a just-broken streak softens ANY trigger,
  // not only the two named above. Coming back after three weeks to a joke about
  // being absent is the failure this prevents.
  if ((signals.daysSinceLastActive ?? 0) >= LONG_ABSENCE_DAYS) {
    return { tone: "motivate", reason: "long_absence", suppressGamification: false };
  }

  if (signals.streakJustBroke) {
    return { tone: "motivate", reason: "streak_broken", suppressGamification: false };
  }

  return { tone: preference, reason: "user_preference", suppressGamification: false };
}
