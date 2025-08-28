"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// main.ts
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = require("./config");
const discord_1 = require("./services/discord");
const gemini_1 = require("./services/llm/gemini");
const slack_1 = require("./services/slack");
const format_1 = require("./utils/format");
const logger_1 = require("./utils/logger");
const time_1 = require("./utils/time");
const filters_1 = require("./utils/filters");
dotenv_1.default.config();
const config = (0, config_1.loadConfig)();
logger_1.logger.info("Synapse Digest Bot starting...");
logger_1.logger.info(`Channels: ${config.DISCORD_CHANNELS.join(", ")}`);
logger_1.logger.info(`Window: ${config.DIGEST_WINDOW_HOURS} hours`);
async function run() {
    logger_1.logger.info("Fetching messages from Discord...");
    const messages = await (0, discord_1.fetchMessages)(config.DISCORD_TOKEN, config.DISCORD_CHANNELS, config.DIGEST_WINDOW_HOURS);
    logger_1.logger.info(`Fetched ${messages.length} messages.`);
    logger_1.logger.info("Applying filters...");
    const filteredMessages = (0, filters_1.applyMessageFilters)(messages, config);
    logger_1.logger.info(`Filtered to ${filteredMessages.length} messages.`);
    logger_1.logger.info("Summarizing messages...");
    const summary = await (0, gemini_1.summarize)(filteredMessages, config);
    // Block Kit integration
    logger_1.logger.info("Formatting digest...");
    const { start, end } = (0, time_1.getDigestWindow)(config.DIGEST_WINDOW_HOURS);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const dateTitle = start.toISOString().slice(0, 10); // YYYY-MM-DD
    const blocks = (0, format_1.buildDigestBlocks)({
        summary,
        start,
        end,
        tz,
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
