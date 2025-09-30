"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// main.ts
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = require("./config");
const discord_1 = require("./services/discord");
const adapter_1 = require("./services/discord/adapter");
const discourse_1 = require("./services/discourse");
const gemini_1 = require("./services/llm/gemini");
const slack_1 = require("./services/slack");
const format_1 = require("./utils/format");
const source_link_inject_1 = require("./utils/source_link_inject");
const logger_1 = require("./utils/logger");
const time_1 = require("./utils/time");
const filters_1 = require("./utils/filters");
const participants_fallback_1 = __importDefault(require("./utils/participants_fallback"));
const topics_1 = require("./utils/topics");
const source_labels_1 = require("./utils/source_labels");
dotenv_1.default.config();
const config = (0, config_1.loadConfig)();
const isDebug = config.LOG_LEVEL && config.LOG_LEVEL.toLowerCase() === "debug";
logger_1.logger.info("Synapse Digest Bot starting...");
logger_1.logger.info(`Channels: ${config.DISCORD_CHANNELS.join(", ")}`);
logger_1.logger.info(`Window: ${config.DIGEST_WINDOW_HOURS} hours`);
if (isDebug)
    logger_1.logger.debug("[DEBUG] Log level set to debug");
async function run() {
    // Gather normalized messages from enabled sources
    let normalizedAll = [];
    if (config.DISCORD_ENABLED) {
        logger_1.logger.info("Fetching messages from Discord...");
        const discordRaw = await (0, discord_1.fetchMessages)(config.DISCORD_TOKEN, config.DISCORD_CHANNELS, config.DIGEST_WINDOW_HOURS);
        logger_1.logger.info(`Fetched ${discordRaw.length} messages from Discord.`);
        // normalize Discord messages
        const normalizedDiscord = (0, adapter_1.mapDiscordToNormalized)(discordRaw);
        normalizedAll.push(...normalizedDiscord);
    }
    else {
        logger_1.logger.info("Discord disabled by config.");
    }
    // Discourse: honor explicit enable flag vs incomplete credentials
    if (config.ENABLE_DISCOURSE === false) {
        logger_1.logger.info("Discourse disabled by flag.");
    }
    else if (config.DISCOURSE_ENABLED) {
        logger_1.logger.info("Discourse config detected — fetching messages from Discourse...");
        try {
            const discourseMsgs = await (0, discourse_1.fetchDiscourseMessages)({
                baseUrl: config.DISCOURSE_BASE_URL,
                apiKey: config.DISCOURSE_API_KEY,
                apiUser: config.DISCOURSE_API_USERNAME,
                windowHours: config.DIGEST_WINDOW_HOURS,
                maxTopics: config.DISCOURSE_MAX_TOPICS ?? 50,
                lookbackHours: config.DISCOURSE_LOOKBACK_HOURS,
            });
            logger_1.logger.info(`Fetched ${discourseMsgs.length} messages from Discourse.`);
            normalizedAll.push(...discourseMsgs);
        }
        catch (err) {
            logger_1.logger.warn("Discourse fetch failed; continuing with available messages.", { error: err?.message || err });
        }
    }
    else {
        logger_1.logger.info("Discourse disabled (incomplete credentials).");
    }
    // Group messages by source identifier (Discord channel or Discourse topic).
    // For Discord use channelId; for Discourse use a stable `disc-topic-<id>` key.
    const messagesBySource = new Map();
    for (const m of normalizedAll) {
        const sourceId = m.source === "discord" ? m.channelId : m.topicId ? `disc-topic-${m.topicId}` : m.channelId;
        if (!messagesBySource.has(sourceId)) {
            messagesBySource.set(sourceId, []);
        }
        messagesBySource.get(sourceId).push(m);
    }
    logger_1.logger.info(`Found ${messagesBySource.size} message groups by source.`);
    const allSummaries = [];
    let totalFiltered = 0;
    let totalSummarizedGroups = 0;
    // Process each group independently: filter, (optional) cluster, summarize
    for (const [sourceId, group] of messagesBySource.entries()) {
        // Map to candidateMessages shape and inject source label into channelId
        const candidateGroup = group.map((m) => {
            const sourceLabel = (0, source_labels_1.formatSourceLabel)({
                source: m.source,
                channelId: m.channelId,
                forum: m.forum,
                categoryId: m.categoryId,
            });
            return {
                id: m.id,
                channelId: `${sourceLabel} ${m.channelId || ""}`.trim(),
                author: m.author,
                content: m.content,
                createdAt: m.createdAt,
                url: m.url,
            };
        });
        // Ensure chronological order for clustering assumptions
        candidateGroup.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        // Apply existing filters to this group's messages
        const filteredGroup = (0, filters_1.applyMessageFilters)(candidateGroup, config);
        if (!filteredGroup || filteredGroup.length === 0) {
            if (isDebug)
                logger_1.logger.debug("Skipping group with no messages after filters", { sourceId });
            continue;
        }
        totalFiltered += filteredGroup.length;
        // Summarize per-group (attributed or not)
        let groupSummary = "";
        if (config.ATTRIBUTION_ENABLED) {
            if (isDebug)
                logger_1.logger.debug("Attribution enabled for group", { sourceId, count: filteredGroup.length });
            const clustersForGroup = (0, topics_1.clusterMessages)(filteredGroup, config.TOPIC_GAP_MINUTES);
            if (isDebug)
                logger_1.logger.debug("Built clusters for group", { sourceId, clusterCount: clustersForGroup.length });
            groupSummary = await (0, gemini_1.summarizeAttributed)(clustersForGroup, config);
            if (config.ATTRIBUTION_FALLBACK_ENABLED) {
                if (isDebug)
                    logger_1.logger.debug("Applying attribution fallback for group", { sourceId });
                groupSummary = (0, participants_fallback_1.default)(groupSummary, clustersForGroup, config.MAX_TOPIC_PARTICIPANTS);
            }
        }
        else {
            groupSummary = await (0, gemini_1.summarize)(filteredGroup, config);
        }
        if (groupSummary && groupSummary.trim().length > 0) {
            allSummaries.push(groupSummary);
            totalSummarizedGroups++;
        }
    }
    // Combine all per-source summaries into one digest
    let summary = allSummaries.join("\n\n---\n\n");
    if (isDebug) {
        logger_1.logger.debug("[DEBUG] total.groups.summarized", totalSummarizedGroups);
        logger_1.logger.debug("[DEBUG] total.filtered.messages", totalFiltered);
        logger_1.logger.debug("[DEBUG] summary.raw.len", summary.length);
        logger_1.logger.debug("[DEBUG] summary.raw.preview", summary.slice(0, 1200));
    }
    // Block Kit integration
    logger_1.logger.info("Formatting digest...");
    const lookbackMs = config.DIGEST_WINDOW_HOURS * 60 * 60 * 1000;
    const candidate = new Date(Date.now() - lookbackMs); // now - 24h
    const { start, end, dateTitle } = (0, time_1.getUtcDailyWindowFrom)(candidate);
    // Inject links into the LLM-generated summary where registry metadata exists (configurable).
    const linkedSummary = config.LINKED_SOURCE_LABELS === false ? summary : (0, source_link_inject_1.injectSourceLinks)(summary);
    // Sanitize and dedupe LLM output before formatting for Slack
    const sanitize = (await Promise.resolve().then(() => __importStar(require("./utils/llm_sanitize")))).sanitizeLLMOutput;
    const dedupe = (await Promise.resolve().then(() => __importStar(require("./utils/participants_dedupe")))).collapseDuplicateParticipants;
    let cleaned = sanitize(linkedSummary);
    cleaned = dedupe(cleaned);
    // Sort topics by priority (emoji-based)
    const { sortAndReconstructSummary } = await Promise.resolve().then(() => __importStar(require("./utils/topic_priority")));
    const sortedSummary = sortAndReconstructSummary(cleaned);
    const blocks = (0, format_1.buildDigestBlocks)({
        summary: sortedSummary,
        start,
        end,
        dateTitle,
    });
    const fallback = (0, format_1.formatDigest)(cleaned);
    logger_1.logger.info("Posting digest to Slack...");
    await (0, slack_1.postDigestBlocks)(blocks, fallback, config);
    logger_1.logger.info("Pipeline complete.");
}
run().catch((err) => {
    logger_1.logger.error("Pipeline failed:", err);
    process.exit(1);
});
