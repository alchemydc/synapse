// services/slack/index.ts
import { WebClient } from "@slack/web-api";
import { Config } from "../../config";
import { logger } from "../../utils/logger";

export async function postDigest(text: string, config: Config): Promise<void> {
  if (config.DRY_RUN) {
    logger.info("[DRY_RUN] Digest would be posted to Slack:", text);
    return;
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
