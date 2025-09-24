// services/slack/index.ts
import { WebClient } from "@slack/web-api";
import { Config } from "../../config";
import { logger } from "../../utils/logger";

export async function postDigest(text: string, config: Config): Promise<void> {
  if (config.DRY_RUN) {
    logger.info(
      "[DRY_RUN] Digest preview\n" +
      "----------------------------------------\n" +
      String(text).trim() + "\n" +
      "----------------------------------------"
    );
    return;
  }

  if (config.LOG_LEVEL && config.LOG_LEVEL.toLowerCase() === "debug") {
    logger.debug("[DEBUG] Slack.postDigest.text", String(text).slice(0, 1200));
  }

  const client = new WebClient(config.SLACK_BOT_TOKEN);

  let attempts = 0;
  while (attempts < 3) {
    try {
      await client.chat.postMessage({
        channel: config.SLACK_CHANNEL_ID,
        text,
        mrkdwn: true,
      });
      logger.info("Digest posted to Slack.");
      return;
    } catch (err: any) {
      if (err.data?.error === "ratelimited" && err.data?.retry_after) {
        const waitMs = err.data.retry_after * 1000;
        logger.warn(`Slack rate limited, retrying in ${waitMs}ms`);
        await new Promise((r) => setTimeout(r, waitMs));
        attempts++;
      } else {
        logger.error("Slack post failed:", err);
        throw err;
      }
    }
  }
  logger.error("Failed to post digest to Slack after 3 attempts.");
}

// New: Post Block Kit digest
export async function postDigestBlocks(
  blocks: any[],
  textFallback: string,
  config: Config
): Promise<void> {
  if (config.DRY_RUN) {
    logger.info(
      "[DRY_RUN] Digest preview\n" +
      "----------------------------------------\n" +
      String(textFallback).trim() + "\n" +
      "----------------------------------------"
    );
    return;
  }

  if (config.LOG_LEVEL && config.LOG_LEVEL.toLowerCase() === "debug") {
    logger.debug("[DEBUG] Slack.postDigestBlocks.fallback", String(textFallback).slice(0, 1200));
    try {
      const max = Math.min(10, blocks.length);
      for (let i = 0; i < max; i++) {
        const b = blocks[i];
        logger.debug(`[DEBUG] Slack.block[${i}]`, JSON.stringify(b).slice(0, 1200));
      }
    } catch (e) {
      logger.debug("[DEBUG] Error serializing blocks for debug output", e);
    }
  }

  const client = new WebClient(config.SLACK_BOT_TOKEN);

  let attempts = 0;
  while (attempts < 3) {
    try {
      await client.chat.postMessage({
        channel: config.SLACK_CHANNEL_ID,
        text: textFallback,
        blocks,
      });
      logger.info("Digest blocks posted to Slack.");
      return;
    } catch (err: any) {
      if (err.data?.error === "ratelimited" && err.data?.retry_after) {
        const waitMs = err.data.retry_after * 1000;
        logger.warn(`Slack rate limited, retrying in ${waitMs}ms`);
        await new Promise((r) => setTimeout(r, waitMs));
        attempts++;
      } else {
        logger.error("Slack block post failed:", err);
        throw err;
      }
    }
  }
  logger.error("Failed to post digest blocks to Slack after 3 attempts.");
}
