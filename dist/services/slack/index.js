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
    // Slack limits: max 50 blocks per message. Also guard against overly long fallback text.
    const MAX_BLOCKS_PER_MESSAGE = 50;
    const MAX_FALLBACK_CHARS = 30000; // conservative safety cap for text payload
    // Helper: post a single message with retry logic
    async function postSingle(payload) {
        let attempts = 0;
        while (attempts < 3) {
            try {
                // Cast payload to any to satisfy Slack client typings and ensure optional fields are handled.
                await client.chat.postMessage({
                    channel: config.SLACK_CHANNEL_ID,
                    text: payload.text ?? "",
                    blocks: payload.blocks ?? undefined,
                });
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
        throw new Error("Failed to post digest blocks to Slack after 3 attempts.");
    }
    // If blocks fit within Slack's per-message block cap and fallback is small, send as one message.
    if (blocks.length <= MAX_BLOCKS_PER_MESSAGE && String(textFallback).length <= MAX_FALLBACK_CHARS) {
        try {
            await postSingle({ blocks, text: textFallback });
            logger_1.logger.info("Digest blocks posted to Slack.");
            return;
        }
        catch (e) {
            logger_1.logger.error("Slack block post failed (single shot):", e);
            throw e;
        }
    }
    // Otherwise, split into multiple messages:
    //  - Split blocks into chunks of MAX_BLOCKS_PER_MESSAGE
    //  - Also chunk fallback text into MAX_FALLBACK_CHARS slices to provide per-message fallback
    const blockChunks = [];
    for (let i = 0; i < blocks.length; i += MAX_BLOCKS_PER_MESSAGE) {
        const slice = blocks.slice(i, i + MAX_BLOCKS_PER_MESSAGE);
        blockChunks.push(slice);
    }
    const fallback = String(textFallback || "");
    const textChunks = [];
    if (fallback.length === 0) {
        textChunks.push("");
    }
    else {
        for (let i = 0; i < fallback.length; i += MAX_FALLBACK_CHARS) {
            const chunk = fallback.slice(i, i + MAX_FALLBACK_CHARS);
            textChunks.push(chunk);
        }
    }
    // Determine number of messages to send: max of blockChunks and textChunks
    const totalParts = Math.max(blockChunks.length, textChunks.length);
    for (let part = 0; part < totalParts; part++) {
        // Build an informative header block to indicate this is a continuation if multiple parts
        const headerText = totalParts > 1 ? `Part ${part + 1} of ${totalParts} — continued digest` : "Digest";
        const headerBlock = {
            type: "section",
            text: { type: "mrkdwn", text: `*${headerText}*` },
        };
        const payloadBlocks = [];
        // include header then whichever block chunk exists for this part
        payloadBlocks.push(headerBlock);
        if (blockChunks[part]) {
            payloadBlocks.push(...blockChunks[part]);
        }
        // Build corresponding fallback text
        const fallbackText = textChunks[part] ?? "";
        try {
            await postSingle({ blocks: payloadBlocks, text: fallbackText });
            logger_1.logger.info(`Posted digest part ${part + 1}/${totalParts}`);
        }
        catch (e) {
            logger_1.logger.error(`Failed posting digest part ${part + 1}/${totalParts}`, e);
            throw e;
        }
    }
    logger_1.logger.info("All digest parts posted to Slack.");
}
