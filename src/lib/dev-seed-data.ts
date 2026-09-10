/**
 * Pure data-shaping for the dev seed (scripts/seed-dev.ts).
 *
 * Kept separate from the script so it can be tested without a Supabase project:
 * the whole value of seeded test data is that you can trust what it represents.
 * Everything here is deterministic — reseeding produces the same population, so
 * a bug you saw yesterday is still reproducible today.
 */

export type SeedableItem = {
  id: string;
  difficulty: string;
  categorySlug: string;
};

export type PersonaShape = {
  key: string;
  /** Fraction complete per category slug; `*` is the fallback. */
  completion: Record<string, number>;
};

/** Small, fast, seedable PRNG. */
export function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/** Fisher-Yates. A comparator-based shuffle is biased and not worth the risk here. */
function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function groupByCategory(items: readonly SeedableItem[]): Map<string, SeedableItem[]> {
  const grouped = new Map<string, SeedableItem[]>();
  for (const item of items) {
    const bucket = grouped.get(item.categorySlug);
    if (bucket) bucket.push(item);
    else grouped.set(item.categorySlug, [item]);
  }
  return grouped;
}

/**
 * The items a persona has completed. Exact per category: a persona declared at
 * 1.0 for a category completes all of it, so "Adventurer at 100%" is a
 * guarantee rather than a probability.
 */
export function personaItems(
  persona: PersonaShape,
  items: readonly SeedableItem[],
): string[] {
  const random = mulberry32(hash(persona.key));
  const chosen: string[] = [];

  for (const [slug, categoryItems] of groupByCategory(items)) {
    const fraction = persona.completion[slug] ?? persona.completion["*"] ?? 0;
    const target = Math.round(categoryItems.length * clamp01(fraction));
    chosen.push(...shuffled(categoryItems, random).slice(0, target).map((item) => item.id));
  }

  return chosen;
}

/** Base likelihood a given user has done an item, by how demanding it is. */
const DIFFICULTY_WEIGHT: Record<string, number> = {
  quick: 0.55,
  moderate: 0.3,
  stretch: 0.12,
};

/**
 * The items one synthetic user has completed. Weighted by difficulty and
 * scaled by a per-user "enthusiasm", so the aggregate percentages look like a
 * real population — quick items common, stretch items rare — rather than
 * uniform noise that would make every item read the same.
 */
export function syntheticItems(index: number, items: readonly SeedableItem[]): string[] {
  const random = mulberry32(hash(`sim-${index}`));
  const enthusiasm = 0.45 + random() * 0.9;

  return items
    .filter((item) => {
      const weight = DIFFICULTY_WEIGHT[item.difficulty] ?? 0.3;
      return random() < Math.min(0.95, weight * enthusiasm);
    })
    .map((item) => item.id);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
