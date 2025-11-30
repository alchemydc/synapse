"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscourseSource = void 0;
// src/services/discourse/DiscourseSource.ts
const node_fetch_1 = __importDefault(require("node-fetch"));
const p_retry_1 = __importDefault(require("p-retry"));
const logger_1 = require("../../utils/logger");
const utils_1 = require("./utils");
class DiscourseSource {
    name = "discourse";
    config;
    headers;
    baseUrl;
    constructor(config) {
        this.config = config;
        this.baseUrl = (config.DISCOURSE_BASE_URL || "").replace(/\/+$/, "");
        this.headers = {
            "Api-Key": config.DISCOURSE_API_KEY || "",
            "Api-Username": config.DISCOURSE_API_USERNAME || "",
            Accept: "application/json",
            "User-Agent": "synapse-digest-bot/1.0",
        };
    }
    isEnabled() {
        return this.config.DISCOURSE_ENABLED;
    }
    async fetchMessages(windowHours) {
        if (!this.isEnabled())
            return [];
        const now = Date.now();
        const lookHours = this.config.DISCOURSE_LOOKBACK_HOURS ?? windowHours;
        const since = now - lookHours * 60 * 60 * 1000;
        const maxTopics = this.config.DISCOURSE_MAX_TOPICS ?? 50;
        logger_1.logger.debug(`Discourse fetch: since=${new Date(since).toISOString()} now=${new Date(now).toISOString()} lookHours=${lookHours}`);
        const categoryMap = await this.fetchCategories();
        const messages = [];
        const seenTopicIds = new Set();
        let page = 0;
        let fetchedTopics = 0;
        let stopPaging = false;
        while (!stopPaging) {
            const topics = await this.fetchLatestTopics(page);
            if (topics.length === 0)
                break;
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
                if (seenTopicIds.has(t.id))
                    continue;
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
    async fetchCategories() {
        const map = {};
        try {
            const json = await this.fetchJSON(`${this.baseUrl}/categories.json`);
            const cats = json?.category_list?.categories || json?.categories || [];
            if (Array.isArray(cats)) {
                for (const c of cats) {
                    if (c.id && c.name)
                        map[c.id] = c.name;
                }
            }
        }
        catch (err) {
            logger_1.logger.warn(`Failed to fetch categories: ${err.message}`);
        }
        return map;
    }
    async fetchLatestTopics(page) {
        const url = page === 0 ? `${this.baseUrl}/latest.json` : `${this.baseUrl}/latest.json?page=${page}`;
        try {
            const json = await this.fetchJSON(url);
            return (json?.topic_list?.topics ||
                json?.topics ||
                []);
        }
        catch (err) {
            logger_1.logger.warn(`Failed to fetch topics page ${page}: ${err.message}`);
            return [];
        }
    }
    async processTopic(t, since, categoryMap) {
        const topicId = t.id;
        const topicSlug = t.slug || t.fancy_slug || "";
        const messages = [];
        try {
            const json = await this.fetchJSON(`${this.baseUrl}/t/${topicId}.json`);
            const posts = json?.post_stream?.posts || [];
            const categoryId = json?.category_id ?? t.category_id;
            const forum = new URL(this.baseUrl).hostname;
            for (const p of posts) {
                if (p.updated_at && Date.parse(p.updated_at) < since)
                    continue; // Optimization
                const createdAt = p.created_at;
                const createdTs = Date.parse(createdAt);
                if (isNaN(createdTs) || createdTs < since)
                    continue;
                const content = p.raw ? String(p.raw) : (0, utils_1.stripHtml)(p.cooked || "");
                if (!content || !content.trim())
                    continue;
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
        }
        catch (err) {
            logger_1.logger.warn(`Failed to process topic ${topicId}: ${err.message}`);
        }
        return messages;
    }
    async fetchJSON(url) {
        const res = await (0, p_retry_1.default)(() => (0, node_fetch_1.default)(url, { headers: this.headers }), {
            retries: 3,
        });
        if (!res.ok) {
            throw new Error(`Request failed ${res.status} ${res.statusText}`);
        }
        return res.json();
    }
}
exports.DiscourseSource = DiscourseSource;
