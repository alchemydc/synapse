"use strict";
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
const logger_1 = require("./utils/logger");
const time_1 = require("./utils/time");
const filters_1 = require("./utils/filters");
const participants_fallback_1 = __importDefault(require("./utils/participants_fallback"));
const topics_1 = require("./utils/topics");
dotenv_1.default.config();
const config = (0, config_1.loadConfig)();
logger_1.logger.info("Synapse Digest Bot starting...");
logger_1.logger.info(`Channels: ${config.DISCORD_CHANNELS.join(", ")}`);
logger_1.logger.info(`Window: ${config.DIGEST_WINDOW_HOURS} hours`);
async function run() {
    logger_1.logger.info("Fetching messages from Discord...");
    const discordRaw = await (0, discord_1.fetchMessages)(config.DISCORD_TOKEN, config.DISCORD_CHANNELS, config.DIGEST_WINDOW_HOURS);
    logger_1.logger.info(`Fetched ${discordRaw.length} messages from Discord.`);
    // normalize Discord messages
    const normalizedDiscord = (0, adapter_1.mapDiscordToNormalized)(discordRaw);
    // optionally fetch Discourse messages
    let normalizedAll = [...normalizedDiscord];
    if (config.DISCOURSE_ENABLED) {
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
            logger_1.logger.warn("Discourse fetch failed; continuing with Discord-only messages.", { error: err?.message || err });
        }
    }
    else {
        logger_1.logger.info("Discourse disabled (env incomplete).");
    }
    // Reuse existing filters by mapping NormalizedMessage -> Discord-like MessageDTO shape
    const candidateMessages = normalizedAll.map((m) => ({
        id: m.id,
        channelId: m.channelId || "",
        author: m.author,
        content: m.content,
        createdAt: m.createdAt,
        url: m.url,
    }));
    logger_1.logger.info("Applying filters...");
    const filteredMessages = (0, filters_1.applyMessageFilters)(candidateMessages, config);
    logger_1.logger.info(`Filtered to ${filteredMessages.length} messages.`);
    logger_1.logger.info("Summarizing messages...");
    let summary;
    let clusters = [];
    if (config.ATTRIBUTION_ENABLED) {
        logger_1.logger.info("Attribution enabled — building topic clusters...");
        clusters = (0, topics_1.clusterMessages)(filteredMessages, config.TOPIC_GAP_MINUTES);
        logger_1.logger.info(`Built ${clusters.length} topic clusters for attribution.`);
        summary = await (0, gemini_1.summarizeAttributed)(clusters, config);
        if (config.ATTRIBUTION_FALLBACK_ENABLED) {
            logger_1.logger.info("Attribution fallback enabled — injecting missing participant lines if needed...");
            summary = (0, participants_fallback_1.default)(summary, clusters, config.MAX_TOPIC_PARTICIPANTS);
        }
    }
    else {
        summary = await (0, gemini_1.summarize)(filteredMessages, config);
    }
    // Block Kit integration
    logger_1.logger.info("Formatting digest...");
    const lookbackMs = config.DIGEST_WINDOW_HOURS * 60 * 60 * 1000;
    const candidate = new Date(Date.now() - lookbackMs); // now - 24h
    const { start, end, dateTitle } = (0, time_1.getUtcDailyWindowFrom)(candidate);
    const blocks = (0, format_1.buildDigestBlocks)({
        summary,
        start,
        end,
        dateTitle,
    });
    const fallback = (0, format_1.formatDigest)(summary);
    logger_1.logger.info("Posting digest to Slack...");
    await (0, slack_1.postDigestBlocks)(blocks, fallback, config);
    logger_1.logger.info("Pipeline complete.");
}
run().catch((err) => {
    logger_1.logger.error("Pipeline failed:", err);
    process.exit(1);
});
