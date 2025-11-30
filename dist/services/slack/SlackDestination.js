"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackDestination = void 0;
// src/services/slack/SlackDestination.ts
const web_api_1 = require("@slack/web-api");
const logger_1 = require("../../utils/logger");
class SlackDestination {
    name = "slack";
    config;
    client;
    constructor(config) {
        this.config = config;
        if (config.SLACK_BOT_TOKEN) {
            this.client = new web_api_1.WebClient(config.SLACK_BOT_TOKEN);
        }
    }
    isEnabled() {
        return !!(this.config.SLACK_BOT_TOKEN && this.config.SLACK_CHANNEL_ID);
    }
    async sendDigest(blocks, summary) {
        if (this.config.DRY_RUN) {
            logger_1.logger.info("[DRY_RUN] Digest preview\n" +
                "----------------------------------------\n" +
                summary.trim() + "\n" +
                "----------------------------------------");
            return;
        }
        if (!this.isEnabled()) {
            logger_1.logger.warn("Slack destination enabled but credentials missing.");
            return;
        }
        if (this.config.LOG_LEVEL === "debug") {
            logger_1.logger.debug("[DEBUG] Slack.sendDigest.summary", summary.slice(0, 100));
        }
        const MAX_BLOCKS_PER_MESSAGE = 50;
        const MAX_FALLBACK_CHARS = 30000;
        // If blocks fit within Slack's per-message block cap and fallback is small, send as one message.
        if (blocks.length <= MAX_BLOCKS_PER_MESSAGE && summary.length <= MAX_FALLBACK_CHARS) {
            await this.postSingle({ blocks, text: summary });
            logger_1.logger.info("Digest blocks posted to Slack.");
            return;
        }
        // Split into multiple messages
        const blockChunks = [];
        for (let i = 0; i < blocks.length; i += MAX_BLOCKS_PER_MESSAGE) {
            blockChunks.push(blocks.slice(i, i + MAX_BLOCKS_PER_MESSAGE));
        }
        const textChunks = [];
        if (summary.length === 0) {
            textChunks.push("");
        }
        else {
            for (let i = 0; i < summary.length; i += MAX_FALLBACK_CHARS) {
                textChunks.push(summary.slice(i, i + MAX_FALLBACK_CHARS));
            }
        }
        const totalParts = Math.max(blockChunks.length, textChunks.length);
        for (let part = 0; part < totalParts; part++) {
            const headerText = totalParts > 1 ? `Part ${part + 1} of ${totalParts} — continued digest` : "Digest";
            const headerBlock = {
                type: "section",
                text: { type: "mrkdwn", text: `*${headerText}*` },
            };
            const payloadBlocks = [];
            payloadBlocks.push(headerBlock);
            if (blockChunks[part]) {
                payloadBlocks.push(...blockChunks[part]);
            }
            const fallbackText = textChunks[part] ?? "";
            try {
                await this.postSingle({ blocks: payloadBlocks, text: fallbackText });
                logger_1.logger.info(`Posted digest part ${part + 1}/${totalParts}`);
            }
            catch (e) {
                logger_1.logger.error(`Failed posting digest part ${part + 1}/${totalParts}`, e);
                throw e;
            }
        }
        logger_1.logger.info("All digest parts posted to Slack.");
    }
    async postSingle(payload) {
        if (!this.client || !this.config.SLACK_CHANNEL_ID)
            return;
        let attempts = 0;
        while (attempts < 3) {
            try {
                await this.client.chat.postMessage({
                    channel: this.config.SLACK_CHANNEL_ID,
                    text: payload.text ?? "",
                    blocks: payload.blocks,
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
}
exports.SlackDestination = SlackDestination;
