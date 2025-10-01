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
    expect(out).toContain("```js\n- not a bullet\n```");
  });
  it("preserves inline code", () => {
    const md = "`inline code`";
    const out = normalizeToSlackMrkdwn(md);
    expect(out).toContain("`inline code`");
  });
  it("converts **bold** and __bold__ to *bold*", () => {
    const md = "**bold** and __bold__";
    const out = normalizeToSlackMrkdwn(md);
    expect(out).toContain("*bold* and *bold*");
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
    expect(out).toContain("```js\n- *Key Topics:** text\n```");
  });
});

describe("buildDigestBlocks", () => {
  it("builds blocks with UTC header, context, divider, and summary section", () => {
    const blockSets = buildDigestBlocks({
      summary: "Some summary text.",
      start: new Date("2025-08-27T00:00:00Z"),
      end: new Date("2025-08-28T00:00:00Z"),
      dateTitle: "2025-08-27",
    });
    const blocks = blockSets[0];
    expect(blocks[0].type).toBe("header");
    expect(blocks[0].text.text).toContain("Community Digest — 2025-08-27 (UTC)");
    expect(blocks[1].type).toBe("context");
    expect(blocks[1].elements[0].text).toContain("Time window: 2025-08-27 00:00–2025-08-28 00:00 UTC");
    expect(blocks[2].type).toBe("divider");
    expect(blocks[3].type).toBe("section");
    expect(blocks[3].text.text).toContain("Some summary text");
  });
});
