// src/services/discourse/DiscourseSource.ts
import fetch from "node-fetch";
import pRetry from "p-retry";
import { Source } from "../../core/interfaces";
import { NormalizedMessage } from "../../core/types";
import { Config } from "../../config";
import { logger } from "../../utils/logger";
import { stripHtml } from "./utils";
import { DiscourseTopic, DiscoursePost } from "./types";

export class DiscourseSource implements Source {
    name = "discourse";
    private config: Config;
    private headers: Record<string, string>;
    private baseUrl: string;

    constructor(config: Config) {
        this.config = config;
        this.baseUrl = (config.DISCOURSE_BASE_URL || "").replace(/\/+$/, "");
        this.headers = {
            "Api-Key": config.DISCOURSE_API_KEY || "",
            "Api-Username": config.DISCOURSE_API_USERNAME || "",
            Accept: "application/json",
            "User-Agent": "synapse-digest-bot/1.0",
        };
    }

    isEnabled(): boolean {
        return this.config.DISCOURSE_ENABLED;
    }

    async fetchMessages(windowHours: number): Promise<NormalizedMessage[]> {
        if (!this.isEnabled()) return [];

        const now = Date.now();
        const lookHours = this.config.DISCOURSE_LOOKBACK_HOURS ?? windowHours;
        const since = now - lookHours * 60 * 60 * 1000;
        const maxTopics = this.config.DISCOURSE_MAX_TOPICS ?? 50;

        logger.debug(`Discourse fetch: since=${new Date(since).toISOString()} now=${new Date(now).toISOString()} lookHours=${lookHours}`);

        const categoryMap = await this.fetchCategories();
        const messages: NormalizedMessage[] = [];
        const seenTopicIds = new Set<number>();

        let page = 0;
        let fetchedTopics = 0;
        let stopPaging = false;

        while (!stopPaging) {
            const topics = await this.fetchLatestTopics(page);
            if (topics.length === 0) break;

            for (const t of topics) {
                const lastPosted = t.last_posted_at || t.created_at;
                const lastTs = lastPosted ? Date.parse(lastPosted) : 0;
                const isPinned = !!(t.pinned || t.pinned_globally || t.pinned_until);

                if (lastTs < since) {
                    if (isPinned) {
                        // Skip pinned old topics but continue scanning
                        continue;
                    }
                    // Old non-pinned topic: stop paging
                    stopPaging = true;
                    continue;
                }

                fetchedTopics++;
                if (fetchedTopics > maxTopics) {
                    stopPaging = true;
                    break;
                }

                if (seenTopicIds.has(t.id)) continue;
                seenTopicIds.add(t.id);

                const topicMessages = await this.processTopic(t, since, categoryMap);
                messages.push(...topicMessages);
            }

            page++;
        }

        // Sort ascending
        messages.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
        return messages;
    }

    private async fetchCategories(): Promise<Record<number, string>> {
        const map: Record<number, string> = {};
        try {
            const json = await this.fetchJSON(`${this.baseUrl}/categories.json`);
            const cats = json?.category_list?.categories || json?.categories || [];
            if (Array.isArray(cats)) {
                for (const c of cats) {
                    if (c.id && c.name) map[c.id] = c.name;
                }
            }
        } catch (err: any) {
            logger.warn(`Failed to fetch categories: ${err.message}`);
        }
        return map;
    }

    private async fetchLatestTopics(page: number): Promise<DiscourseTopic[]> {
        const url = page === 0 ? `${this.baseUrl}/latest.json` : `${this.baseUrl}/latest.json?page=${page}`;
        try {
            const json = await this.fetchJSON(url);
            return (
                (json?.topic_list?.topics as DiscourseTopic[]) ||
                (json?.topics as DiscourseTopic[]) ||
                []
            );
        } catch (err: any) {
            logger.warn(`Failed to fetch topics page ${page}: ${err.message}`);
            return [];
        }
    }

    private async processTopic(
        t: DiscourseTopic,
        since: number,
        categoryMap: Record<number, string>
    ): Promise<NormalizedMessage[]> {
        const topicId = t.id;
        const topicSlug = t.slug || t.fancy_slug || "";
        const messages: NormalizedMessage[] = [];

        try {
            const json = await this.fetchJSON(`${this.baseUrl}/t/${topicId}.json`);
            const posts = (json?.post_stream?.posts as DiscoursePost[]) || [];
            const categoryId = json?.category_id ?? t.category_id;
            const forum = new URL(this.baseUrl).hostname;

            for (const p of posts) {
                if (p.updated_at && Date.parse(p.updated_at) < since) continue; // Optimization

                const createdAt = p.created_at;
                const createdTs = Date.parse(createdAt);

                if (isNaN(createdTs) || createdTs < since) continue;

                const content = p.raw ? String(p.raw) : stripHtml(p.cooked || "");
                if (!content || !content.trim()) continue;

                messages.push({
                    id: `disc-${topicId}-${p.id}`,
                    source: "discourse",
                    channelId: `disc-topic-${topicId}`,
                    topicId: topicId,
                    topicTitle: t.title,
                    postId: p.id,
                    categoryId: categoryId,
                    categoryName: categoryId ? categoryMap[categoryId] : undefined,
                    forum,
                    author: p.username || p.name || "unknown",
                    content: content.trim(),
                    createdAt: new Date(createdTs).toISOString(),
                    url: `${this.baseUrl}/t/${topicSlug}/${topicId}/${p.id}`,
                });
            }
        } catch (err: any) {
            logger.warn(`Failed to process topic ${topicId}: ${err.message}`);
        }

        return messages;
    }

    private async fetchJSON(url: string): Promise<any> {
        const res = await pRetry(() => fetch(url, { headers: this.headers }), {
            retries: 3,
        });
        if (!res.ok) {
            throw new Error(`Request failed ${res.status} ${res.statusText}`);
        }
        return res.json();
    }
}
