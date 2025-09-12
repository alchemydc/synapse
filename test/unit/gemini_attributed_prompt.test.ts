import { describe, it, expect } from "vitest";
import { buildAttributedPrompt } from "../../src/services/llm/gemini";
import { TopicCluster } from "../../src/utils/topics";
import { Config } from "../../src/config";

const dummyConfig = {
  GEMINI_MODEL: "gemini-2.0-flash",
  MAX_SUMMARY_TOKENS: 512,
  // rest not needed for prompt building in test
} as unknown as Config;

describe("buildAttributedPrompt", () => {
  it("includes Topic headers, Participants lines, and message lines", () => {
    const clusters: TopicCluster[] = [
      {
        id: 1,
        channelId: "chan1",
        start: new Date().toISOString(),
        end: new Date().toISOString(),
        messages: [
          { id: "m1", channelId: "chan1", author: "alice", content: "Alpha discussion", createdAt: new Date().toISOString(), url: "" },
          { id: "m2", channelId: "chan1", author: "bob", content: "Followup on alpha", createdAt: new Date().toISOString(), url: "" },
        ],
        participants: ["alice", "bob"],
      },
      {
        id: 2,
        channelId: "chan2",
        start: new Date().toISOString(),
        end: new Date().toISOString(),
        messages: [
          { id: "m3", channelId: "chan2", author: "carol", content: "Beta issue", createdAt: new Date().toISOString(), url: "" },
        ],
        participants: ["carol"],
      },
    ];

    const prompt = buildAttributedPrompt(clusters, dummyConfig);
    expect(prompt).toContain("Topic 1:");
    expect(prompt).toContain("Topic 2:");
    expect(prompt).toContain("Participants: alice, bob");
    expect(prompt).toContain("Participants: carol");
    // message lines present
    expect(prompt.match(/\[1\]\s*\[/g)?.length).toBeGreaterThanOrEqual(2); // at least two topic blocks with message lines
  });
});
