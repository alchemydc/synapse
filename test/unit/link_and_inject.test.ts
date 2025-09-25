 // test/unit/link_and_inject.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  registerDiscordChannel,
  getDiscordChannelById,
  lookupDiscordByLabel,
  registerDiscourseTopic,
  registerDiscourseCategory,
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

  it("links forum topic by exact title when registered", () => {
    registerDiscourseTopic({
      id: 300,
      title: "My Awesome Topic",
      url: "https://forum.example.org/t/my-awesome-topic/300",
      platform: "discourse",
    });

    const md = "[Forum topic:My Awesome Topic] Topic heading\n\nContent";
    const out = injectSourceLinks(md);
    expect(out).toContain("[Forum <https://forum.example.org/t/my-awesome-topic/300|topic: My Awesome Topic>]");
  });

  it("prefers disc-topic-<id> token when present", () => {
    registerDiscourseTopic({
      id: 301,
      title: "Other Topic",
      url: "https://forum.example.org/t/other-topic/301",
      platform: "discourse",
    });

    const md = "[Forum topic:Other Topic] disc-topic-301";
    const out = injectSourceLinks(md);
    expect(out).toContain("[Forum <https://forum.example.org/t/other-topic/301|topic: Other Topic>]");
  });

  it("sanitized title match links when LLM altered punctuation or emoji", () => {
    registerDiscourseTopic({
      id: 302,
      title: "🚀 Launch — Notes",
      url: "https://forum.example.org/t/launch-notes/302",
      platform: "discourse",
    });

    // LLM may output a cleaned title without emoji or punctuation
    const md = "[Forum topic:Launch Notes] Topic heading";
    const out = injectSourceLinks(md);
    expect(out).toContain("[Forum <https://forum.example.org/t/launch-notes/302|topic: 🚀 Launch — Notes>]");
  });

  it("links category when category registered", () => {
    registerDiscourseCategory({
      id: 5,
      name: "Announcements",
      slug: "announcements",
      url: "https://forum.example.org/c/announcements/5",
      platform: "discourse",
    });

    const md = "[Forum category:Announcements] Some heading";
    const out = injectSourceLinks(md);
    expect(out).toContain("[Forum <https://forum.example.org/c/announcements/5|category: Announcements>]");
  });

  it("prefers topic link when disc-topic token follows a category label", () => {
    registerDiscourseTopic({
      id: 6,
      title: "Category Topic",
      url: "https://forum.example.org/t/category-topic/6",
      platform: "discourse",
    });
    registerDiscourseCategory({
      id: 6,
      name: "CategoryTopic",
      slug: "categorytopic",
      url: "https://forum.example.org/c/categorytopic/6",
      platform: "discourse",
    });

    const md = "[Forum category:CategoryTopic] disc-topic-6";
    const out = injectSourceLinks(md);
    expect(out).toContain("[Forum <https://forum.example.org/t/category-topic/6|topic: Category Topic>]");
  });
});
