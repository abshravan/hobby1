import type { ItemDifficulty } from "@/lib/types";

export type SeedItem = {
  slug: string;
  title: string;
  difficulty: ItemDifficulty;
};

const DIFFICULTIES = new Set<string>(["quick", "moderate", "stretch"]);

/** Stable, URL-safe slug from an item title. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/-+$/g, "");
}

/**
 * Parses the block format used in items.ts:
 *
 *   difficulty | Title text            -> slug derived from the title
 *   difficulty | Title text | my-slug  -> explicit slug
 *
 * Slugs are the stable identity used by the seed script's upsert, so give an
 * item an explicit slug before rewording its title — otherwise the reworded
 * item seeds as a new row and existing progress no longer points at it.
 */
export function parseItems(block: string): SeedItem[] {
  const items: SeedItem[] = [];
  const seen = new Set<string>();

  for (const rawLine of block.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const parts = line.split("|").map((part) => part.trim());
    const [difficulty, title, explicitSlug] = parts;

    if (parts.length < 2 || !title) {
      throw new Error(`Malformed item line: ${rawLine}`);
    }
    if (!DIFFICULTIES.has(difficulty)) {
      throw new Error(`Unknown difficulty "${difficulty}" on line: ${rawLine}`);
    }

    const slug = explicitSlug || slugify(title);
    if (seen.has(slug)) {
      throw new Error(`Duplicate item slug "${slug}" — add an explicit slug to disambiguate.`);
    }
    seen.add(slug);

    items.push({ slug, title, difficulty: difficulty as ItemDifficulty });
  }

  return items;
}
