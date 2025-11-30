// src/services/slack/SlackDestination.ts
import { WebClient } from "@slack/web-api";
import { Destination } from "../../core/interfaces";
import { DigestBlock } from "../../core/types";
import { Config } from "../../config";
import { logger } from "../../utils/logger";

export class SlackDestination implements Destination {
    name = "slack";
    private config: Config;
    private client?: WebClient;

    constructor(config: Config) {
        this.config = config;
        if (config.SLACK_BOT_TOKEN) {
            this.client = new WebClient(config.SLACK_BOT_TOKEN);
        }
    }

    isEnabled(): boolean {
        return !!(this.config.SLACK_BOT_TOKEN && this.config.SLACK_CHANNEL_ID);
    }

    async sendDigest(blocks: DigestBlock[], summary: string): Promise<void> {
        if (this.config.DRY_RUN) {
            logger.info(
                "[DRY_RUN] Digest preview\n" +
                "----------------------------------------\n" +
                summary.trim() + "\n" +
                "----------------------------------------"
            );
            return;
        }

        if (!this.isEnabled()) {
            logger.warn("Slack destination enabled but credentials missing.");
            return;
        }

        if (this.config.LOG_LEVEL === "debug") {
            logger.debug("[DEBUG] Slack.sendDigest.summary", summary.slice(0, 100));
        }

        const MAX_BLOCKS_PER_MESSAGE = 50;
        const MAX_FALLBACK_CHARS = 30000;

        // If blocks fit within Slack's per-message block cap and fallback is small, send as one message.
        if (blocks.length <= MAX_BLOCKS_PER_MESSAGE && summary.length <= MAX_FALLBACK_CHARS) {
            await this.postSingle({ blocks, text: summary });
            logger.info("Digest blocks posted to Slack.");
            return;
        }

        // Split into multiple messages
        const blockChunks: any[][] = [];
        for (let i = 0; i < blocks.length; i += MAX_BLOCKS_PER_MESSAGE) {
            blockChunks.push(blocks.slice(i, i + MAX_BLOCKS_PER_MESSAGE));
        }

        const textChunks: string[] = [];
        if (summary.length === 0) {
            textChunks.push("");
        } else {
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

            const payloadBlocks: any[] = [];
            payloadBlocks.push(headerBlock);
            if (blockChunks[part]) {
                payloadBlocks.push(...blockChunks[part]);
            }

            const fallbackText = textChunks[part] ?? "";

            try {
                await this.postSingle({ blocks: payloadBlocks, text: fallbackText });
                logger.info(`Posted digest part ${part + 1}/${totalParts}`);
            } catch (e) {
                logger.error(`Failed posting digest part ${part + 1}/${totalParts}`, e);
                throw e;
            }
        }

        logger.info("All digest parts posted to Slack.");
    }

    private async postSingle(payload: { blocks?: any[]; text?: string }) {
        if (!this.client || !this.config.SLACK_CHANNEL_ID) return;

        let attempts = 0;
        while (attempts < 3) {
            try {
                await this.client.chat.postMessage({
                    channel: this.config.SLACK_CHANNEL_ID,
                    text: payload.text ?? "",
                    blocks: payload.blocks,
                });
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
        throw new Error("Failed to post digest blocks to Slack after 3 attempts.");
    }
}
