// test/unit/gemini_prompt.test.ts
import { describe, it, expect } from "vitest";
import { buildPrompt, truncateMessages } from "../../src/services/llm/gemini";
import { MessageDTO } from "../../src/services/discord";

function makeMsg(content: string, channelId = "chan", createdAt = "2025-08-28T09:00:00Z") {
  return { id: "id", channelId, author: "user", content, createdAt, url: "" } as MessageDTO;
}

describe("Gemini prompt builder", () => {
  it("builds a digest prompt with numbered messages", () => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const d1 = new Date("2025-08-28T09:00:00Z").toLocaleString("en-US", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz,
    });
    const d2 = new Date("2025-08-28T10:00:00Z").toLocaleString("en-US", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz,
    });

    const messages = [
      makeMsg("foo", "chan1", "2025-08-28T09:00:00Z"),
      makeMsg("bar", "chan2", "2025-08-28T10:00:00Z"),
    ];
    const prompt = buildPrompt(messages);

    expect(prompt).toContain(`[1] [chan1 @ ${d1} ${tz}] foo`);
    expect(prompt).toContain(`[2] [chan2 @ ${d2} ${tz}] bar`);
    expect(prompt).toContain("Community Digest:");
    expect(prompt).toContain("Sections: Decisions, Action Items, Links.");
    // Prompt now instructs the model to collect URLs under a Shared Links heading.
    expect(prompt).toContain("Shared Links");
    expect(prompt).toContain("If any messages contain URLs or links");
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
