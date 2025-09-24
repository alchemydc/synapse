// test/unit/link_and_inject.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  registerDiscordChannel,
  getDiscordChannelById,
  lookupDiscordByLabel,
  resetRegistries,
} from "../../src/utils/link_registry";
import { injectSourceLinks } from "../../src/utils/source_link_inject";

describe("link_registry + sanitization", () => {
  beforeEach(() => {
    resetRegistries();
  });

  it("indexes emoji-prefixed channel names and resolves by simple label", () => {
    registerDiscordChannel({
      id: "1",
      name: "💬┊general",
      guildId: "GUILD",
      url: "https://discord.com/channels/GUILD/1",
      platform: "discord",
    });

    const byId = getDiscordChannelById("1");
    expect(byId).toBeDefined();
    expect(byId?.id).toBe("1");

    // lookup by "#general" and "general" should resolve via sanitized/simple index
    const byHash = lookupDiscordByLabel("#general");
    const byPlain = lookupDiscordByLabel("general");
    expect(byHash).toBeDefined();
    expect(byHash?.id).toBe("1");
    expect(byPlain).toBeDefined();
    expect(byPlain?.id).toBe("1");
  });

  it("indexes simple variant from decorative names", () => {
    registerDiscordChannel({
      id: "2",
      name: "┊zingo",
      guildId: "GUILD",
      url: "https://discord.com/channels/GUILD/2",
      platform: "discord",
    });

    const resolved = lookupDiscordByLabel("zingo");
    expect(resolved).toBeDefined();
    expect(resolved?.id).toBe("2");
  });
});

describe("injectSourceLinks integration", () => {
  beforeEach(() => {
    resetRegistries();
  });

  it("replaces bracketed Discord labels with Slack-style links when registry has emoji names", () => {
    registerDiscordChannel({
      id: "111",
      name: "💬┊general",
      guildId: "GUILD",
      url: "https://discord.com/channels/GUILD/111",
      platform: "discord",
    });

    const md = "[Discord #general] Topic heading\n\nSome content";
    const out = injectSourceLinks(md);
    expect(out).toContain("[Discord <https://discord.com/channels/GUILD/111|#general>]");
  });

  it("prefers lookup by numeric id when provided", () => {
    registerDiscordChannel({
      id: "222",
      name: "topic",
      guildId: "GUILD",
      url: "https://discord.com/channels/GUILD/222",
      platform: "discord",
    });

    const md = "[Discord #topic] 222";
    const out = injectSourceLinks(md);
    expect(out).toContain("[Discord <https://discord.com/channels/GUILD/222|#topic>]");
  });

  it("leaves label unchanged when no registry metadata available", () => {
    // no registration
    const md = "[Discord #missing] Some heading";
    const out = injectSourceLinks(md);
    expect(out).toContain("[Discord #missing]");
  });
});
