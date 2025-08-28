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
dotenv_1.default.config();
const config = (0, config_1.loadConfig)();
logger_1.logger.info("Synapse Digest Bot starting...");
logger_1.logger.info(`Channels: ${config.DISCORD_CHANNELS.join(", ")}`);
logger_1.logger.info(`Window: ${config.DIGEST_WINDOW_HOURS} hours`);
async function run() {
    logger_1.logger.info("Fetching messages from Discord...");
    const messages = await (0, discord_1.fetchMessages)(config.DISCORD_TOKEN, config.DISCORD_CHANNELS, config.DIGEST_WINDOW_HOURS);
    logger_1.logger.info(`Fetched ${messages.length} messages.`);
    logger_1.logger.info("Summarizing messages...");
    const summary = await (0, gemini_1.summarize)(messages.map(m => m.content), config);
    logger_1.logger.info("Formatting digest...");
    const digest = (0, format_1.formatDigest)(summary);
    logger_1.logger.info("Posting digest to Slack...");
    await (0, slack_1.postDigest)(digest, config);
    logger_1.logger.info("Pipeline complete.");
}
run().catch((err) => {
    logger_1.logger.error("Pipeline failed:", err);
    process.exit(1);
});
