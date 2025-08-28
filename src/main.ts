// main.ts
import dotenv from "dotenv";
import { loadConfig, Config } from "./config";
import { fetchMessages } from "./services/discord";
import { summarize } from "./services/llm/gemini";
import { postDigest, postDigestBlocks } from "./services/slack";
import { formatDigest, buildDigestBlocks } from "./utils/format";
import { logger } from "./utils/logger";
import { getDigestWindow } from "./utils/time";

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

  // Block Kit integration
  logger.info("Formatting digest...");
  const { start, end } = getDigestWindow(config.DIGEST_WINDOW_HOURS);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const dateTitle = start.toISOString().slice(0, 10); // YYYY-MM-DD
  const blocks = buildDigestBlocks({
    summary,
    start,
    end,
    tz,
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
