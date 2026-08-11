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

// A post from 80 hours ago: outside a 36h lookback, inside 36h + 48h of
// weekend catch-up. This is the exact case where a configured
// DISCOURSE_LOOKBACK_HOURS could silently swallow Monday's extension.
const TOPIC_ID = 4242;
const agedDate = () => new Date(Date.now() - 80 * HOUR).toISOString();

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

const baseConfig: Partial<Config> = {
  DISCOURSE_ENABLED: true,
  DISCOURSE_BASE_URL: "https://forum.example",
  DISCOURSE_API_KEY: "key",
  DISCOURSE_API_USERNAME: "user",
  DISCOURSE_MAX_TOPICS: 10,
};

describe("Discourse weekend extension", () => {
  beforeEach(() => {
    (fetch as unknown as Mock).mockReset();
    mockForum();
  });

  afterEach(() => {
    (fetch as unknown as Mock).mockReset();
  });

  it("stacks the extension on top of DISCOURSE_LOOKBACK_HOURS", async () => {
    const source = new DiscourseSource({
      ...baseConfig,
      DISCOURSE_LOOKBACK_HOURS: 36,
    } as Config);

    // 36h override + 48h weekend catch-up = 84h, so the 80h-old post is in.
    const msgs = await source.fetchMessages(24, 48);

    expect(msgs.length).toBe(1);
    expect(msgs[0].topicId).toBe(TOPIC_ID);
  });

  it("honours the override alone when there is no extension", async () => {
    const source = new DiscourseSource({
      ...baseConfig,
      DISCOURSE_LOOKBACK_HOURS: 36,
    } as Config);

    const msgs = await source.fetchMessages(24, 0);

    expect(msgs.length).toBe(0);
  });

  it("stacks the extension on the base window when no override is set", async () => {
    const source = new DiscourseSource({ ...baseConfig } as Config);

    // 24h base + 48h = 72h, which does not reach an 80h-old post.
    expect((await source.fetchMessages(24, 48)).length).toBe(0);
    // 36h base + 48h = 84h, which does.
    expect((await source.fetchMessages(36, 48)).length).toBe(1);
  });

  it("defaults extraHours to zero when the argument is omitted", async () => {
    const source = new DiscourseSource({
      ...baseConfig,
      DISCOURSE_LOOKBACK_HOURS: 96,
    } as Config);

    const msgs = await source.fetchMessages(24);

    expect(msgs.length).toBe(1);
  });
});
