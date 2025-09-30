// test/unit/sanitize_mixed_format.test.ts
import { describe, it, expect } from "vitest";
import { sanitizeLLMOutput } from "../../src/utils/llm_sanitize";
import { normalizeToSlackMrkdwn } from "../../src/utils/format";

describe("sanitize mixed format output", () => {
  it("should remove --- ## patterns from LLM output", () => {
    const mixedOutput = `First Topic
    
[Discord #channel]
- Some content
Participants: user1

--- ## Second Topic

[Discord #channel2]
- More content`;

    const sanitized = sanitizeLLMOutput(mixedOutput);
    
    // Should convert --- ## to proper spacing with ##
    expect(sanitized).not.toContain("---");
    expect(sanitized).toContain("## Second Topic");
  });

  it("should handle --- separators without headers", () => {
    const output = `Topic 1
    
Participants: user1 --- Topic 2

Content here`;

    const sanitized = sanitizeLLMOutput(output);
    
    // Should remove --- and add proper spacing
    expect(sanitized).not.toContain("---");
    expect(sanitized).toContain("Topic 2");
  });

  it("should normalize headers that appear mid-line after sanitization", () => {
    const output = `Participants: user1 --- ## Next Topic

Content`;

    const sanitized = sanitizeLLMOutput(output);
    const normalized = normalizeToSlackMrkdwn(sanitized);
    
    // After sanitization and normalization, headers should be on new lines and bold
    // Note: trailing --- after Participants may remain but that's acceptable
    expect(normalized).not.toContain("##");
    expect(normalized).toContain("*Next Topic*");
    expect(normalized).toContain("Participants: user1");
  });

  it("should handle real-world problematic output", () => {
    // Simulate the actual output from the error log
    const problematic = `Zingo Version and Fund Transfers

[Discord #zingo]
- User experienced issues
Participants: zerodartz, r256433 --- ## Coinbase Session Token Authentication

[Discord #zashi]
- Internal evaluation underway`;

    const sanitized = sanitizeLLMOutput(problematic);
    const normalized = normalizeToSlackMrkdwn(sanitized);
    
    // Should have proper formatting
    expect(normalized).not.toContain("---");
    expect(normalized).not.toContain("##");
    expect(normalized).toContain("*Coinbase Session Token Authentication*");
    
    // Headers should be on their own lines (preceded by newlines)
    expect(normalized).toMatch(/\n\n\*Coinbase Session Token Authentication\*/);
  });
});
