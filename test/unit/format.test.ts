// test/unit/format.test.ts
import { describe, it, expect } from "vitest";
import { formatDigest } from "../../src/utils/format";

describe("formatDigest", () => {
  it("wraps summary in markdown", () => {
    const summary = "Hello world";
    const result = formatDigest(summary);
    expect(result).toContain("*Community Digest*");
    expect(result).toContain(summary);
  });
});
