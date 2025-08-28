// main.ts
import dotenv from "dotenv";
import { loadConfig, Config } from "./config";
import { fetchMessages } from "./services/discord";
import { summarize } from "./services/llm/gemini";
import { postDigest } from "./services/slack";
import { formatDigest } from "./utils/format";
import { logger } from "./utils/logger";

dotenv.config();
const config: Config = loadConfig();

logger.info("Synapse Digest Bot starting...");
logger.info(`Channels: ${config.DISCORD_CHANNELS.join(", ")}`);
logger.info(`Window: ${config.DIGEST_WINDOW_HOURS} hours`);

async function run() {
  logger.info("Fetching messages from Discord...");
  const messages = await fetchMessages(
    config.DISCORD_TOKEN,
    config.DISCORD_CHANNELS,
    config.DIGEST_WINDOW_HOURS
  );
  logger.info(`Fetched ${messages.length} messages.`);
  logger.info("Summarizing messages...");
  const summary = await summarize(messages.map(m => m.content), config);
  logger.info("Formatting digest...");
  const digest = formatDigest(summary);
  logger.info("Posting digest to Slack...");
  await postDigest(digest, config);
  logger.info("Pipeline complete.");
}

run().catch((err) => {
  logger.error("Pipeline failed:", err);
  process.exit(1);
});
