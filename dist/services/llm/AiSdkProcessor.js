"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiSdkProcessor = void 0;
// src/services/llm/AiSdkProcessor.ts
const google_1 = require("@ai-sdk/google");
const ai_1 = require("ai");
const logger_1 = require("../../utils/logger");
const schemas_1 = require("../../core/schemas");
class AiSdkProcessor {
    name = "ai-sdk-google";
    config;
    google;
    constructor(config) {
        this.config = config;
        if (config.GEMINI_API_KEY) {
            this.google = (0, google_1.createGoogleGenerativeAI)({
                apiKey: config.GEMINI_API_KEY,
            });
        }
    }
    async process(messages) {
        if (messages.length === 0)
            return "";
        const first = messages[0];
        if (first.source === "discord") {
            return this.summarizeDiscord(messages);
        }
        else if (first.source === "discourse") {
            return this.summarizeDiscourse(messages);
        }
        return "";
    }
    async summarizeDiscord(messages) {
        if (!this.google)
            throw new Error("Google provider not initialized");
        const first = messages[0];
        const channelName = first.channelName || first.channelId || "unknown";
        const guildId = first.url ? first.url.split('/')[4] : 'unknown';
        let realChannelUrl = `https://discord.com/channels/${guildId}/${first.channelId?.replace('disc-topic-', '') || ''}`;
        if (first.url && first.url.includes("discord.com/channels/")) {
            const parts = first.url.split("/");
            if (parts.length >= 6) {
                realChannelUrl = `https://discord.com/channels/${parts[4]}/${parts[5]}`;
            }
        }
        const maxChars = Math.min(this.config.MAX_SUMMARY_TOKENS * 4, 1500);
        const truncated = this.truncateMessages(messages, maxChars);
        const parts = [];
        parts.push(`CONTEXT: Discord Channel #${channelName}`);
        parts.push(`URL: ${realChannelUrl}`);
        parts.push("");
        parts.push("Summarize the following Discord channel messages.");
        parts.push("");
        parts.push("FORMATTING RULES:");
        parts.push("- Identify important conversations naturally");
        parts.push("- Provide concise bullets");
        parts.push("- Include participant names inline");
        parts.push("- Do NOT output acknowledgements");
        parts.push("");
        parts.push("Messages:");
        for (let i = 0; i < truncated.length; i++) {
            parts.push(`[${i + 1}] ${this.formatMessageLine(truncated[i])}`);
        }
        const prompt = parts.join("\n");
        return this.generate(prompt, `#${channelName}`, realChannelUrl);
    }
    async summarizeDiscourse(messages) {
        if (!this.google)
            throw new Error("Google provider not initialized");
        const first = messages[0];
        const topicTitle = first.topicTitle || "Unknown Topic";
        const topicUrl = first.url;
        const maxChars = Math.min(this.config.MAX_SUMMARY_TOKENS * 4, 1500);
        const truncated = this.truncateMessages(messages, maxChars);
        const parts = [];
        parts.push(`CONTEXT: Forum Topic "${topicTitle}"`);
        parts.push(`URL: ${topicUrl}`);
        parts.push("");
        parts.push("Summarize the following forum topic and its replies.");
        parts.push("");
        parts.push("FORMATTING RULES:");
        parts.push("- Identify important conversations naturally");
        parts.push("- Provide concise bullets");
        parts.push("- Include participant names inline");
        parts.push("- Do NOT output acknowledgements");
        parts.push("");
        parts.push("Messages:");
        for (let i = 0; i < truncated.length; i++) {
            parts.push(`[${i + 1}] ${this.formatMessageLine(truncated[i])}`);
        }
        const prompt = parts.join("\n");
        return this.generate(prompt, topicTitle, topicUrl);
    }
    async generate(prompt, defaultHeadline, defaultUrl) {
        try {
            const model = this.google(this.config.GEMINI_MODEL);
            const { object } = await (0, ai_1.generateObject)({
                model,
                schema: schemas_1.DigestItemSchema,
                prompt,
                maxOutputTokens: this.config.MAX_SUMMARY_TOKENS,
                temperature: 0.2,
            });
            const parsed = schemas_1.DigestItemSchema.safeParse(object);
            if (!parsed.success) {
                return {
                    headline: defaultHeadline,
                    url: defaultUrl,
                    summary: "Error generating summary."
                };
            }
            // Fallback if model hallucinates empty fields, though schema enforces strings.
            return {
                headline: parsed.data.headline || defaultHeadline,
                url: parsed.data.url || defaultUrl,
                summary: parsed.data.summary
            };
        }
        catch (err) {
            logger_1.logger.error(`AiSdk generation failed: ${err.message}`);
            // Return a fallback DigestItem
            return {
                headline: defaultHeadline,
                url: defaultUrl,
                summary: "Error generating summary."
            };
        }
    }
    formatMessageLine(msg) {
        const date = new Date(msg.createdAt);
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const dateStr = date.toLocaleString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: tz,
        });
        return `[${dateStr} ${tz}] ${msg.author}: ${msg.content}`;
    }
    truncateMessages(messages, maxChars) {
        let total = 0;
        const out = [];
        for (const m of messages) {
            const contentLen = m.content ? m.content.length : 0;
            const remaining = maxChars - total;
            if (remaining <= 0)
                break;
            if (contentLen <= remaining) {
                out.push(m);
                total += contentLen;
            }
            else {
                const truncatedContent = m.content ? m.content.slice(0, remaining) + "..." : "";
                out.push({ ...m, content: truncatedContent });
                total += truncatedContent.length;
                break;
            }
        }
        return out;
    }
}
exports.AiSdkProcessor = AiSdkProcessor;
