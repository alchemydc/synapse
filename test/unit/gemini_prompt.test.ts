// test/unit/gemini_prompt.test.ts
import { describe, it, expect } from "vitest";
import { buildPrompt, truncateMessages } from "../../src/services/llm/gemini";

describe("Gemini prompt builder", () => {
  it("builds a digest prompt with numbered messages", () => {
    const messages = ["foo", "bar"];
    const prompt = buildPrompt(messages);
    expect(prompt).toContain("[1] foo");
    expect(prompt).toContain("[2] bar");
    expect(prompt).toContain("Community Digest:");
    expect(prompt).toContain("Digest:");
  });

  it("truncates messages to max chars", () => {
    const messages = ["a".repeat(10), "b".repeat(10), "c".repeat(10)];
    const result = truncateMessages(messages, 15);
    expect(result.length).toBe(1);
    expect(result[0]).toBe("a".repeat(10));
  });
});
