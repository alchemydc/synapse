// test/unit/format_block_budget.test.ts
import { describe, it, expect } from "vitest";
import { buildDigestBlocks } from "../../src/utils/format";

const start = new Date("2025-09-29T00:00:00Z");
const end = new Date("2025-09-30T00:00:00Z");
const dateTitle = "2025-09-29";

describe("buildDigestBlocks — block budget enforcement", () => {
  it("returns a single block array when total blocks < 45", () => {
    // Create a digest with 5 topics (should be ~13 blocks: 3 header + 10 topic blocks)
    const topics = [];
    for (let i = 1; i <= 5; i++) {
      topics.push(`*Topic ${i}*
[Discord #channel-${i}]
- Point about topic ${i}
Participants: user${i}`);
    }
    
    const summary = topics.join("\n\n");
    const blockSets = buildDigestBlocks({ summary, start, end, dateTitle });
    
    // Should return single block array
    expect(blockSets).toHaveLength(1);
    expect(Array.isArray(blockSets[0])).toBe(true);
    
    const blocks = blockSets[0];
    // 3 header blocks + 5 topics * (1 section + 1 context) blocks
    // But topics are grouped into single section without separate participants
    expect(blocks.length).toBeGreaterThan(3);
    expect(blocks.length).toBeLessThan(20);
  });

  it("splits into multiple block arrays when topics exceed 45-block budget", () => {
    // Create 25 topics (would be ~53 blocks: 3 header + 50 topic blocks)
    // Should split into 2 messages
    const topics = [];
    for (let i = 1; i <= 25; i++) {
      topics.push(`*Topic ${i}*
[Discord #channel-${i}]
- Point about topic ${i}
Participants: user${i}`);
    }
    
    const summary = topics.join("\n\n");
    const blockSets = buildDigestBlocks({ summary, start, end, dateTitle });
    
    // Should split into multiple messages
    expect(blockSets.length).toBeGreaterThan(1);
    
    // Each block set should be under 45 blocks
    for (const blocks of blockSets) {
      expect(blocks.length).toBeLessThanOrEqual(45);
    }
    
    // First message should have standard header
    const firstBlocks = blockSets[0];
    expect(firstBlocks[0].type).toBe("header");
    expect(firstBlocks[0].text.text).toContain("Community Digest — 2025-09-29 (UTC)");
    expect(firstBlocks[0].text.text).not.toContain("[continued]");
    
    // Subsequent messages should have "[continued]" in header
    if (blockSets.length > 1) {
      const secondBlocks = blockSets[1];
      expect(secondBlocks[0].type).toBe("header");
      expect(secondBlocks[0].text.text).toContain("[continued]");
    }
  });

  it("distributes exactly 21 topics optimally (42 blocks per message)", () => {
    // 21 topics = 42 topic blocks + 3 header = 45 blocks (exactly at budget)
    const topics = [];
    for (let i = 1; i <= 21; i++) {
      topics.push(`*Topic ${i}*
[Discord #channel]
- Detail for topic ${i}
Participants: user${i}`);
    }
    
    const summary = topics.join("\n\n");
    const blockSets = buildDigestBlocks({ summary, start, end, dateTitle });
    
    // Should fit in single message
    expect(blockSets).toHaveLength(1);
    const blocks = blockSets[0];
    
    // 3 header + 21 topics * 2 blocks each = 45 blocks (at budget limit)
    // Actually 44 because last topic might not have trailing newlines
    expect(blocks.length).toBeGreaterThanOrEqual(44);
    expect(blocks.length).toBeLessThanOrEqual(45);
  });

  it("splits 30 topics into 2 messages efficiently", () => {
    // 30 topics = 60 topic blocks
    // Should split: Message 1 gets 21 topics (42 blocks + 3 header = 45)
    //               Message 2 gets 9 topics (18 blocks + 3 header = 21)
    const topics = [];
    for (let i = 1; i <= 30; i++) {
      topics.push(`*Topic ${i}*
[Discord #channel]
- Detail ${i}
Participants: user${i}`);
    }
    
    const summary = topics.join("\n\n");
    const blockSets = buildDigestBlocks({ summary, start, end, dateTitle });
    
    // Should split into 2 messages
    expect(blockSets).toHaveLength(2);
    
    // First message should be at or near budget
    expect(blockSets[0].length).toBeLessThanOrEqual(45);
    expect(blockSets[0].length).toBeGreaterThan(40); // Should be close to max
    
    // Second message should have remainder
    expect(blockSets[1].length).toBeLessThanOrEqual(45);
    expect(blockSets[1].length).toBeGreaterThan(3); // More than just header
  });

  it("handles topics without participants (1 block per topic)", () => {
    // Topics with no participants use only 1 block per topic
    const topics = [];
    for (let i = 1; i <= 42; i++) {
      topics.push(`*Topic ${i}*
[Discord #channel]
- Detail ${i}`);
    }
    
    const summary = topics.join("\n\n");
    const blockSets = buildDigestBlocks({ summary, start, end, dateTitle });
    
    // 42 topics * 1 block + 3 header = 45 blocks (exactly at budget)
    expect(blockSets).toHaveLength(1);
    expect(blockSets[0].length).toBe(45);
  });

  it("preserves all topics across split messages", () => {
    // Create 35 topics and verify all are included after split
    const topics = [];
    for (let i = 1; i <= 35; i++) {
      topics.push(`*Unique Topic ${i}*
[Discord #channel]
- Unique detail ${i}
Participants: user${i}`);
    }
    
    const summary = topics.join("\n\n");
    const blockSets = buildDigestBlocks({ summary, start, end, dateTitle });
    
    // Collect all section blocks across all messages
    const allSections = blockSets.flatMap(blocks => 
      blocks.filter(b => b.type === "section")
    );
    
    // Should have 35 section blocks (one per topic)
    expect(allSections.length).toBe(35);
    
    // Verify each topic is present
    for (let i = 1; i <= 35; i++) {
      const found = allSections.some(s => 
        s.text.text.includes(`Unique Topic ${i}`)
      );
      expect(found).toBe(true);
    }
  });

  it("includes header blocks in all split messages", () => {
    // Create enough topics to force split
    const topics = [];
    for (let i = 1; i <= 30; i++) {
      topics.push(`*Topic ${i}*
[Discord #channel]
- Detail
Participants: user${i}`);
    }
    
    const summary = topics.join("\n\n");
    const blockSets = buildDigestBlocks({ summary, start, end, dateTitle });
    
    // Each message should have header structure
    for (const blocks of blockSets) {
      expect(blocks[0].type).toBe("header");
      expect(blocks[1].type).toBe("context");
      expect(blocks[2].type).toBe("divider");
      
      // Verify time range in context
      expect(blocks[1].elements[0].text).toContain("Time window");
    }
  });

  it("works with legacy format (no topic headers)", () => {
    // Legacy format without topic headers should still return array of arrays
    const summary = `First paragraph about something.

Second paragraph with more details.

Third paragraph conclusion.

Participants: alice, bob`;
    
    const blockSets = buildDigestBlocks({ summary, start, end, dateTitle });
    
    // Should return array of block arrays even for legacy format
    expect(Array.isArray(blockSets)).toBe(true);
    expect(Array.isArray(blockSets[0])).toBe(true);
    
    // Should have header blocks
    expect(blockSets[0][0].type).toBe("header");
  });

  it("handles empty summary gracefully", () => {
    const summary = "";
    const blockSets = buildDigestBlocks({ summary, start, end, dateTitle });
    
    // Should return array with one block array containing just headers
    expect(blockSets).toHaveLength(1);
    expect(blockSets[0][0].type).toBe("header");
    expect(blockSets[0][1].type).toBe("context");
    expect(blockSets[0][2].type).toBe("divider");
    
    // Should not have any section blocks
    const sections = blockSets[0].filter(b => b.type === "section");
    expect(sections.length).toBe(0);
  });

  it("respects 45-block limit even with varying topic sizes", () => {
    // Mix of topics with and without participants
    const topics = [];
    for (let i = 1; i <= 50; i++) {
      if (i % 3 === 0) {
        // No participants (1 block)
        topics.push(`*Topic ${i}*
[Discord #channel]
- Detail ${i}`);
      } else {
        // With participants (2 blocks)
        topics.push(`*Topic ${i}*
[Discord #channel]
- Detail ${i}
Participants: user${i}`);
      }
    }
    
    const summary = topics.join("\n\n");
    const blockSets = buildDigestBlocks({ summary, start, end, dateTitle });
    
    // Verify no message exceeds budget
    for (const blocks of blockSets) {
      expect(blocks.length).toBeLessThanOrEqual(45);
    }
    
    // Verify all topics are preserved
    const totalSections = blockSets.reduce((sum, blocks) => 
      sum + blocks.filter(b => b.type === "section").length, 0
    );
    expect(totalSections).toBe(50);
  });
});
