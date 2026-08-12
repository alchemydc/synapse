import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";

vi.mock("node-fetch", () => {
  return {
    default: vi.fn(),
  };
});

import fetch from "node-fetch";
import { DiscourseSource } from "../../src/services/discourse/DiscourseSource";
import { Config } from "../../src/config";

function makeResp(body: any) {
  return {
    ok: true,
    status: 200,
    headers: { get: (_: string) => undefined },
    text: async () => JSON.stringify(body),
    json: async () => body,
  };
}

const HOUR = 60 * 60 * 1000;

// A post from 60 hours ago: outside an ordinary 24h weekday window, inside the
// 72h window Monday uses to roll up the weekend.
const TOPIC_ID = 4242;
const agedDate = () => new Date(Date.now() - 60 * HOUR).toISOString();

function mockForum() {
  (fetch as unknown as Mock).mockImplementation(async (url: string) => {
    if (url.includes("/latest.json?page=")) {
      return makeResp({ topic_list: { topics: [] } });
    }
    if (url.includes("/latest.json")) {
      return makeResp({
        topic_list: {
          topics: [{ id: TOPIC_ID, slug: "weekend-topic", last_posted_at: agedDate() }],
        },
      });
    }
    if (url.includes(`/t/${TOPIC_ID}.json`)) {
      return makeResp({
        post_stream: {
          posts: [{ id: 1, username: "alice", raw: "Weekend content", created_at: agedDate() }],
        },
        category_id: 5,
      });
    }
    return makeResp({});
  });
}

const config: Partial<Config> = {
  DISCOURSE_ENABLED: true,
  DISCOURSE_BASE_URL: "https://forum.example",
  DISCOURSE_API_KEY: "key",
  DISCOURSE_API_USERNAME: "user",
  DISCOURSE_MAX_TOPICS: 10,
};

describe("Discourse weekend window", () => {
  beforeEach(() => {
    (fetch as unknown as Mock).mockReset();
    mockForum();
  });

  afterEach(() => {
    (fetch as unknown as Mock).mockReset();
  });

  it("reaches weekend content when given Monday's 72h window", async () => {
    const source = new DiscourseSource(config as Config);

    const msgs = await source.fetchMessages(72);

    expect(msgs.length).toBe(1);
    expect(msgs[0].topicId).toBe(TOPIC_ID);
  });

  it("excludes that same content on an ordinary 24h window", async () => {
    const source = new DiscourseSource(config as Config);

    const msgs = await source.fetchMessages(24);

    expect(msgs.length).toBe(0);
  });

  it("uses only the window it is given — there is no forum-specific override", async () => {
    const source = new DiscourseSource(config as Config);

    // Boundary: 60h of content, so 59h misses it and 61h catches it.
    expect((await source.fetchMessages(59)).length).toBe(0);
    expect((await source.fetchMessages(61)).length).toBe(1);
  });
});
