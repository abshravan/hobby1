/**
 * Placeholder filling for message copy.
 *
 * Copy uses {item}, {category}, {percent}, {days} and {count}. A message whose
 * placeholders cannot all be filled is unusable, so this returns null rather
 * than emitting a half-filled string — the selector then skips that variant.
 * Shipping a literal "{item}" to a user is worse than showing different copy.
 */

export type MessageContext = {
  item?: string;
  category?: string;
  percent?: number;
  days?: number;
  count?: number;
};

const PLACEHOLDER = /\{(\w+)\}/g;

export function placeholdersIn(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((match) => match[1]);
}

/** Fills every placeholder, or returns null if any value is missing. */
export function fillPlaceholders(text: string, context: MessageContext): string | null {
  let missing = false;

  const filled = text.replace(PLACEHOLDER, (_match, key: string) => {
    const value = context[key as keyof MessageContext];
    if (value === undefined || value === null || value === "") {
      missing = true;
      return "";
    }
    return String(value);
  });

  return missing ? null : filled;
}

/** True when every placeholder in the text can be filled from this context. */
export function canFill(text: string, context: MessageContext): boolean {
  return fillPlaceholders(text, context) !== null;
}
