import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEV_PERSONAS } from "./dev-auth";
import {
  groupByCategory,
  personaItems,
  syntheticItems,
  type SeedableItem,
} from "./dev-seed-data";
import { CATEGORIES } from "@/content/items";

/** The real 128-item shape, so these tests reflect what actually gets seeded. */
const ITEMS: SeedableItem[] = CATEGORIES.flatMap((category) =>
  category.items.map((item) => ({
    id: item.slug,
    difficulty: item.difficulty,
    categorySlug: category.slug,
  })),
);

const fractionDone = (chosen: string[], categorySlug: string) => {
  const inCategory = ITEMS.filter((i) => i.categorySlug === categorySlug);
  const done = chosen.filter((id) => inCategory.some((i) => i.id === id));
  return done.length / inCategory.length;
};

describe("personaItems", () => {
  it("gives the newcomer nothing at all", () => {
    const newcomer = DEV_PERSONAS.find((p) => p.key === "newcomer")!;
    assert.deepEqual(personaItems(newcomer, ITEMS), []);
  });

  it("completes a category declared at 1.0 exactly, not approximately", () => {
    // "Adventurer at 100%" has to be a guarantee, or the persona is useless
    // for testing milestone and badge behaviour.
    const cam = DEV_PERSONAS.find((p) => p.key === "completionist")!;
    assert.equal(fractionDone(personaItems(cam, ITEMS), "adventurer"), 1);
  });

  it("honours per-category overrides over the wildcard", () => {
    const rey = DEV_PERSONAS.find((p) => p.key === "regular")!;
    const chosen = personaItems(rey, ITEMS);

    // Targets land on whole items, so allow half an item of rounding either way
    // (Adventurer has 19 items: 0.5 rounds to 10 of 19, not 9.5).
    const near = (slug: string, target: number) => {
      const size = ITEMS.filter((i) => i.categorySlug === slug).length;
      assert.ok(
        Math.abs(fractionDone(chosen, slug) - target) <= 0.5 / size,
        `${slug}: ${fractionDone(chosen, slug)} is not within rounding of ${target}`,
      );
    };

    near("adventurer", 0.5);   // per-category override
    near("connector", 0.2);    // per-category override
    near("learner", 0.35);     // wildcard
    near("rebel", 0.35);       // wildcard
  });

  it("never picks the same item twice", () => {
    for (const persona of DEV_PERSONAS) {
      const chosen = personaItems(persona, ITEMS);
      assert.equal(new Set(chosen).size, chosen.length, `${persona.key} has duplicates`);
    }
  });

  it("is deterministic across runs", () => {
    const rey = DEV_PERSONAS.find((p) => p.key === "regular")!;
    assert.deepEqual(personaItems(rey, ITEMS), personaItems(rey, ITEMS));
  });
});

describe("syntheticItems", () => {
  const population = Array.from({ length: 40 }, (_, i) => syntheticItems(i, ITEMS));

  it("is deterministic per index", () => {
    assert.deepEqual(syntheticItems(7, ITEMS), syntheticItems(7, ITEMS));
  });

  it("produces different people, not 40 copies", () => {
    const sizes = new Set(population.map((p) => p.length));
    assert.ok(sizes.size > 10, `only ${sizes.size} distinct list sizes across 40 users`);
  });

  it("gives everyone at least one completion, so all count as engaged", () => {
    // A synthetic user with nothing completed would not count toward the
    // stats denominator, silently undershooting the threshold.
    for (const [index, chosen] of population.entries()) {
      assert.ok(chosen.length > 0, `synthetic user ${index} completed nothing`);
    }
  });

  it("makes quick items commoner than stretch items in aggregate", () => {
    const counts = new Map<string, number>();
    for (const chosen of population) {
      for (const id of chosen) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const meanFor = (difficulty: string) => {
      const ids = ITEMS.filter((i) => i.difficulty === difficulty);
      return ids.reduce((sum, i) => sum + (counts.get(i.id) ?? 0), 0) / ids.length;
    };
    assert.ok(meanFor("quick") > meanFor("moderate"), "quick should beat moderate");
    assert.ok(meanFor("moderate") > meanFor("stretch"), "moderate should beat stretch");
  });

  it("spreads rates across the range rather than clustering at 0 or 100", () => {
    const counts = new Map<string, number>();
    for (const chosen of population) {
      for (const id of chosen) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const rates = ITEMS.map((i) => (counts.get(i.id) ?? 0) / population.length);
    assert.ok(Math.max(...rates) < 1, "no item should be done by literally everyone");
    assert.ok(rates.filter((r) => r > 0.05 && r < 0.8).length > 90, "most rates should be mid-range");
  });
});

describe("groupByCategory", () => {
  it("keeps all 128 items across 8 categories", () => {
    const grouped = groupByCategory(ITEMS);
    assert.equal(grouped.size, 8);
    assert.equal([...grouped.values()].reduce((n, list) => n + list.length, 0), 128);
  });
});
