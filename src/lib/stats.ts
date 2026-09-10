/**
 * "X% of users have done this" — the app's core hook.
 *
 * The number is only shown once there are enough engaged users for it to mean
 * something. Below that, an early user would see 100% on everything they check
 * and 0% on everything else, which is technically true and completely useless.
 */

export type ItemStat = {
  itemId: string;
  completedUsers: number;
  totalUsers: number;
  /** 0–1. */
  completionRate: number;
};

/**
 * Engaged users (people who have completed at least one item) required before
 * any completion rate is shown. Tune this as real traffic arrives — below ~25
 * a single person moves every percentage by four points.
 */
export const MIN_USERS_FOR_STATS = 25;

export function statsAreMeaningful(totalUsers: number): boolean {
  return totalUsers >= MIN_USERS_FOR_STATS;
}

/**
 * Human phrasing for one item's rate. Returns null when the stat should not be
 * shown at all, so callers render nothing rather than a placeholder.
 */
export function formatCompletionRate(stat: ItemStat | undefined): string | null {
  if (!stat || !statsAreMeaningful(stat.totalUsers)) return null;

  if (stat.completedUsers === 0) return "Nobody here has yet";

  const percent = stat.completionRate * 100;
  // Round toward the nearest whole percent, but never round a real result down
  // to "0%" or up to "100%" — both misrepresent the data at the extremes.
  if (percent < 1) return "Under 1% have done this";
  if (stat.completedUsers < stat.totalUsers && percent > 99) {
    return "Over 99% have done this";
  }
  return `${Math.round(percent)}% have done this`;
}

/** True for items almost nobody has done — the basis for rarity badges in Step 9. */
export const RARITY_THRESHOLD = 0.05;

/**
 * Rare means "a few people have done this", not "no data". An item nobody has
 * touched is an absence of evidence, not a rare achievement — and treating it
 * as rare put every untouched item in the attention colour, which on a fresh
 * install is most of the list.
 */
export function isRare(stat: ItemStat | undefined): boolean {
  return Boolean(
    stat &&
      statsAreMeaningful(stat.totalUsers) &&
      stat.completedUsers > 0 &&
      stat.completionRate < RARITY_THRESHOLD,
  );
}
