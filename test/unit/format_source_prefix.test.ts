import { describe, it, expect } from "vitest";
import { buildDigestBlocks, normalizeToSlackMrkdwn } from "../../src/utils/format";

describe("Formatter preserves bracketed source prefixes", () => {
  it("normalizeToSlackMrkdwn leaves leading [Discord ...] intact", () => {
    const input = "[Discord #general] New feature discussion\n- We discussed rollout\n\nParticipants: alice, bob";
    const out = normalizeToSlackMrkdwn(input);
    expect(out).toContain("[Discord #general] New feature discussion");
  });

  it("buildDigestBlocks renders section containing the bracketed label", () => {
    const summary = "[Forum category:12] Proposal: Improve docs\nDetails about proposal\n\nParticipants: carol";
    const start = new Date();
    const end = new Date();
    const blockSets = buildDigestBlocks({ summary, start, end, dateTitle: "2025-09-23" });
    const blocks = blockSets[0];
    // find first section block with mrkdwn
    const section = blocks.find(b => b.type === "section" && b.text && b.text.type === "mrkdwn");
    expect(section).toBeDefined();
    const text = section!.text.text as string;
    expect(text).toContain("[Forum category:12] Proposal: Improve docs");
  });
});
