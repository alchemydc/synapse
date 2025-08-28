// test/unit/gemini_prompt.test.ts
import { describe, it, expect } from "vitest";
import { buildPrompt, truncateMessages } from "../../src/services/llm/gemini";
import { MessageDTO } from "../../src/services/discord";

function makeMsg(content: string, channelId = "chan", createdAt = "2025-08-28T09:00:00Z") {
  return { id: "id", channelId, author: "user", content, createdAt, url: "" } as MessageDTO;
}

describe("Gemini prompt builder", () => {
  it("builds a digest prompt with numbered messages", () => {
    const messages = [
      makeMsg("foo", "chan1", "2025-08-28T09:00:00Z"),
      makeMsg("bar", "chan2", "2025-08-28T10:00:00Z"),
    ];
    // Actual output uses comma between date and time
    expect(buildPrompt(messages)).toContain("[1] [chan1 @ 08/28/2025, 03:00 America/Denver] foo");
    expect(buildPrompt(messages)).toContain("[2] [chan2 @ 08/28/2025, 04:00 America/Denver] bar");
    expect(buildPrompt(messages)).toContain("Community Digest:");
    expect(buildPrompt(messages)).toContain("Sections: Key Topics, Decisions, Action Items, Links.");
  });

  it("truncates messages to max chars", () => {
    const messages = [
      makeMsg("a".repeat(10)),
      makeMsg("b".repeat(10)),
      makeMsg("c".repeat(10)),
    ];
    const truncated = truncateMessages(messages, 20);
    expect(truncated.length).toBe(2);
    expect(truncated[0].content).toBe("a".repeat(10));
    expect(truncated[1].content).toBe("b".repeat(10));
  });
});
