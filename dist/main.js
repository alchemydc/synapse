"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// main.ts
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const DigestPipeline_1 = require("./DigestPipeline");
const DiscordSource_1 = require("./services/discord/DiscordSource");
const DiscourseSource_1 = require("./services/discourse/DiscourseSource");
const SlackDestination_1 = require("./services/slack/SlackDestination");
const AiSdkProcessor_1 = require("./services/llm/AiSdkProcessor");
dotenv_1.default.config();
const config = (0, config_1.loadConfig)();
const isDebug = config.LOG_LEVEL && config.LOG_LEVEL.toLowerCase() === "debug";
logger_1.logger.info("Synapse Digest Bot starting...");
if (isDebug)
    logger_1.logger.debug("[DEBUG] Log level set to debug");
async function run() {
    const processor = new AiSdkProcessor_1.AiSdkProcessor(config);
    const pipeline = new DigestPipeline_1.DigestPipeline(config, processor);
    pipeline.addSource(new DiscordSource_1.DiscordSource(config));
    pipeline.addSource(new DiscourseSource_1.DiscourseSource(config));
    pipeline.addDestination(new SlackDestination_1.SlackDestination(config));
    await pipeline.run();
}
run().catch((err) => {
    logger_1.logger.error("Pipeline failed:", err);
    process.exit(1);
});
