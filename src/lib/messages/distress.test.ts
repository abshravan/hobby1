import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { containsDistressLanguage } from "./distress";

describe("containsDistressLanguage", () => {
  it("catches hopelessness and self-worth language", () => {
    const shouldMatch = [
      "I feel worthless",
      "I'm a failure and always have been",
      "honestly I hate myself for never doing any of this",
      "nothing matters anymore",
      "everything feels pointless",
      "I can't go on like this",
      "they'd be better off without me",
      "I want to die",
      "thinking about hurting myself",
      "I'm hopeless",
      "no reason to keep going",
      "I don't want to be here",
    ];
    for (const text of shouldMatch) {
      assert.equal(containsDistressLanguage(text), true, `missed: ${text}`);
    }
  });

  it("normalises curly apostrophes and casing", () => {
    assert.equal(containsDistressLanguage("I CAN’T GO ON"), true);
    assert.equal(containsDistressLanguage("i cant go on"), true);
  });

  it("does not fire on ordinary frustration with a task", () => {
    // If these matched, the override would swallow normal use and the roast
    // mode the user asked for would quietly stop working.
    const shouldNotMatch = [
      "I keep putting this off",
      "this one is really hard",
      "I've been meaning to do this for a year",
      "I gave up on learning guitar",
      "this is impossible to schedule",
      "I hate running",
      "I'm terrible at this",
      "no time for any of this",
      "I failed my driving test twice",
    ];
    for (const text of shouldNotMatch) {
      assert.equal(containsDistressLanguage(text), false, `false positive: ${text}`);
    }
  });

  it("handles empty and absent input", () => {
    assert.equal(containsDistressLanguage(""), false);
    assert.equal(containsDistressLanguage(null), false);
    assert.equal(containsDistressLanguage(undefined), false);
  });
});
