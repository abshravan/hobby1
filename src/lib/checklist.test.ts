import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  categoryProgress,
  overallProgress,
  toProgress,
  type ChecklistCategory,
} from "./checklist";

const item = (id: string) => ({ id, slug: id, title: id, difficulty: "quick" as const });

const category = (id: string, count: number): ChecklistCategory => ({
  id,
  slug: id,
  name: id,
  tagline: null,
  items: Array.from({ length: count }, (_, index) => item(`${id}-${index}`)),
});

describe("toProgress", () => {
  it("is 0% when nothing is done", () => {
    assert.equal(toProgress(0, 128).percent, 0);
  });

  it("never shows 0% once something is done", () => {
    // 1/128 floors to 0, which reads as a punishment for starting.
    assert.equal(toProgress(1, 128).percent, 1);
  });

  it("floors rather than rounds, so 100% means actually finished", () => {
    assert.equal(toProgress(127, 128).percent, 99);
    assert.equal(toProgress(128, 128).percent, 100);
  });

  it("handles an empty category without dividing by zero", () => {
    assert.deepEqual(toProgress(0, 0), { completed: 0, total: 0, percent: 0 });
  });
});

describe("categoryProgress", () => {
  it("counts only items belonging to that category", () => {
    const adventurer = category("adventurer", 19);
    const completed = new Set(["adventurer-0", "adventurer-1", "creator-0"]);

    assert.deepEqual(categoryProgress(adventurer, completed), {
      completed: 2,
      total: 19,
      percent: 10,
    });
  });
});

describe("overallProgress", () => {
  const categories = [category("a", 19), category("b", 18), category("c", 13)];

  it("sums across every category", () => {
    const completed = new Set(["a-0", "b-0", "b-1", "c-0"]);
    assert.deepEqual(overallProgress(categories, completed), {
      completed: 4,
      total: 50,
      percent: 8,
    });
  });

  it("ignores ids that match no item", () => {
    assert.equal(overallProgress(categories, new Set(["ghost"])).completed, 0);
  });

  it("reaches exactly 100 only when everything is checked", () => {
    const all = new Set(categories.flatMap((c) => c.items.map((i) => i.id)));
    assert.equal(overallProgress(categories, all).percent, 100);
    all.delete("a-0");
    assert.equal(overallProgress(categories, all).percent, 98);
  });
});
