// test/unit/discord_filters.test.ts
import { describe, it, expect } from "vitest";
import { MessageDTO } from "../../src/services/discord";

function applyFilters(messages: MessageDTO[]): MessageDTO[] {
  return messages.filter(
    (m) => m.content.trim() && !m.author.toLowerCase().includes("bot")
  );
}

describe("Discord message filters", () => {
  it("filters out bot messages and empty content", () => {
    const messages: MessageDTO[] = [
      { id: "1", channelId: "a", author: "user", content: "hello", createdAt: "", url: "" },
      { id: "2", channelId: "a", author: "Bot", content: "ignore me", createdAt: "", url: "" },
      { id: "3", channelId: "a", author: "user", content: "   ", createdAt: "", url: "" },
    ];
    const filtered = applyFilters(messages);
    expect(filtered.length).toBe(1);
    expect(filtered[0].author).toBe("user");
    expect(filtered[0].content).toBe("hello");
  });
});
