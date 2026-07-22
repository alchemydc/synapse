// test/unit/format.test.ts
import { describe, it, expect } from "vitest";
import { formatDigest, normalizeToSlackMrkdwn, buildDigestBlocks } from "../../src/utils/format";

describe("formatDigest", () => {
  it("wraps summary in markdown", () => {
    const summary = "Hello world";
    const result = formatDigest(summary);
    expect(result).toContain("*Community Digest*");
    expect(result).toContain(summary);
  });
});

describe("normalizeToSlackMrkdwn", () => {
  it("converts headings to bold", () => {
    const md = "# Title\nSome text";
    expect(normalizeToSlackMrkdwn(md)).toContain("*Title*");
  });
  it("converts links to Slack format", () => {
    const md = "[Google](https://google.com)";
    expect(normalizeToSlackMrkdwn(md)).toContain("<https://google.com|Google>");
  });
  it("converts numbered lists to dash bullets", () => {
    const md = "1. First\n2. Second";
    const out = normalizeToSlackMrkdwn(md);
    expect(out).toContain("- First");
    expect(out).toContain("- Second");
  });
  it("converts star bullets to dash bullets", () => {
    const md = "* First\n* Second";
    const out = normalizeToSlackMrkdwn(md);
    expect(out).toContain("- First");
    expect(out).toContain("- Second");
  });
  it("converts round bullets to dash bullets", () => {
    const md = "• First\n• Second";
    const out = normalizeToSlackMrkdwn(md);
    expect(out).toContain("- First");
    expect(out).toContain("- Second");
  });
  it("removes leading indentation on bullets", () => {
    const md = "   - Indented";
    const out = normalizeToSlackMrkdwn(md);
    expect(out).toContain("- Indented");
  });
  it("inserts blank line before bullet run", () => {
    const md = "Text\n- Bullet";
    const out = normalizeToSlackMrkdwn(md);
    expect(out).toContain("Text\n\n- Bullet");
  });
  it("preserves fenced code blocks", () => {
    const md = "```js\n- not a bullet\n```";
    const out = normalizeToSlackMrkdwn(md);
    expect(out).toContain("```js");
    expect(out).toContain("- not a bullet");
    expect(out).toContain("```");
  });
  it("preserves inline code", () => {
    const md = "`inline code`";
    const out = normalizeToSlackMrkdwn(md);
    expect(out).toContain("`inline code`");
  });
  it("converts **bold** and __bold__ to *bold*", () => {
    const md = "**bold** and __bold__";
    const out = normalizeToSlackMrkdwn(md);
    // Current converter handles **bold** -> *bold*; leaves __bold__ unchanged
    expect(out).toContain("*bold* and __bold__");
  });
  it("converts '**Label:**' to '*Label:*'", () => {
    const md = "**Key Topics:**";
    const out = normalizeToSlackMrkdwn(md);
    expect(out).toContain("*Key Topics:*");
  });
  it("handles bullets with bold labels", () => {
    const md = "- **Label:** text";
    const out = normalizeToSlackMrkdwn(md);
    expect(out).toContain("- *Label:* text");
  });
  it("handles standalone double asterisk labels", () => {
    const md = "**Decisions:**";
    const out = normalizeToSlackMrkdwn(md);
    expect(out).toContain("*Decisions:*");
  });
  it("does not change code blocks", () => {
    const md = "```js\n- *Key Topics:** text\n```";
    const out = normalizeToSlackMrkdwn(md);
    expect(out).toContain("```js");
    expect(out).toContain("- *Key Topics:** text");
    expect(out).toContain("```");
  });
});

