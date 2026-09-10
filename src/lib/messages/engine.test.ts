import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canFill, fillPlaceholders, placeholdersIn } from "./interpolate";
import { pickMessage, type MessageCandidate } from "./engine";

const candidate = (
  id: string,
  copy_text: string,
  tone: MessageCandidate["tone"] = "roast",
): MessageCandidate => ({
  id,
  trigger_type: "item_stagnant",
  tone,
  copy_text,
  micro_action: tone === "roast" ? "Do the small version." : null,
});

describe("fillPlaceholders", () => {
  it("fills every placeholder it is given", () => {
    assert.equal(
      fillPlaceholders("{percent}% through {category}", { percent: 50, category: "Adventurer" }),
      "50% through Adventurer",
    );
  });

  it("returns null rather than emitting a literal placeholder", () => {
    // Shipping "{item}" to a user is worse than showing different copy.
    assert.equal(fillPlaceholders("“{item}” has been sitting there", {}), null);
    assert.equal(fillPlaceholders("{days} days on “{item}”", { item: "Gone camping" }), null);
  });

  it("treats an empty string as missing", () => {
    assert.equal(fillPlaceholders("about {item}", { item: "" }), null);
  });

  it("accepts zero as a real value", () => {
    // 0% and 0 days are meaningful, not absent.
    assert.equal(fillPlaceholders("{percent}% done", { percent: 0 }), "0% done");
    assert.equal(fillPlaceholders("{days} days", { days: 0 }), "0 days");
  });

  it("leaves text with no placeholders untouched", () => {
    assert.equal(fillPlaceholders("Look at you, doing a thing.", {}), "Look at you, doing a thing.");
  });

  it("lists the placeholders it finds", () => {
    assert.deepEqual(placeholdersIn("{days} days on “{item}”"), ["days", "item"]);
    assert.equal(canFill("{days} days", { days: 3 }), true);
  });
});

describe("pickMessage", () => {
  const pool = [
    candidate("a", "Plain line with no placeholders."),
    candidate("b", "{days} days on “{item}”."),
    candidate("c", "Another plain line."),
  ];

  it("never picks a variant it cannot fill", () => {
    // Run enough times that a broken filter would show up.
    for (let i = 0; i < 50; i++) {
      const chosen = pickMessage(pool, { item: "Gone camping" }, { random: Math.random });
      assert.notEqual(chosen?.candidate.id, "b");
      assert.ok(!chosen?.text.includes("{"));
    }
  });

  it("uses a placeholder variant once the context supports it", () => {
    const chosen = pickMessage(pool, { days: 21, item: "Gone camping" }, { random: () => 0.5 });
    assert.equal(chosen?.candidate.id, "b");
    assert.equal(chosen?.text, "21 days on “Gone camping”.");
  });

  it("avoids repeating the excluded message", () => {
    for (let i = 0; i < 50; i++) {
      const chosen = pickMessage(pool, {}, { excludeId: "a" });
      assert.notEqual(chosen?.candidate.id, "a");
    }
  });

  it("falls back to the excluded message when it is the only option", () => {
    const chosen = pickMessage([pool[0]], {}, { excludeId: "a" });
    assert.equal(chosen?.candidate.id, "a");
  });

  it("returns null when nothing can be filled", () => {
    assert.equal(pickMessage([pool[1]], {}), null);
  });

  it("returns null for an empty pool", () => {
    assert.equal(pickMessage([], {}), null);
  });

  it("stays in range at the top of the random distribution", () => {
    // Math.random() can return values arbitrarily close to 1.
    const chosen = pickMessage(pool, {}, { random: () => 0.999999999 });
    assert.ok(chosen !== null);
  });
});
