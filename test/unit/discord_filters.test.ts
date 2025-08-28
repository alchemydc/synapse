// test/unit/discord_filters.test.ts
import { describe, it, expect } from "vitest";
import { MessageDTO } from "../../src/services/discord";
import { isCommand, isLinkOnly, applyMessageFilters } from "../../src/utils/filters";

import type { Config } from "../../src/utils/filters";

const config: Partial<Config> = {
  MIN_MESSAGE_LENGTH: 5,
  EXCLUDE_COMMANDS: true,
  EXCLUDE_LINK_ONLY: true,
};

describe("Discord message filters", () => {
  it("filters out bot messages and empty content", () => {
    const messages: MessageDTO[] = [
      { id: "1", channelId: "a", author: "user", content: "hello", createdAt: "", url: "" },
      { id: "2", channelId: "a", author: "Bot", content: "ignore me", createdAt: "", url: "" },
      { id: "3", channelId: "a", author: "user", content: "   ", createdAt: "", url: "" },
    ];
    const filtered = messages.filter((m) => m.content.trim() && !m.author.toLowerCase().includes("bot"));
    expect(filtered.length).toBe(1);
    expect(filtered[0].author).toBe("user");
    expect(filtered[0].content).toBe("hello");
  });

  it("filters by min length", () => {
    const messages: MessageDTO[] = [
      { id: "1", channelId: "a", author: "user", content: "hi", createdAt: "", url: "" },
      { id: "2", channelId: "a", author: "user", content: "hello world", createdAt: "", url: "" },
    ];
    const filtered = applyMessageFilters(messages, config);
    expect(filtered.length).toBe(1);
    expect(filtered[0].content).toBe("hello world");
  });

  it("filters out commands", () => {
    const messages: MessageDTO[] = [
      { id: "1", channelId: "a", author: "user", content: "!do something", createdAt: "", url: "" },
      { id: "2", channelId: "a", author: "user", content: "/help", createdAt: "", url: "" },
      { id: "3", channelId: "a", author: "user", content: "normal message", createdAt: "", url: "" },
    ];
    const filtered = applyMessageFilters(messages, config);
    expect(filtered.length).toBe(1);
    expect(filtered[0].content).toBe("normal message");
  });

  it("filters out link-only messages", () => {
    const messages: MessageDTO[] = [
      { id: "1", channelId: "a", author: "user", content: "https://example.com", createdAt: "", url: "" },
      { id: "2", channelId: "a", author: "user", content: "[Link](https://example.com)", createdAt: "", url: "" },
      { id: "3", channelId: "a", author: "user", content: "see https://example.com for details", createdAt: "", url: "" },
      { id: "4", channelId: "a", author: "user", content: "normal message", createdAt: "", url: "" },
    ];
    const filtered = applyMessageFilters(messages, config);
    expect(filtered.length).toBe(2);
    expect(filtered[0].content).toBe("see https://example.com for details");
    expect(filtered[1].content).toBe("normal message");
  });

  it("detects commands", () => {
    expect(isCommand({ content: "!cmd" } as any)).toBe(true);
    expect(isCommand({ content: "/cmd" } as any)).toBe(true);
    expect(isCommand({ content: "not a command" } as any)).toBe(false);
  });

  it("detects link-only", () => {
    expect(isLinkOnly({ content: "https://foo.com" } as any)).toBe(true);
    expect(isLinkOnly({ content: "[Link](https://foo.com)" } as any)).toBe(true);
    expect(isLinkOnly({ content: "see https://foo.com for details" } as any)).toBe(false);
  });
});
