"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postDigest = postDigest;
exports.postDigestBlocks = postDigestBlocks;
// services/slack/index.ts
const web_api_1 = require("@slack/web-api");
const logger_1 = require("../../utils/logger");
async function postDigest(text, config) {
    if (config.DRY_RUN) {
        logger_1.logger.info("[DRY_RUN] Digest preview\n" +
            "----------------------------------------\n" +
            String(text).trim() + "\n" +
            "----------------------------------------");
        return;
    }
    // Ensure required Slack runtime values are present when not in DRY_RUN
    if (!config.SLACK_BOT_TOKEN || !config.SLACK_CHANNEL_ID) {
        logger_1.logger.error("SLACK_BOT_TOKEN and SLACK_CHANNEL_ID are required to post to Slack");
        throw new Error("Missing Slack credentials or channel id");
    }
    if (config.LOG_LEVEL && config.LOG_LEVEL.toLowerCase() === "debug") {
        logger_1.logger.debug("[DEBUG] Slack.postDigest.text", String(text).slice(0, 1200));
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
// New: Post Block Kit digest
async function postDigestBlocks(blocks, textFallback, config) {
    if (config.DRY_RUN) {
        logger_1.logger.info("[DRY_RUN] Digest preview\n" +
            "----------------------------------------\n" +
            String(textFallback).trim() + "\n" +
            "----------------------------------------");
        return;
    }
    // Ensure required Slack runtime values are present when not in DRY_RUN
    if (!config.SLACK_BOT_TOKEN || !config.SLACK_CHANNEL_ID) {
        logger_1.logger.error("SLACK_BOT_TOKEN and SLACK_CHANNEL_ID are required to post to Slack blocks");
        throw new Error("Missing Slack credentials or channel id");
    }
    if (config.LOG_LEVEL && config.LOG_LEVEL.toLowerCase() === "debug") {
        logger_1.logger.debug("[DEBUG] Slack.postDigestBlocks.fallback", String(textFallback).slice(0, 1200));
        try {
            const max = Math.min(10, blocks.length);
            for (let i = 0; i < max; i++) {
                const b = blocks[i];
                logger_1.logger.debug(`[DEBUG] Slack.block[${i}]`, JSON.stringify(b).slice(0, 1200));
            }
        }
        catch (e) {
            logger_1.logger.debug("[DEBUG] Error serializing blocks for debug output", e);
        }
    }
    const client = new web_api_1.WebClient(config.SLACK_BOT_TOKEN);
    let attempts = 0;
    while (attempts < 3) {
        try {
            await client.chat.postMessage({
                channel: config.SLACK_CHANNEL_ID,
                text: textFallback,
                blocks,
            });
            logger_1.logger.info("Digest blocks posted to Slack.");
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
                logger_1.logger.error("Slack block post failed:", err);
                throw err;
            }
        }
    }
    logger_1.logger.error("Failed to post digest blocks to Slack after 3 attempts.");
}
