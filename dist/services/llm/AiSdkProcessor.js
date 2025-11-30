"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiSdkProcessor = void 0;
// src/services/llm/AiSdkProcessor.ts
const google_1 = require("@ai-sdk/google");
const ai_1 = require("ai");
const logger_1 = require("../../utils/logger");
class AiSdkProcessor {
    name = "ai-sdk-google";
    config;
    google; // Type is inferred from createGoogleGenerativeAI
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
        // Determine context from first message
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
            return "";
        const first = messages[0];
        const channelName = first.channelName || first.channelId || "unknown";
        // Extract guildId from url if possible, or default
        const guildId = first.url ? first.url.split('/')[4] : 'unknown';
        const channelUrl = `https://discord.com/channels/${guildId}/${first.channelId?.replace('disc-topic-', '') || ''}`;
        // Truncate
        const maxChars = Math.min(this.config.MAX_SUMMARY_TOKENS * 4, 1500);
        const truncated = this.truncateMessages(messages, maxChars);
        const parts = [];
        parts.push("Discord Channel Digest:");
        parts.push("");
        parts.push("Summarize the following Discord channel messages.");
        parts.push("");
        parts.push("FORMATTING RULES:");
        parts.push("- Identify important conversations naturally (security, funding, governance, performance, adoption, customer feedback, growth, etc.)");
        parts.push("- For each significant topic, provide concise bullets");
        parts.push("- Include participant names inline for significant discussions (e.g., 'Alice and Bob discussed X')");
        parts.push("- If there are decisions, action items, or shared links, label those sections");
        parts.push("- Do NOT output acknowledgements, confirmations, or meta-commentary");
        parts.push("");
        parts.push("Messages:");
        parts.push("");
        for (let i = 0; i < truncated.length; i++) {
            parts.push(`[${i + 1}] ${this.formatMessageLine(truncated[i])}`);
        }
        parts.push("");
        parts.push("=== INPUT END ===");
        parts.push("BEGIN DIGEST:");
        parts.push("");
        const prompt = parts.join("\n");
        const out = await this.generate(prompt);
        // Reconstruct header
        let realChannelUrl = channelUrl;
        if (first.url && first.url.includes("discord.com/channels/")) {
            const parts = first.url.split("/");
            if (parts.length >= 6) {
                realChannelUrl = `https://discord.com/channels/${parts[4]}/${parts[5]}`;
            }
        }
        const header = `## [#${channelName}](${realChannelUrl})`;
        return `${header}\n\n${out.trim()}`;
    }
    async summarizeDiscourse(messages) {
        if (!this.google)
            return "";
        const first = messages[0];
        const topicTitle = first.topicTitle || "Unknown Topic";
        const maxChars = Math.min(this.config.MAX_SUMMARY_TOKENS * 4, 1500);
        const truncated = this.truncateMessages(messages, maxChars);
        const parts = [];
        parts.push("Forum Topic Digest:");
        parts.push("");
        parts.push("Summarize the following forum topic and its replies.");
        parts.push("");
        parts.push("FORMATTING RULES:");
        parts.push("- Identify important conversations naturally (security, funding, governance, performance, adoption, customer feedback, growth, etc.)");
        parts.push("- Provide concise bullets covering the main discussion points");
        parts.push("- Include participant names inline for significant contributions (e.g., 'Charlie proposed X')");
        parts.push("- If there are decisions, action items, or shared links, label those sections");
        parts.push("- Do NOT output acknowledgements, confirmations, or meta-commentary");
        parts.push("");
        parts.push("Messages:");
        parts.push("");
        for (let i = 0; i < truncated.length; i++) {
            parts.push(`[${i + 1}] ${this.formatMessageLine(truncated[i])}`);
        }
        parts.push("");
        parts.push("=== INPUT END ===");
        parts.push("BEGIN DIGEST:");
        parts.push("");
        const prompt = parts.join("\n");
        const out = await this.generate(prompt);
        const header = `## [${topicTitle}](${first.url})`;
        return `${header}\n\n${out.trim()}`;
    }
    async generate(prompt) {
        if (!this.google)
            return "";
        try {
            const model = this.google(this.config.GEMINI_MODEL);
            const { text } = await (0, ai_1.generateText)({
                model,
                prompt,
                maxOutputTokens: this.config.MAX_SUMMARY_TOKENS,
                temperature: 0.2,
            });
            return text;
        }
        catch (err) {
            logger_1.logger.error(`AiSdk generation failed: ${err.message}`);
            return "Error generating summary.";
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
