// main.ts
import dotenv from "dotenv";
import { loadConfig } from "./config";
import { logger } from "./utils/logger";
import { DigestPipeline } from "./DigestPipeline";
import { DiscordSource } from "./services/discord/DiscordSource";
import { DiscourseSource } from "./services/discourse/DiscourseSource";
import { SlackDestination } from "./services/slack/SlackDestination";
import { GeminiProcessor } from "./services/llm/GeminiProcessor";

dotenv.config();
const config = loadConfig();

const isDebug = config.LOG_LEVEL && config.LOG_LEVEL.toLowerCase() === "debug";

logger.info("Synapse Digest Bot starting...");
if (isDebug) logger.debug("[DEBUG] Log level set to debug");

async function run() {
  const processor = new GeminiProcessor(config);
  const pipeline = new DigestPipeline(config, processor);

  pipeline.addSource(new DiscordSource(config));
  pipeline.addSource(new DiscourseSource(config));

  pipeline.addDestination(new SlackDestination(config));

  await pipeline.run();
}

run().catch((err) => {
  logger.error("Pipeline failed:", err);
  process.exit(1);
});
