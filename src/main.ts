// main.ts
import dotenv from "dotenv";
import { loadConfig, Config } from "./config";
import { fetchMessages } from "./services/discord";
import { summarize } from "./services/llm/gemini";
import { postDigestBlocks } from "./services/slack";
import { formatDigest, buildDigestBlocks } from "./utils/format";
import { logger } from "./utils/logger";
import { getUtcDailyWindowFrom } from "./utils/time";
import { applyMessageFilters } from "./utils/filters";

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

  logger.info("Applying filters...");
  const filteredMessages = applyMessageFilters(messages, config);
  logger.info(`Filtered to ${filteredMessages.length} messages.`);

  logger.info("Summarizing messages...");
  const summary = await summarize(filteredMessages, config);

  // Block Kit integration
  logger.info("Formatting digest...");
  const lookbackMs = config.DIGEST_WINDOW_HOURS * 60 * 60 * 1000;
  const candidate = new Date(Date.now() - lookbackMs); // now - 24h
  const { start, end, dateTitle } = getUtcDailyWindowFrom(candidate);
  const blocks = buildDigestBlocks({
    summary,
    start,
    end,
    dateTitle,
  });
  const fallback = formatDigest(summary);

  logger.info("Posting digest to Slack...");
  await postDigestBlocks(blocks, fallback, config);
  logger.info("Pipeline complete.");
}

run().catch((err) => {
  logger.error("Pipeline failed:", err);
  process.exit(1);
});
