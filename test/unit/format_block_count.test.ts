// test/unit/format_block_count.test.ts
import { describe, it, expect } from "vitest";
import { buildDigestBlocks } from "../../src/utils/format";

describe("format block count", () => {
  it("should keep block count under 50 for multi-topic digest", () => {
    // Simulate output with 10 topics, each with multiple bullets
    const topics = [];
    for (let i = 1; i <= 10; i++) {
      topics.push(`## Topic ${i}

[Discord #channel-${i}]

- First bullet point for topic ${i}
- Second bullet point for topic ${i}
- Third bullet point for topic ${i}

Participants: user1, user2, user3`);
    }
    
    const summary = topics.join("\n\n");
    
    const blocks = buildDigestBlocks({
      summary,
      start: new Date("2025-09-29T00:00:00Z"),
      end: new Date("2025-09-30T00:00:00Z"),
      dateTitle: "2025-09-29"
    });
    
    // With new logic: 3 header blocks + (10 topics × 3 blocks each) = 33 blocks
    // Each topic: 1 section + 1 context (participants) + 1 divider (except last)
    // Old logic would create: 3 header + (10 topics × 5+ blocks) = 53+ blocks (FAIL)
    
    expect(blocks.length).toBeLessThan(50);
    expect(blocks.length).toBeLessThanOrEqual(35); // Allow some margin
    
    // Verify structure: header, context, divider, then topics
    expect(blocks[0].type).toBe("header");
    expect(blocks[1].type).toBe("context");
    expect(blocks[2].type).toBe("divider");
    
    // Count section blocks (should be 10, one per topic)
    const sectionBlocks = blocks.filter(b => b.type === "section");
    expect(sectionBlocks.length).toBe(10);
    
    // Verify each section contains all bullets (not split)
    const firstSection = sectionBlocks[0].text.text;
    expect(firstSection).toContain("First bullet point");
    expect(firstSection).toContain("Second bullet point");
    expect(firstSection).toContain("Third bullet point");
  });
  
  it("should group all content under each topic header", () => {
    const summary = `## Security Alert

[Discord #security]

- Critical issue reported
- Patch released
- Testing complete

Participants: alice, bob

## General Discussion

[Discord #general]

- Price discussion
- Market update

Participants: carol`;
    
    const blocks = buildDigestBlocks({
      summary,
      start: new Date("2025-09-29T00:00:00Z"),
      end: new Date("2025-09-30T00:00:00Z"),
      dateTitle: "2025-09-29"
    });
    
    // Expected: header + context + divider + (2 topics × 2 blocks) = 6 blocks
    // Topic 1: section + context (no divider between topics to save blocks)
    // Topic 2: section + context
    expect(blocks.length).toBe(6);
    
    // Verify first topic section contains all bullets
    const firstTopicSection = blocks.find((b, i) => i > 2 && b.type === "section");
    expect(firstTopicSection).toBeDefined();
    expect(firstTopicSection.text.text).toContain("Critical issue reported");
    expect(firstTopicSection.text.text).toContain("Patch released");
    expect(firstTopicSection.text.text).toContain("Testing complete");
  });
});
