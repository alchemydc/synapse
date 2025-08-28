"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postDigest = postDigest;
// services/slack/index.ts
const web_api_1 = require("@slack/web-api");
const logger_1 = require("../../utils/logger");
async function postDigest(text, config) {
    if (config.DRY_RUN) {
        logger_1.logger.info("[DRY_RUN] Digest would be posted to Slack:", text);
        return;
    }
    const client = new web_api_1.WebClient(config.SLACK_BOT_TOKEN);
    let attempts = 0;
    while (attempts < 3) {
        try {
            await client.chat.postMessage({
                channel: config.SLACK_CHANNEL_ID,
                text,
                mrkdwn: true,
            });
            logger_1.logger.info("Digest posted to Slack.");
            return;
        }
        catch (err) {
            if (err.data?.error === "ratelimited" && err.data?.retry_after) {
                const waitMs = err.data.retry_after * 1000;
                logger_1.logger.warn(`Slack rate limited, retrying in ${waitMs}ms`);
                await new Promise((r) => setTimeout(r, waitMs));
                attempts++;
            }
            else {
                logger_1.logger.error("Slack post failed:", err);
                throw err;
            }
        }
    }
    logger_1.logger.error("Failed to post digest to Slack after 3 attempts.");
}
