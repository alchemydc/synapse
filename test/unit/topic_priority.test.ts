// test/unit/topic_priority.test.ts

import { describe, it, expect } from "vitest";
import {
  parseTopicsFromSummary,
  sortTopicsByPriority,
  reconstructSummary,
  sortAndReconstructSummary,
  ParsedTopic,
} from "../../src/utils/topic_priority";

describe("topic_priority", () => {
  describe("parseTopicsFromSummary", () => {
    it("should parse topics with emoji prefixes", () => {
      const summary = `*🔴 Security Alert*
Critical vulnerability found

*💰 Funding Update*
New grant awarded`;

      const topics = parseTopicsFromSummary(summary);
      expect(topics).toHaveLength(2);
      expect(topics[0].header).toBe("🔴 Security Alert");
      expect(topics[0].emoji).toBe("🔴");
      expect(topics[0].priority).toBe(1);
      expect(topics[1].header).toBe("💰 Funding Update");
      expect(topics[1].emoji).toBe("💰");
      expect(topics[1].priority).toBe(2);
    });

    it("should parse topics without emoji prefixes", () => {
      const summary = `*Regular Topic*
Some content here

*Another Topic*
More content`;

      const topics = parseTopicsFromSummary(summary);
      expect(topics).toHaveLength(2);
      expect(topics[0].emoji).toBeNull();
      expect(topics[0].priority).toBe(99);
      expect(topics[1].emoji).toBeNull();
      expect(topics[1].priority).toBe(99);
    });

    it("should handle mixed emoji and non-emoji topics", () => {
      const summary = `*🏛️ Governance*
Proposal discussion

*Regular Topic*
No emoji here

*🚀 Growth*
Expansion plans`;

      const topics = parseTopicsFromSummary(summary);
      expect(topics).toHaveLength(3);
      expect(topics[0].priority).toBe(3); // Governance
      expect(topics[1].priority).toBe(99); // No emoji
      expect(topics[2].priority).toBe(6); // Growth
    });

    it("should treat unknown emojis as non-emoji topics", () => {
      const summary = `*🎉 Celebration*
Unknown emoji`;

      const topics = parseTopicsFromSummary(summary);
      expect(topics).toHaveLength(1);
      expect(topics[0].emoji).toBeNull();
      expect(topics[0].priority).toBe(99);
    });

    it("should handle empty summary", () => {
      const topics = parseTopicsFromSummary("");
      expect(topics).toEqual([]);
    });

    it("should treat summary without headers as single topic", () => {
      const summary = "Just some plain text without headers";
      const topics = parseTopicsFromSummary(summary);
      expect(topics).toHaveLength(1);
      expect(topics[0].header).toBe("Summary");
      expect(topics[0].priority).toBe(99);
    });

    it("should preserve topic content including bullet points", () => {
      const summary = `*🔴 Security*
- Vulnerability found
- Patch available
- Update required`;

      const topics = parseTopicsFromSummary(summary);
      expect(topics[0].content).toContain("- Vulnerability found");
      expect(topics[0].content).toContain("- Patch available");
      expect(topics[0].content).toContain("- Update required");
    });

    it("should handle all priority emojis", () => {
      const summary = `*🔴 Security*
Content 1

*💰 Funding*
Content 2

*🏛️ Governance*
Content 3

*💬 Customer Feedback*
Content 4

*📈 Adoption*
Content 5

*🚀 Growth*
Content 6`;

      const topics = parseTopicsFromSummary(summary);
      expect(topics).toHaveLength(6);
      expect(topics.map(t => t.priority)).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  describe("sortTopicsByPriority", () => {
    it("should sort topics by priority (lower number first)", () => {
      const topics: ParsedTopic[] = [
        { header: "Growth", content: "c", emoji: "🚀", priority: 6 },
        { header: "Security", content: "a", emoji: "🔴", priority: 1 },
        { header: "Funding", content: "b", emoji: "💰", priority: 2 },
      ];

      const sorted = sortTopicsByPriority(topics);
      expect(sorted.map(t => t.priority)).toEqual([1, 2, 6]);
      expect(sorted[0].header).toBe("Security");
      expect(sorted[1].header).toBe("Funding");
      expect(sorted[2].header).toBe("Growth");
    });

    it("should maintain stable sort for same priority", () => {
      const topics: ParsedTopic[] = [
        { header: "Topic A", content: "a", emoji: null, priority: 99 },
        { header: "Topic B", content: "b", emoji: null, priority: 99 },
        { header: "Topic C", content: "c", emoji: null, priority: 99 },
      ];

      const sorted = sortTopicsByPriority(topics);
      expect(sorted.map(t => t.header)).toEqual(["Topic A", "Topic B", "Topic C"]);
    });

    it("should not mutate original array", () => {
      const topics: ParsedTopic[] = [
        { header: "B", content: "b", emoji: null, priority: 2 },
        { header: "A", content: "a", emoji: null, priority: 1 },
      ];

      const sorted = sortTopicsByPriority(topics);
      expect(topics[0].header).toBe("B"); // Original unchanged
      expect(sorted[0].header).toBe("A"); // Sorted order
    });
  });

  describe("reconstructSummary", () => {
    it("should reconstruct summary with double newlines between topics", () => {
      const topics: ParsedTopic[] = [
        { header: "Topic 1", content: "*Topic 1*\nContent A", emoji: null, priority: 1 },
        { header: "Topic 2", content: "*Topic 2*\nContent B", emoji: null, priority: 2 },
      ];

      const summary = reconstructSummary(topics);
      expect(summary).toBe("*Topic 1*\nContent A\n\n*Topic 2*\nContent B");
    });

    it("should handle single topic", () => {
      const topics: ParsedTopic[] = [
        { header: "Only Topic", content: "*Only Topic*\nSingle content", emoji: null, priority: 1 },
      ];

      const summary = reconstructSummary(topics);
      expect(summary).toBe("*Only Topic*\nSingle content");
    });

    it("should handle empty topics array", () => {
      const summary = reconstructSummary([]);
      expect(summary).toBe("");
    });
  });

  describe("sortAndReconstructSummary", () => {
    it("should parse, sort, and reconstruct in one call", () => {
      const input = `*🚀 Growth*
Growing fast

*🔴 Security*
Critical issue

*💰 Funding*
New grant`;

      const output = sortAndReconstructSummary(input);
      
      // Should be reordered: Security (1) -> Funding (2) -> Growth (6)
      const lines = output.split("\n\n");
      expect(lines[0]).toContain("🔴 Security");
      expect(lines[1]).toContain("💰 Funding");
      expect(lines[2]).toContain("🚀 Growth");
    });

    it("should handle summary without priority emojis", () => {
      const input = `*Topic A*
Content A

*Topic B*
Content B`;

      const output = sortAndReconstructSummary(input);
      // Without emojis, order should remain the same (all priority 99)
      expect(output).toBe(input);
    });

    it("should handle empty summary", () => {
      const output = sortAndReconstructSummary("");
      expect(output).toBe("");
    });

    it("should handle complex multi-line topics", () => {
      const input = `*📈 Adoption*
- User A joined
- User B started trial
Participants: Alice, Bob

*🔴 Security*
- CVE found
- Patch deployed
Participants: Carol`;

      const output = sortAndReconstructSummary(input);
      
      // Security (1) should come before Adoption (5)
      const securityIndex = output.indexOf("🔴 Security");
      const adoptionIndex = output.indexOf("📈 Adoption");
      expect(securityIndex).toBeLessThan(adoptionIndex);
    });
  });
});
