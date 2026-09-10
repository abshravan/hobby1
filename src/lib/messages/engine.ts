import type { SupabaseClient } from "@supabase/supabase-js";
import type { MessageTone, MessageTrigger, TonePreference } from "@/lib/types";
import { containsDistressLanguage } from "./distress";
import { resolveTone, type ToneDecision, type ToneSignals } from "./tone";
import { fillPlaceholders, type MessageContext } from "./interpolate";

export type MessageCandidate = {
  id: string;
  trigger_type: MessageTrigger;
  tone: MessageTone;
  copy_text: string;
  micro_action: string | null;
};

export type SelectedMessage = {
  id: string;
  trigger: MessageTrigger;
  tone: MessageTone;
  /** Placeholders already filled. Safe to render as-is. */
  text: string;
  /** The concrete next step. Always present for roast copy. */
  microAction: string | null;
  /** Why this tone was chosen, for debugging and the dev harness. */
  reason: ToneDecision["reason"];
  /** When true, render with no streak, badge, percentage or other gamification. */
  suppressGamification: boolean;
};

export type MessageRequest = {
  trigger: MessageTrigger;
  preference: TonePreference;
  context?: MessageContext;
  signals?: ToneSignals;
  /** Free text from the user, checked for distress language before anything else. */
  freeText?: string | null;
  /** Message id to avoid repeating, when known. */
  excludeId?: string;
  /** Injectable for deterministic tests. */
  random?: () => number;
};

/**
 * Chooses one message from a pool that has already been narrowed to the right
 * trigger and tone.
 *
 * Variants whose placeholders cannot be filled from this context are dropped
 * first — that is what stops a "{days} days" line being picked when no day
 * count was supplied.
 */
export function pickMessage(
  candidates: readonly MessageCandidate[],
  context: MessageContext,
  options: { excludeId?: string; random?: () => number } = {},
): { candidate: MessageCandidate; text: string } | null {
  const random = options.random ?? Math.random;

  const usable = candidates
    .map((candidate) => ({ candidate, text: fillPlaceholders(candidate.copy_text, context) }))
    .filter((entry): entry is { candidate: MessageCandidate; text: string } => entry.text !== null);

  if (usable.length === 0) return null;

  // Avoid an immediate repeat, unless it is the only thing we have.
  const preferred = usable.filter((entry) => entry.candidate.id !== options.excludeId);
  const pool = preferred.length > 0 ? preferred : usable;

  return pool[Math.floor(random() * pool.length) % pool.length];
}

/**
 * The message engine.
 *
 * Resolves the tone the app is allowed to use, loads matching copy, and returns
 * one filled message. No triggers call this automatically yet — Step 7 wires
 * them up; for now `npm run messages:demo` exercises it directly.
 */
export async function selectMessage(
  supabase: SupabaseClient,
  request: MessageRequest,
): Promise<SelectedMessage | null> {
  const signals: ToneSignals = {
    ...request.signals,
    // The distress check runs on every free-text path, before tone resolution.
    distressDetected:
      request.signals?.distressDetected || containsDistressLanguage(request.freeText),
  };

  const decision = resolveTone(request.trigger, request.preference, signals);

  // A distress match abandons the requested trigger entirely: whatever the app
  // was going to say, it now says something plain and supportive instead.
  const trigger: MessageTrigger = decision.suppressGamification
    ? "distress_support"
    : request.trigger;

  const { data, error } = await supabase
    .from("messages")
    .select("id, trigger_type, tone, copy_text, micro_action")
    .eq("trigger_type", trigger)
    .eq("tone", decision.tone)
    .eq("is_active", true)
    .returns<MessageCandidate[]>();

  if (error || !data?.length) return null;

  const chosen = pickMessage(data, request.context ?? {}, {
    excludeId: request.excludeId,
    random: request.random,
  });

  if (!chosen) return null;

  return {
    id: chosen.candidate.id,
    trigger,
    tone: decision.tone,
    text: chosen.text,
    microAction: chosen.candidate.micro_action,
    reason: decision.reason,
    suppressGamification: decision.suppressGamification,
  };
}
