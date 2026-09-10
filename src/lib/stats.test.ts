import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MIN_USERS_FOR_STATS,
  formatCompletionRate,
  isRare,
  statsAreMeaningful,
  type ItemStat,
} from "./stats";

const stat = (completedUsers: number, totalUsers: number): ItemStat => ({
  itemId: "x",
  completedUsers,
  totalUsers,
  completionRate: totalUsers === 0 ? 0 : completedUsers / totalUsers,
});

describe("statsAreMeaningful", () => {
  it("is false below the threshold", () => {
    assert.equal(statsAreMeaningful(MIN_USERS_FOR_STATS - 1), false);
    assert.equal(statsAreMeaningful(0), false);
  });

  it("is true at the threshold", () => {
    assert.equal(statsAreMeaningful(MIN_USERS_FOR_STATS), true);
  });
});

describe("formatCompletionRate", () => {
  it("shows nothing when there is no stat", () => {
    assert.equal(formatCompletionRate(undefined), null);
  });

  it("shows nothing below the threshold, however lopsided", () => {
    // The failure this guards: user #1 checks an item and is told 100% of
    // users have done it.
    assert.equal(formatCompletionRate(stat(1, 1)), null);
    assert.equal(formatCompletionRate(stat(0, 24)), null);
  });

  it("reports a normal rate once there is enough data", () => {
    assert.equal(formatCompletionRate(stat(25, 100)), "25% have done this");
  });

  it("never rounds a real completion down to 0%", () => {
    assert.equal(formatCompletionRate(stat(1, 1000)), "Under 1% have done this");
  });

  it("never rounds an incomplete item up to 100%", () => {
    assert.equal(formatCompletionRate(stat(999, 1000)), "Over 99% have done this");
  });

  it("allows a genuine 100%", () => {
    assert.equal(formatCompletionRate(stat(50, 50)), "100% have done this");
  });

  it("distinguishes zero completions from a rounding artefact", () => {
    assert.equal(formatCompletionRate(stat(0, 50)), "Nobody here has yet");
  });
});

describe("isRare", () => {
  it("flags items under 5%", () => {
    assert.equal(isRare(stat(2, 100)), true);
    assert.equal(isRare(stat(5, 100)), false);
  });

  it("never flags anything below the display threshold", () => {
    assert.equal(isRare(stat(0, 10)), false);
  });

  it("does not treat 'nobody has done this' as rare", () => {
    // Absence of evidence, not a rare achievement — and on a fresh install this
    // is most of the list.
    assert.equal(isRare(stat(0, 100)), false);
    assert.equal(isRare(stat(1, 100)), true);
  });
});
