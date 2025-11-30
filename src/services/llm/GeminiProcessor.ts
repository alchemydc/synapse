// src/services/llm/GeminiProcessor.ts
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { Processor } from "../../core/interfaces";
import { NormalizedMessage } from "../../core/types";
import { Config } from "../../config";
import { logger } from "../../utils/logger";

export class GeminiProcessor implements Processor {
    name = "gemini";
    private config: Config;
    private model?: GenerativeModel;

    constructor(config: Config) {
        this.config = config;
        if (config.GEMINI_API_KEY && config.GEMINI_MODEL) {
            const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
            this.model = genAI.getGenerativeModel({ model: config.GEMINI_MODEL });
        }
    }

    async process(messages: NormalizedMessage[]): Promise<string> {
        if (messages.length === 0) return "";

        // Determine context from first message
        const first = messages[0];
        if (first.source === "discord") {
            return this.summarizeDiscord(messages);
        } else if (first.source === "discourse") {
            return this.summarizeDiscourse(messages);
        }
        return "";
    }

    private async summarizeDiscord(messages: NormalizedMessage[]): Promise<string> {
        if (!this.model) return "";

        const first = messages[0];
        const channelName = first.channelName || first.channelId || "unknown";
        // Extract guildId from url if possible, or default
        const guildId = first.url ? first.url.split('/')[4] : 'unknown';
        const channelUrl = `https://discord.com/channels/${guildId}/${first.channelId?.replace('disc-topic-', '') || ''}`; // approximate reconstruction if needed, or use url from msg

        // Actually, NormalizedMessage for Discord has url.
        // But channel url is not per message.
        // Let's use the logic from original code:
        // const channelUrl = `https://discord.com/channels/${guildId}/${channelId}`;
        // We need channelId. NormalizedMessage has it.

        // Truncate
        const maxChars = Math.min(this.config.MAX_SUMMARY_TOKENS * 4, 1500);
        const truncated = this.truncateMessages(messages, maxChars);

        const parts: string[] = [];
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
        // Original: const header = `## [#${channelName}](${channelUrl})`;
        // We need to ensure channelUrl is correct.
        // If msg.url is https://discord.com/channels/GUILD/CHANNEL/MSG, we can parse it.
        let realChannelUrl = channelUrl;
        if (first.url && first.url.includes("discord.com/channels/")) {
            const parts = first.url.split("/");
            // parts: [https:, , discord.com, channels, guildId, channelId, msgId]
            if (parts.length >= 6) {
                realChannelUrl = `https://discord.com/channels/${parts[4]}/${parts[5]}`;
            }
        }

        const header = `## [#${channelName}](${realChannelUrl})`;
        return `${header}\n\n${out.trim()}`;
    }

    private async summarizeDiscourse(messages: NormalizedMessage[]): Promise<string> {
        if (!this.model) return "";

        const first = messages[0];
        const topicTitle = first.topicTitle || "Unknown Topic";
        // topicUrl is usually the url of the first message or the topic itself.
        // NormalizedMessage.url for discourse is per post.
        // But we want the topic URL.
        // We can strip the post ID or use logic.
        // In original code: const topicUrl = filtered[0].url;
        // But filtered[0].url in original code was: `${discoBase}/t/${topicSlug}/${topicId}/${postId}`
        // Wait, original code passed `topicUrl` which was constructed as `${discoBase}/t/${topicSlug}/${topicId}` in the loop.
        // In NormalizedMessage, we have `url`.
        // We can try to reconstruct topic URL or just use the first message URL.
        // Let's use the first message URL but maybe strip the post ID if it looks like one.
        // Actually, linking to the first post is fine.

        const maxChars = Math.min(this.config.MAX_SUMMARY_TOKENS * 4, 1500);
        const truncated = this.truncateMessages(messages, maxChars);

        const parts: string[] = [];
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

    private async generate(prompt: string): Promise<string> {
        if (!this.model) return "";
        try {
            const result = await this.model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    maxOutputTokens: this.config.MAX_SUMMARY_TOKENS,
                    temperature: 0.2,
                },
            });
            return result.response.text();
        } catch (err: any) {
            logger.error(`Gemini generation failed: ${err.message}`);
            return "Error generating summary.";
        }
    }

    private formatMessageLine(msg: NormalizedMessage): string {
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

    private truncateMessages(messages: NormalizedMessage[], maxChars: number): NormalizedMessage[] {
        let total = 0;
        const out: NormalizedMessage[] = [];
        for (const m of messages) {
            const contentLen = m.content ? m.content.length : 0;
            const remaining = maxChars - total;

            if (remaining <= 0) break;

            if (contentLen <= remaining) {
                out.push(m);
                total += contentLen;
            } else {
                const truncatedContent = m.content ? m.content.slice(0, remaining) + "..." : "";
                out.push({ ...m, content: truncatedContent });
                total += truncatedContent.length;
                break;
            }
        }
        return out;
    }
}
