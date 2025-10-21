"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// main.ts
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = require("./config");
const discord_1 = require("./services/discord");
const discourse_1 = require("./services/discourse");
const gemini_1 = require("./services/llm/gemini");
const slack_1 = require("./services/slack");
const format_1 = require("./utils/format");
const logger_1 = require("./utils/logger");
const time_1 = require("./utils/time");
const filters_1 = require("./utils/filters");
dotenv_1.default.config();
const config = (0, config_1.loadConfig)();
const isDebug = config.LOG_LEVEL && config.LOG_LEVEL.toLowerCase() === "debug";
logger_1.logger.info("Synapse Digest Bot starting...");
logger_1.logger.info(`Discord channels: ${config.DISCORD_CHANNELS.join(", ")}`);
logger_1.logger.info(`Window: ${config.DIGEST_WINDOW_HOURS} hours`);
if (isDebug)
    logger_1.logger.debug("[DEBUG] Log level set to debug");
async function run() {
    const summaries = [];
    const { start, end, dateTitle } = (0, time_1.getUtcDailyWindowFrom)(new Date());
    // === DISCORD CHANNELS ===
    if (config.DISCORD_ENABLED) {
        logger_1.logger.info(`Fetching from ${config.DISCORD_CHANNELS.length} Discord channels...`);
        const allDiscordMessages = await (0, discord_1.fetchMessages)(config.DISCORD_TOKEN, config.DISCORD_CHANNELS, config.DIGEST_WINDOW_HOURS);
        logger_1.logger.info(`Fetched ${allDiscordMessages.length} total Discord messages.`);
        // Group messages by channel
        const messagesByChannel = new Map();
        for (const msg of allDiscordMessages) {
            if (!messagesByChannel.has(msg.channelId)) {
                messagesByChannel.set(msg.channelId, []);
            }
            messagesByChannel.get(msg.channelId).push(msg);
        }
        logger_1.logger.info(`Processing ${messagesByChannel.size} Discord channels...`);
        for (const [channelId, messages] of messagesByChannel) {
            const filtered = (0, filters_1.applyMessageFilters)(messages, config);
            if (filtered.length === 0) {
                logger_1.logger.info(`No messages after filtering for channel ${channelId}`);
                continue;
            }
            // Channel name and guildId already fetched by Discord API
            const channelName = filtered[0].channelName || channelId;
            const guildId = filtered[0].url?.split('/')[4] || 'unknown';
            if (isDebug) {
                logger_1.logger.debug("Fetched messages for channel (debug)", {
                    channelId,
                    channelName,
                    count: filtered.length,
                    messages: filtered.map(m => ({
                        id: m.id,
                        author: m.author,
                        createdAt: m.createdAt,
                        content: (m.content || "").slice(0, 500)
                    }))
                });
            }
            logger_1.logger.info(`Summarizing ${filtered.length} messages from #${channelName}...`);
            const summary = await (0, gemini_1.summarizeDiscordChannel)(filtered, channelName, channelId, guildId, config);
            if (summary.trim()) {
                summaries.push(summary);
            }
        }
    }
    else {
        logger_1.logger.info("Discord disabled by config.");
    }
    // === DISCOURSE FORUM ===
    if (config.ENABLE_DISCOURSE === false) {
        logger_1.logger.info("Discourse disabled by flag.");
    }
    else if (config.DISCOURSE_ENABLED) {
        logger_1.logger.info("Fetching from Discourse forum...");
        try {
            const forumMessages = await (0, discourse_1.fetchDiscourseMessages)({
                baseUrl: config.DISCOURSE_BASE_URL,
                apiKey: config.DISCOURSE_API_KEY,
                apiUser: config.DISCOURSE_API_USERNAME,
                windowHours: config.DIGEST_WINDOW_HOURS,
                maxTopics: config.DISCOURSE_MAX_TOPICS ?? 50,
                lookbackHours: config.DISCOURSE_LOOKBACK_HOURS,
            });
            logger_1.logger.info(`Fetched ${forumMessages.length} messages from Discourse.`);
            // Group by topicId
            const topicGroups = new Map();
            for (const msg of forumMessages) {
                if (!msg.topicId)
                    continue;
                if (!topicGroups.has(msg.topicId)) {
                    topicGroups.set(msg.topicId, []);
                }
                topicGroups.get(msg.topicId).push(msg);
            }
            logger_1.logger.info(`Processing ${topicGroups.size} forum topics...`);
            for (const [topicId, messages] of topicGroups) {
                const filtered = (0, filters_1.applyMessageFilters)(messages, config);
                if (filtered.length === 0) {
                    logger_1.logger.info(`No messages after filtering for topic ${topicId}`);
                    continue;
                }
                if (isDebug) {
                    logger_1.logger.debug("Fetched messages for topic (debug)", {
                        topicId,
                        topicTitle: filtered[0].topicTitle,
                        count: filtered.length,
                        messages: filtered.map(m => ({
                            id: m.id,
                            author: m.author,
                            createdAt: m.createdAt,
                            content: (m.content || "").slice(0, 500)
                        }))
                    });
                }
                // Topic info from first message
                const topicTitle = filtered[0].topicTitle || `Topic ${topicId}`;
                const topicUrl = filtered[0].url;
                logger_1.logger.info(`Summarizing topic: ${topicTitle}...`);
                const summary = await (0, gemini_1.summarizeDiscourseTopic)(filtered, topicTitle, topicUrl, config);
                if (summary.trim()) {
                    summaries.push(summary);
                }
            }
        }
        catch (err) {
            logger_1.logger.error("Discourse fetch failed:", err);
            throw err; // Fail entire run as per user requirement
        }
    }
    else {
        logger_1.logger.info("Discourse disabled (incomplete credentials).");
    }
    // === FORMAT AND POST TO SLACK ===
    if (summaries.length === 0) {
        logger_1.logger.info("No summaries generated, skipping Slack post");
        return;
    }
    logger_1.logger.info(`Formatting ${summaries.length} summaries for Slack...`);
    const combinedSummary = summaries.join('\n\n---\n\n');
    const blockSets = (0, format_1.buildDigestBlocks)({
        summary: combinedSummary,
        start,
        end,
        dateTitle,
    });
    const fallback = (0, format_1.formatDigest)(combinedSummary);
    logger_1.logger.info("Posting digest to Slack...");
    if (blockSets.length > 1) {
        logger_1.logger.info(`Digest split into ${blockSets.length} messages due to block count`);
    }
    for (let i = 0; i < blockSets.length; i++) {
        const blocks = blockSets[i];
        const messageFallback = blockSets.length > 1
            ? `${fallback} (Part ${i + 1}/${blockSets.length})`
            : fallback;
        logger_1.logger.info(`Posting message ${i + 1}/${blockSets.length}...`);
        await (0, slack_1.postDigestBlocks)(blocks, messageFallback, config);
    }
    logger_1.logger.info("Pipeline complete.");
}
run().catch((err) => {
    logger_1.logger.error("Pipeline failed:", err);
    process.exit(1);
});
