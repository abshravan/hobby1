export type TonePreference = "roast" | "motivate";
export type ProfileVisibility = "private" | "friends" | "public";
export type CategoryType = "checkbox" | "entry";
export type ItemDifficulty = "quick" | "moderate" | "stretch";
export type ProgressStatus = "saved" | "in_progress" | "completed";

export type MessageTrigger =
  | "item_stagnant"
  | "first_check"
  | "streak"
  | "streak_break"
  | "inactivity"
  | "needs_help_flag"
  | "category_milestone"
  | "plateau"
  | "distress_support";

/**
 * 'support' is not a user-selectable preference — it is the plain,
 * un-gamified voice reserved for the distress-language override and for
 * plateau check-ins.
 */
export type MessageTone = "roast" | "motivate" | "support";

/**
 * Triggers that may never be answered with roast copy, whatever the user's
 * global tone_preference says. Mirrored by a CHECK constraint on
 * public.messages so the rule holds even if a future code path forgets it.
 */
export const NEVER_ROAST_TRIGGERS: readonly MessageTrigger[] = [
  "needs_help_flag",
  "inactivity",
  "plateau",
  "streak_break",
  "distress_support",
];
