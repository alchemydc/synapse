// src/services/discourse/index.ts
import fetch from "node-fetch";
import pRetry from "p-retry";

export interface NormalizedMessage {
  id: string;
  source: "discord" | "discourse";
  channelId?: string;
  topicId?: number;
  postId?: number;
  categoryId?: number;
  forum?: string;
  author: string;
  content: string;
  createdAt: string;
  url: string;
}

/**
 * Strip minimal HTML to recover readable plain text.
 * Not perfect, but sufficient for digest input.
 */
function stripHtml(html: string | undefined): string {
  if (!html) return "";
  // remove script/style blocks first
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function headerVal(headers: any, name: string) {
  if (!headers || typeof headers.get !== "function") return undefined;
  return headers.get(name);
}

async function fetchJSON(url: string, headers: Record<string, string>): Promise<{ json: any; rateLimit: { rlLimit: any; rlRemaining: any; rlReset: any }; status: number }> {
  const res: any = await fetch(url, { headers });
  const rlLimit = headerVal(res.headers, "x-ratelimit-limit") || headerVal(res.headers, "X-RateLimit-Limit");
  const rlRemaining =
    headerVal(res.headers, "x-ratelimit-remaining") || headerVal(res.headers, "X-RateLimit-Remaining");
  const rlReset = headerVal(res.headers, "x-ratelimit-reset") || headerVal(res.headers, "X-RateLimit-Reset");

  if (!res.ok) {
    const body = await res.text().catch(() => "<non-text body>");
    const err: any = new Error(`Request failed ${res.status} ${res.statusText}`);
    err.status = res.status;
    err.body = body;
    err.rateLimit = { rlLimit, rlRemaining, rlReset };
    throw err;
  }

  const json = await res.json().catch((e: any) => {
    const err: any = new Error("Failed to parse JSON");
    err.cause = e;
    throw err;
  });

  return { json, rateLimit: { rlLimit, rlRemaining, rlReset }, status: res.status };
}

type FetchDiscourseOptions = {
  baseUrl: string;
  apiKey: string;
  apiUser: string;
  windowHours: number;
  maxTopics?: number; // safety cap
  lookbackHours?: number; // optional override
};

/**
 * Fetch recent Discourse topics and posts, normalize to NormalizedMessage[]
 * Behavior:
 * - Paginate /latest.json?page=N until either no more topics, oldest topic < since, or maxTopics reached.
 * - For each candidate topic, fetch /t/{id}.json and extract post_stream.posts.
 * - Include first post + replies (all posts) that are within the time window.
 *
 * Returns messages sorted ascending by createdAt.
 */
export async function fetchDiscourseMessages(opts: FetchDiscourseOptions): Promise<NormalizedMessage[]> {
  const { baseUrl, apiKey, apiUser, windowHours, maxTopics = 50, lookbackHours } = opts;
  const discoBase = baseUrl.replace(/\/+$/, "");
  const headers = {
    "Api-Key": apiKey || "",
    "Api-Username": apiUser || "",
    Accept: "application/json",
    "User-Agent": "synapse-digest-bot/1.0",
  };

  const now = Date.now();
  const lookHours = lookbackHours ?? windowHours;
  const since = now - lookHours * 60 * 60 * 1000;

  const messages: NormalizedMessage[] = [];
  let page = 0;
  let fetchedTopics = 0;
  let stopPaging = false;
  const seenTopicIds = new Set<number>();

  while (!stopPaging) {
    page++;
    const url = `${discoBase}/latest.json?page=${page}`;

    let latestResp;
    try {
      latestResp = await pRetry(
        () => fetchJSON(url, headers),
        {
          retries: 3,
          onFailedAttempt: (err) => {
            const e = err as any;
            if (e?.cause?.status === 429 || e?.message?.includes("429")) {
              // allow retry backoff
            }
          },
        }
      );
    } catch (err: any) {
      // If page fetch fails, log and stop paging
      console.warn(`Failed to fetch ${url}: ${err?.message || err}. Stopping pagination.`);
      break;
    }

    const data: any = latestResp.json;
    const topics =
      (data && data.topic_list && Array.isArray(data.topic_list.topics) && data.topic_list.topics) ||
      (Array.isArray(data.topics) && data.topics) ||
      [];

    if (!Array.isArray(topics) || topics.length === 0) break;

    for (const t of topics) {
      // Fields vary; try common ones
      const lastPosted = t.last_posted_at || t.created_at || t.last_posted_at;
      const lastTs = lastPosted ? Date.parse(lastPosted) : 0;
      if (lastTs < since) {
        stopPaging = true;
        break;
      }

      fetchedTopics++;
      if (fetchedTopics > maxTopics) {
        stopPaging = true;
        break;
      }

      const topicId = t.id;
      if (seenTopicIds.has(topicId)) {
        // avoid processing duplicate topics across paginated pages (test mocks may repeat)
        continue;
      }
      seenTopicIds.add(topicId);

      const topicSlug = t.slug || t.fancy_slug || "";
      const topicUrl = `${discoBase}/t/${topicSlug}/${topicId}`;

      // fetch topic details
      const topicUrlJson = `${discoBase}/t/${topicId}.json`;
      let topicResp;
      try {
        topicResp = await pRetry(
          () => fetchJSON(topicUrlJson, headers),
          {
            retries: 3,
            onFailedAttempt: () => {
              /* continue retrying on transient failures */
            },
          }
        );
      } catch (err: any) {
        console.warn(`Failed to fetch topic ${topicId}: ${err?.message || err}. Skipping topic.`);
        continue;
      }

      const topicJson: any = topicResp.json;
      const posts = (topicJson && topicJson.post_stream && Array.isArray(topicJson.post_stream.posts) && topicJson.post_stream.posts) || [];
      const categoryId = topicJson?.category_id ?? t?.category_id ?? undefined;
      const forum = (() => {
        try {
          return new URL(discoBase).hostname;
        } catch {
          return discoBase;
        }
      })();

      for (const p of posts) {
        try {
          // skip deleted/hidden posts
          if (p?.deleted_at) continue;
          const createdAt = p.created_at || p.posted_at || p.created || null;
          if (!createdAt) continue;
          const createdTs = Date.parse(createdAt);
          if (isNaN(createdTs)) continue;
          if (createdTs < since) continue;

          const content = p.raw ? String(p.raw) : stripHtml(String(p.cooked || ""));

          if (!content || String(content).trim() === "") continue;

          const author = (p.username || p.name || p.user_name || (p.user && p.user.username) || "unknown") as string;
          const postId = p.id ?? p.post_id ?? undefined;

          const nm: NormalizedMessage = {
            id: `disc-${topicId}-${postId ?? Math.random().toString(36).substring(2, 10)}`,
            source: "discourse",
            channelId: `disc-topic-${topicId}`,
            topicId: Number(topicId),
            postId: postId ? Number(postId) : undefined,
            categoryId: categoryId ? Number(categoryId) : undefined,
            forum,
            author,
            content: String(content).trim(),
            createdAt: new Date(createdTs).toISOString(),
            url: postId ? `${discoBase}/t/${topicSlug}/${topicId}/${postId}` : topicUrl,
          };

          messages.push(nm);
        } catch (err: any) {
          // If a single post normalization fails, skip it but continue processing others.
          console.warn(`Skipping post in topic ${topicId} due to error: ${err?.message || err}`);
          continue;
        }
      }
    }

    // Safety: if topics list indicates no further pages, stop
    if (!Array.isArray(topics) || topics.length === 0) break;
  }

  // sort ascending by createdAt
  messages.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  return messages;
}
