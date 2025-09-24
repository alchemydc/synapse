import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("node-fetch", () => {
  return {
    default: vi.fn(),
  };
});

import fetch from "node-fetch";
import { fetchDiscourseMessages } from "../../src/services/discourse";

function makeResp(body: any) {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (_: string) => undefined,
    },
    text: async () => JSON.stringify(body),
    json: async () => body,
  };
}

describe("Discourse pagination & pinned topic handling", () => {
  beforeEach(() => {
    (fetch as unknown as any).mockReset();
  });

  afterEach(() => {
    (fetch as unknown as any).mockReset();
  });

  it("processes fresh non-pinned topic when an old pinned topic appears first", async () => {
    const pinnedId = 1000;
    const freshId = 2000;
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
    const freshDate = new Date().toISOString();

    const latestJson = {
      topic_list: {
        topics: [
          { id: pinnedId, slug: "pinned-topic", last_posted_at: oldDate, pinned: true },
          { id: freshId, slug: "fresh-topic", last_posted_at: freshDate },
        ],
      },
    };

    const topicJsonFresh = {
      post_stream: {
        posts: [
          { id: 1, username: "alice", raw: "Fresh content", created_at: freshDate },
        ],
      },
      category_id: 5,
    };

    (fetch as unknown as any).mockImplementation(async (url: string) => {
      if (url.includes("/latest.json")) {
        return makeResp(latestJson);
      }
      if (url.includes(`/t/${freshId}.json`)) {
        return makeResp(topicJsonFresh);
      }
      return makeResp({});
    });

    const msgs = await fetchDiscourseMessages({
      baseUrl: "https://forum.example",
      apiKey: "key",
      apiUser: "user",
      windowHours: 24,
      maxTopics: 10,
    });

    // pinned old should be skipped, fresh topic processed
    expect(Array.isArray(msgs)).toBe(true);
    expect(msgs.length).toBe(1);
    expect(msgs[0].topicId).toBe(freshId);
    expect(msgs[0].postId).toBe(1);
  });

  it("stops paging after encountering a non-pinned old topic following a fresh topic (no page=1 fetch)", async () => {
    const freshId = 3000;
    const oldNonPinnedId = 3001;
    const freshDate = new Date().toISOString();
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const latestJson = {
      topic_list: {
        topics: [
          { id: freshId, slug: "fresh-topic-2", last_posted_at: freshDate },
          { id: oldNonPinnedId, slug: "old-topic", last_posted_at: oldDate, pinned: false },
        ],
      },
    };

    const topicJsonFresh = {
      post_stream: {
        posts: [{ id: 11, username: "carol", raw: "Fresh2 content", created_at: freshDate }],
      },
      category_id: 7,
    };

    (fetch as unknown as any).mockImplementation(async (url: string) => {
      if (url.includes("/latest.json")) {
        return makeResp(latestJson);
      }
      if (url.includes(`/t/${freshId}.json`)) {
        return makeResp(topicJsonFresh);
      }
      // If code attempts to fetch page=1, return a sentinel response so we can detect it via call history
      return makeResp({});
    });

    const msgs = await fetchDiscourseMessages({
      baseUrl: "https://forum.example",
      apiKey: "key",
      apiUser: "user",
      windowHours: 24,
      maxTopics: 10,
    });

    // Only fresh topic posts should be present
    expect(msgs.length).toBe(1);
    expect(msgs[0].topicId).toBe(freshId);

    // Ensure no fetch call contained '?page=1'
    const calls = (fetch as unknown as vi.Mock).mock.calls.map((c: any[]) => String(c[0] || ""));
    const page1Calls = calls.filter((u: string) => u.includes("page=1"));
    expect(page1Calls.length).toBe(0);
  });

  it("skips pinned old, processes fresh, and stops paging when later non-pinned old is present on same page (no page=1 fetch)", async () => {
    const pinnedId = 4000;
    const freshId = 4001;
    const oldNonPinnedId = 4002;
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const freshDate = new Date().toISOString();

    const latestJson = {
      topic_list: {
        topics: [
          { id: pinnedId, slug: "pinned-old", last_posted_at: oldDate, pinned: true },
          { id: freshId, slug: "fresh-after-pinned", last_posted_at: freshDate },
          { id: oldNonPinnedId, slug: "old-non-pinned", last_posted_at: oldDate, pinned: false },
        ],
      },
    };

    const topicJsonFresh = {
      post_stream: {
        posts: [{ id: 21, username: "dave", raw: "Fresh after pinned", created_at: freshDate }],
      },
      category_id: 9,
    };

    (fetch as unknown as any).mockImplementation(async (url: string) => {
      if (url.includes("/latest.json")) {
        return makeResp(latestJson);
      }
      if (url.includes(`/t/${freshId}.json`)) {
        return makeResp(topicJsonFresh);
      }
      return makeResp({});
    });

    const msgs = await fetchDiscourseMessages({
      baseUrl: "https://forum.example",
      apiKey: "key",
      apiUser: "user",
      windowHours: 24,
      maxTopics: 10,
    });

    // Fresh topic should be processed; no page=1 fetch
    expect(msgs.length).toBe(1);
    expect(msgs[0].topicId).toBe(freshId);

    const calls = (fetch as unknown as vi.Mock).mock.calls.map((c: any[]) => String(c[0] || ""));
    const page1Calls = calls.filter((u: string) => u.includes("page=1"));
    expect(page1Calls.length).toBe(0);
  });
});
