import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildDigestBlocks } from "../../src/utils/format";

const start = new Date("2025-09-24T00:00:00Z");
const end = new Date("2025-09-25T00:00:00Z");
const dateTitle = "2025-09-24";

describe("buildDigestBlocks — block splitting and truncation", () => {
  let oldLimit: string | undefined;

  beforeEach(() => {
    oldLimit = process.env.SECTION_CHAR_LIMIT;
  });

  afterEach(() => {
    if (oldLimit === undefined) {
      delete process.env.SECTION_CHAR_LIMIT;
    } else {
      process.env.SECTION_CHAR_LIMIT = oldLimit;
    }
  });

  it("splits legacy '---' groups into multiple sections and preserves a Summary label", () => {
    const summary = [
      "First topic title",
      "- item a",
      "",
      "---",
      "",
      "Second topic title",
      "- item b",
    ].join("\n");

    const blocks = buildDigestBlocks({ summary, start, end, dateTitle });
    // header/context/divider expected
    expect(blocks[0].type).toBe("header");
    expect(blocks[1].type).toBe("context");
    expect(blocks[2].type).toBe("divider");

    // At least one section after divider
    const sectionIndex = blocks.findIndex((b) => b.type === "section");
    expect(sectionIndex).toBeGreaterThanOrEqual(3);

    // First section should include a Summary label
    expect(blocks[sectionIndex].text.text).toContain("*Summary*");

    // There should be multiple topic sections (at least 2)
    const sectionCount = blocks.filter((b) => b.type === "section").length;
    expect(sectionCount).toBeGreaterThanOrEqual(2);
    // There should be a divider between legacy groups
    const dividerCount = blocks.filter((b) => b.type === "divider").length;
    expect(dividerCount).toBeGreaterThanOrEqual(1);
  });

  it("soft-splits a very large single blob into multiple sections that do not exceed SECTION_CHAR_LIMIT", () => {
    // Force small section limit to exercise splitting
    process.env.SECTION_CHAR_LIMIT = "100";

    // Build a long blob with repeated paragraphs so splitting is necessary
    const para = "Line of detail about an event. More context and links: https://example.com";
    const paragraphs = new Array(12).fill(para).join("\n\n");
    const summary = paragraphs + "\n\nParticipants: alice, bob";

    const blocks = buildDigestBlocks({ summary, start, end, dateTitle });

    const sections = blocks.filter((b) => b.type === "section").map((s) => String((s as any).text.text));
    expect(sections.length).toBeGreaterThan(1);

    const max = Number(process.env.SECTION_CHAR_LIMIT || "2800");
    for (const s of sections) {
      // The first section may include the "*Summary*" prefix; strip it for length check.
      const txt = s.replace(/^\*Summary\*\n/, "");
      expect(txt.length).toBeLessThanOrEqual(max);
    }

    // Ensure participants are rendered as a context block
    const contexts = blocks.filter((b) => b.type === "context");
    const hasParticipants = contexts.some((c) => JSON.stringify(c).includes("Participants: alice, bob"));
    expect(hasParticipants).toBe(true);
  });

  it("splits by paragraphs and preserves trailing Participants lines as context blocks", () => {
    const summary = [
      "Topic A",
      "- detail 1",
      "",
      "Topic B",
      "- detail 2",
      "",
      "Participants: carol, dave",
    ].join("\n");

    const blocks = buildDigestBlocks({ summary, start, end, dateTitle });

    // There should be at least one context block containing participants
    const contexts = blocks.filter((b) => b.type === "context");
    const found = contexts.some((c) => JSON.stringify(c).includes("Participants: carol, dave"));
    expect(found).toBe(true);

    // Ensure first section contains "*Summary*"
    const firstSection = blocks.find((b) => b.type === "section");
    expect(firstSection).toBeDefined();
    expect((firstSection as any).text.text).toContain("*Summary*");
  });
});
