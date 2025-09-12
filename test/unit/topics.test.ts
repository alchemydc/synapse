import { describe, it, expect } from "vitest";
import { clusterMessages, extractParticipants, formatParticipantList } from "../../src/utils/topics";
import { MessageDTO } from "../../src/services/discord";

function msg(channel: string, author: string, iso: string, content = ""): MessageDTO {
  return {
    id: `${channel}-${iso}`,
    channelId: channel,
    author,
    content,
    createdAt: iso,
    url: "",
  };
}

describe("topics utils", () => {
  it("clusterMessages splits on time gaps and channel changes", () => {
    const base = Date.now();
    const a = new Date(base).toISOString();
    const b = new Date(base + 5 * 60 * 1000).toISOString(); // +5m
    const c = new Date(base + 30 * 60 * 1000).toISOString(); // +30m -> gap
    const d = new Date(base + 31 * 60 * 1000).toISOString(); // +31m same channel as c

    const messages = [
      msg("chan1", "alice", a, "first"),
      msg("chan1", "bob", b, "followup"),
      msg("chan1", "carol", c, "later"),
      msg("chan2", "dave", d, "other channel"),
    ];

    const clusters = clusterMessages(messages, 20); // 20 minute gap
    expect(clusters.length).toBe(3);
    expect(clusters[0].channelId).toBe("chan1");
    expect(clusters[0].messages.length).toBe(2); // a,b
    expect(clusters[1].messages.length).toBe(1); // c
    expect(clusters[2].channelId).toBe("chan2");
  });

  it("extractParticipants preserves first-seen order and dedups", () => {
    const now = Date.now();
    const m1 = msg("c", "alice", new Date(now).toISOString());
    const m2 = msg("c", "bob", new Date(now + 1000).toISOString());
    const m3 = msg("c", "alice", new Date(now + 2000).toISOString());
    const cluster = {
      id: 1,
      channelId: "c",
      start: m1.createdAt,
      end: m3.createdAt,
      messages: [m1, m2, m3],
      participants: [],
    } as any;
    const participants = extractParticipants(cluster);
    expect(participants).toEqual(["alice", "bob"]);
  });

  it("formatParticipantList shows overflow with +N", () => {
    const list = ["a","b","c","d","e","f","g"];
    expect(formatParticipantList(list, 6)).toBe("a, b, c, d, e, f +1");
    expect(formatParticipantList(list.slice(0,3), 6)).toBe("a, b, c");
    expect(formatParticipantList([], 4)).toBe("");
  });
});