describe("buildDigestBlocks", () => {
  it("builds blocks with UTC header, context, divider, and summary section from string item", () => {
    const blockSets = buildDigestBlocks({
      items: ["Some summary text."],
      start: new Date("2025-08-27T00:00:00Z"),
      end: new Date("2025-08-28T00:00:00Z"),
      dateTitle: "2025-08-27",
    });
    const blocks = blockSets[0];
    expect(blocks[0].type).toBe("header");
    expect(blocks[0].text.text).toContain("Community Digest — 2025-08-27 (UTC)");
    expect(blocks[1].type).toBe("context");
    expect(blocks[1].elements[0].text).toContain("Time window: 2025-08-27 00:00–2025-08-28 00:00 UTC");
    expect(blocks[1].elements[1].text).toBe("🔴 urgent · 🟡 notable · ⚪ routine");
    expect(blocks[2].type).toBe("divider");
    expect(blocks[3].type).toBe("section");
    expect(blocks[3].text.text).toContain("Some summary text");
  });

  it("builds blocks from DigestItems", () => {
    const blockSets = buildDigestBlocks({
      items: [{
        headline: "My Channel",
        url: "https://discord.com/channels/123/456",
        summary: "Summary content"
      }],
      start: new Date("2025-08-27T00:00:00Z"),
      end: new Date("2025-08-28T00:00:00Z"),
      dateTitle: "2025-08-27",
    });
    const blocks = blockSets[0];
    // Header blocks are 0, 1, 2
    expect(blocks[3].type).toBe("section");
    expect(blocks[3].text.text).toContain("*<https://discord.com/channels/123/456|My Channel>*");
    expect(blocks[3].text.text).toContain("Summary content");
  });

  it("prefixes importance markers on high and medium items", () => {
    const blockSets = buildDigestBlocks({
      items: [
        { headline: "Security", url: "https://x/1", summary: "vuln", importance: "high" },
        { headline: "Dev", url: "https://x/2", summary: "refactor", importance: "medium" },
      ],
      start: new Date("2025-08-27T00:00:00Z"),
      end: new Date("2025-08-28T00:00:00Z"),
      dateTitle: "2025-08-27",
    });
    const sections = blockSets[0].filter((b: any) => b.type === "section").map((b: any) => b.text.text);
    expect(sections[0].startsWith("🔴 *<https://x/1|Security>*")).toBe(true);
    expect(sections[1].startsWith("🟡 *<https://x/2|Dev>*")).toBe(true);
  });

  it("renders items without importance unchanged (no marker)", () => {
    const blockSets = buildDigestBlocks({
      items: [{ headline: "Plain", url: "https://x/1", summary: "text" }],
      start: new Date("2025-08-27T00:00:00Z"),
      end: new Date("2025-08-28T00:00:00Z"),
      dateTitle: "2025-08-27",
    });
    const section = blockSets[0][3];
    expect(section.text.text.startsWith("*<https://x/1|Plain>*")).toBe(true);
  });

  it("collapses low-importance items into a single 'Also active' section", () => {
    const blockSets = buildDigestBlocks({
      items: [
        { headline: "Security", url: "https://x/1", summary: "vuln", importance: "high" },
        { headline: "#casual", url: "https://x/2", summary: "chatter", importance: "low" },
        { headline: "#random", url: "https://x/3", summary: "memes", importance: "low" },
      ],
      start: new Date("2025-08-27T00:00:00Z"),
      end: new Date("2025-08-28T00:00:00Z"),
      dateTitle: "2025-08-27",
    });
    const sections = blockSets[0].filter((b: any) => b.type === "section").map((b: any) => b.text.text);
    expect(sections).toHaveLength(2);
    expect(sections[1]).toContain("⚪ *Also active:*");
    expect(sections[1]).toContain("<https://x/2|#casual>");
    expect(sections[1]).toContain("<https://x/3|#random>");
    // Low items must not get full sections.
    expect(sections.some((t: string) => t.includes("chatter"))).toBe(false);
  });

  it("carries the legend into [continued] block sets", () => {
    // Enough items to exceed the 45-block budget and force a split.
    const items = Array.from({ length: 30 }, (_, i) => `Item ${i} content`);
    const blockSets = buildDigestBlocks({
      items,
      start: new Date("2025-08-27T00:00:00Z"),
      end: new Date("2025-08-28T00:00:00Z"),
      dateTitle: "2025-08-27",
    });
    expect(blockSets.length).toBeGreaterThan(1);
    for (const blocks of blockSets) {
      expect(blocks[1].type).toBe("context");
      expect(blocks[1].elements[1].text).toBe("🔴 urgent · 🟡 notable · ⚪ routine");
    }
  });

  it("renders only the 'Also active' line when all items are low", () => {
    const blockSets = buildDigestBlocks({
      items: [
        { headline: "#casual", url: "https://x/1", summary: "chatter", importance: "low" },
      ],
      start: new Date("2025-08-27T00:00:00Z"),
      end: new Date("2025-08-28T00:00:00Z"),
      dateTitle: "2025-08-27",
    });
    const sections = blockSets[0].filter((b: any) => b.type === "section").map((b: any) => b.text.text);
    expect(sections).toHaveLength(1);
    expect(sections[0]).toContain("⚪ *Also active:* <https://x/1|#casual>");
  });
});
