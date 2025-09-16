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

describe("Discourse normalization", () => {
  beforeEach(() => {
    (fetch as unknown as vi.Mock).mockReset();
  });

  afterEach(() => {
    (fetch as unknown as vi.Mock).mockReset();
  });

  it("fetches latest topics and normalizes posts (first post + replies)", async () => {
    const topicId = 123;
    const post1 = {
      id: 1,
      username: "alice",
      raw: "First post content",
      created_at: new Date().toISOString(),
    };
    const post2 = {
      id: 2,
      username: "bob",
      cooked: "<p>Reply content</p>",
      created_at: new Date().toISOString(),
    };

    const latestJson = {
      topic_list: {
        topics: [
          {
            id: topicId,
            slug: "test-topic",
            last_posted_at: new Date().toISOString(),
          },
        ],
      },
    };

    const topicJson = {
      post_stream: {
        posts: [post1, post2],
      },
      category_id: 5,
    };

    // Mock sequence: /latest.json -> topic.json
    (fetch as unknown as vi.Mock).mockImplementation(async (url: string) => {
      if (url.includes("/latest.json")) {
        return makeResp(latestJson);
      }
      if (url.endsWith(`/${topicId}.json`) || url.includes(`/t/${topicId}.json`)) {
        return makeResp(topicJson);
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

    // should include two normalized messages
    expect(Array.isArray(msgs)).toBe(true);
    expect(msgs.length).toBe(2);

    const [m1, m2] = msgs;
    expect(m1.source).toBe("discourse");
    expect(m1.topicId).toBe(topicId);
    expect(m1.postId).toBe(1);
    expect(m1.author).toBe("alice");
    expect(m1.content).toContain("First post content");
    expect(m1.channelId).toBe(`disc-topic-${topicId}`);
    expect(m1.url).toContain(`/t/test-topic/${topicId}/1`);

    expect(m2.postId).toBe(2);
    expect(m2.author).toBe("bob");
    expect(m2.content).toContain("Reply content");
  });
});
