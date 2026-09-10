/**
 * Dev-only sign-in as a seeded persona.
 *
 * This is a real Supabase session, not a stubbed one: the seed creates actual
 * auth users and the login exchanges a generated magic-link token for a normal
 * session cookie. Everything downstream — RLS, getUser(), the middleware —
 * behaves exactly as it does in production, which is the whole point. A fake
 * session object would hide precisely the bugs this is meant to surface.
 *
 * It is gated three ways, because a mock login reaching production means anyone
 * can sign in as anyone:
 *   1. NODE_ENV must not be "production".
 *   2. ENABLE_DEV_LOGIN must be exactly "true".
 *   3. next.config.ts fails the production build outright if the flag is set,
 *      so a misconfigured deploy cannot even be built.
 *
 * The page, the server action and the middleware each check independently. A
 * Server Action is its own callable endpoint — a guard on the page that renders
 * the button does not protect the action behind it.
 */

import type { TonePreference } from "@/lib/types";

export function devLoginEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.ENABLE_DEV_LOGIN === "true";
}

/** Reserved TLD, so a persona address can never collide with a real inbox. */
export const DEV_EMAIL_DOMAIN = "artha.test";
export const DEV_EMAIL_PREFIX = "dev-";

export function devEmail(key: string): string {
  return `${DEV_EMAIL_PREFIX}${key}@${DEV_EMAIL_DOMAIN}`;
}

export function isDevEmail(email: string | undefined): boolean {
  return Boolean(email?.startsWith(DEV_EMAIL_PREFIX) && email.endsWith(`@${DEV_EMAIL_DOMAIN}`));
}

export type DevPersona = {
  key: string;
  name: string;
  /** What this persona is for — shown on the picker. */
  purpose: string;
  tone: TonePreference;
  /**
   * How much of the list this persona has completed, as a fraction per
   * category slug. `*` applies to any category not named.
   */
  completion: Record<string, number>;
};

export const DEV_PERSONAS: DevPersona[] = [
  {
    key: "newcomer",
    name: "Nia — brand new",
    purpose: "Nothing checked. Empty states, first-check trigger, 0% everywhere.",
    tone: "motivate",
    completion: { "*": 0 },
  },
  {
    key: "regular",
    name: "Rey — typical user",
    purpose: "A scattered third of the list. The ordinary case.",
    tone: "motivate",
    completion: { "*": 0.35, adventurer: 0.5, connector: 0.2 },
  },
  {
    key: "roaster",
    name: "Ras — roast mode",
    purpose: "Roast tone selected, mid progress. For the message engine.",
    tone: "roast",
    completion: { "*": 0.4, rebel: 0.75 },
  },
  {
    key: "completionist",
    name: "Cam — nearly done",
    purpose: "Adventurer at 100%, most categories past 75%. Milestones and badges.",
    tone: "roast",
    completion: { "*": 0.8, adventurer: 1 },
  },
];

export function personaFor(key: string): DevPersona | undefined {
  return DEV_PERSONAS.find((persona) => persona.key === key);
}
