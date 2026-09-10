import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  DEV_PERSONAS,
  devEmail,
  devLoginEnabled,
  isDevEmail,
  personaFor,
} from "./dev-auth";

const originalNodeEnv = process.env.NODE_ENV;
const originalFlag = process.env.ENABLE_DEV_LOGIN;

// NODE_ENV is typed as a readonly union by Next; it is a plain string at runtime.
const env = process.env as Record<string, string | undefined>;

function setEnv(nodeEnv: string | undefined, flag: string | undefined) {
  if (nodeEnv === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = nodeEnv;
  if (flag === undefined) delete env.ENABLE_DEV_LOGIN;
  else env.ENABLE_DEV_LOGIN = flag;
}

afterEach(() => setEnv(originalNodeEnv, originalFlag));

describe("devLoginEnabled", () => {
  it("is off by default in development", () => {
    setEnv("development", undefined);
    assert.equal(devLoginEnabled(), false);
  });

  it("is on in development with the explicit flag", () => {
    setEnv("development", "true");
    assert.equal(devLoginEnabled(), true);
  });

  it("stays off in production even with the flag set", () => {
    // The guard that matters: a leaked env var must not open the door.
    setEnv("production", "true");
    assert.equal(devLoginEnabled(), false);
  });

  it("is available under NODE_ENV=test, so integration tests can use it", () => {
    setEnv("test", "true");
    assert.equal(devLoginEnabled(), true);
  });

  it("is blocked in production however the flag is spelled", () => {
    for (const value of ["true", "TRUE", "1", "yes"]) {
      setEnv("production", value);
      assert.equal(devLoginEnabled(), false, `production must stay closed for ${value}`);
    }
  });

  it("requires exactly \"true\", not any truthy string", () => {
    for (const value of ["1", "yes", "TRUE", "on", ""]) {
      setEnv("development", value);
      assert.equal(devLoginEnabled(), false, `flag ${JSON.stringify(value)} must not enable`);
    }
  });
});

describe("dev email addresses", () => {
  it("uses the reserved .test TLD so it cannot reach a real inbox", () => {
    assert.equal(devEmail("newcomer"), "dev-newcomer@artha.test");
  });

  it("recognises its own addresses and nothing else", () => {
    assert.equal(isDevEmail("dev-newcomer@artha.test"), true);
    assert.equal(isDevEmail("real@example.com"), false);
    assert.equal(isDevEmail("dev-someone@example.com"), false);
    assert.equal(isDevEmail("someone@artha.test"), false);
    assert.equal(isDevEmail(undefined), false);
  });
});

describe("personas", () => {
  it("have unique keys", () => {
    const keys = DEV_PERSONAS.map((p) => p.key);
    assert.equal(new Set(keys).size, keys.length);
  });

  it("cover both tones", () => {
    const tones = new Set(DEV_PERSONAS.map((p) => p.tone));
    assert.deepEqual([...tones].sort(), ["motivate", "roast"]);
  });

  it("look up by key", () => {
    assert.equal(personaFor("newcomer")?.key, "newcomer");
    assert.equal(personaFor("nope"), undefined);
  });
});
