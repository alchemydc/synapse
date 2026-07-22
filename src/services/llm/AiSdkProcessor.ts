// src/services/llm/AiSdkProcessor.ts
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject, APICallError } from "ai";
import pRetry, { AbortError } from "p-retry";
import { Processor } from "../../core/interfaces";
import { NormalizedMessage } from "../../core/types";
import { Config } from "../../config";
import { logger } from "../../utils/logger";
import { DigestItem, DigestItemSchema } from "../../core/schemas";

export class AiSdkProcessor implements Processor {
    name = "ai-sdk-google";
    private config: Config;
    private google: any;

    constructor(config: Config) {
        this.config = config;
        if (config.GEMINI_API_KEY) {
            this.google = createGoogleGenerativeAI({
                apiKey: config.GEMINI_API_KEY,
            });
        }
    }

    async process(messages: NormalizedMessage[]): Promise<DigestItem | string> {
        if (messages.length === 0) return "";

        // Discord fetches newest-first; present the conversation in reading
        // order so the model doesn't see replies before questions.
        messages = [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

        const first = messages[0];
        if (first.source === "discord") {
            return this.summarizeDiscord(messages);
        } else if (first.source === "discourse") {
            return this.summarizeDiscourse(messages);
        }
        return "";
    }

    private async summarizeDiscord(messages: NormalizedMessage[]): Promise<DigestItem> {
        if (!this.google) throw new Error("Google provider not initialized");

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

        const truncated = this.truncateMessages(messages, this.config.MAX_INPUT_CHARS_PER_GROUP);

        const parts: string[] = [];
        parts.push(`CONTEXT: Discord Channel #${channelName}`);
        parts.push(`URL: ${realChannelUrl}`);
        parts.push("");
        parts.push("Summarize the following Discord channel messages.");
        parts.push("");
        this.pushSharedRules(parts);
        parts.push("Messages (in chronological order, oldest first):");
        for (let i = 0; i < truncated.length; i++) {
            parts.push(`[${i + 1}] ${this.formatMessageLine(truncated[i])}`);
        }

        const prompt = parts.join("\n");
        return this.generate(prompt, `#${channelName}`, realChannelUrl);
    }

    private async summarizeDiscourse(messages: NormalizedMessage[]): Promise<DigestItem> {
        if (!this.google) throw new Error("Google provider not initialized");

        const first = messages[0];
        const topicTitle = first.topicTitle || "Unknown Topic";
        const topicUrl = first.url;

        const truncated = this.truncateMessages(messages, this.config.MAX_INPUT_CHARS_PER_GROUP);

        const parts: string[] = [];
        parts.push(`CONTEXT: Forum Topic "${topicTitle}"`);
        parts.push(`URL: ${topicUrl}`);
        parts.push("");
        parts.push("Summarize the following forum topic and its replies.");
        parts.push("");
        this.pushSharedRules(parts);
        parts.push("Messages (in chronological order, oldest first):");
        for (let i = 0; i < truncated.length; i++) {
            parts.push(`[${i + 1}] ${this.formatMessageLine(truncated[i])}`);
        }

        const prompt = parts.join("\n");
        return this.generate(prompt, topicTitle, topicUrl);
    }

    // Rules shared by both prompt builders, ported from the legacy
    // GeminiProcessor prompt plus explicit accuracy guardrails.
    private pushSharedRules(parts: string[]): void {
        parts.push("FORMATTING RULES:");
        parts.push("- Identify important conversations naturally (security, funding, governance, performance, adoption, community feedback, etc.)");
        parts.push("- For each significant topic, provide concise bullets");
        parts.push("- Include participant names inline for significant discussions (e.g., 'Alice and Bob discussed X')");
        parts.push("- If there are decisions, action items, or shared links, label those sections");
        parts.push("- Do NOT output acknowledgements, confirmations, or meta-commentary");
        parts.push("");
        parts.push("ACCURACY RULES:");
        parts.push("- Only include facts stated in the messages below. Do not infer decisions or outcomes that are not explicit.");
        parts.push("- Attribute statements to the correct author as given on each message line.");
        parts.push("");
    }

    private async generate(prompt: string, defaultHeadline: string, defaultUrl: string): Promise<DigestItem> {
        try {
            const model = this.google(this.config.GEMINI_MODEL);
            const { object } = await pRetry(
                async () => {
                    try {
                        return await generateObject({
                            model,
                            schema: DigestItemSchema as any,
                            prompt,
                            maxOutputTokens: this.config.MAX_SUMMARY_TOKENS,
                        });
                    } catch (err: any) {
                        // Don't burn retries on errors the API marks permanent
                        // (auth, bad request); do retry 429/5xx/network and
                        // parse failures, which are transient.
                        if (APICallError.isInstance(err) && err.isRetryable === false) {
                            throw new AbortError(err);
                        }
                        throw err;
                    }
                },
                {
                    retries: 3,
                    onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
                        logger.warn(`LLM attempt ${attemptNumber} failed (${retriesLeft} retries left): ${error.message}`);
                    },
                }
            );

            const parsed = DigestItemSchema.safeParse(object);
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
                // The model occasionally emits literal backslash-n sequences
                // inside the JSON string; render them as real newlines.
                summary: parsed.data.summary.replace(/\\n/g, "\n")
            };
        } catch (err: any) {
            logger.error(`AiSdk generation failed: ${err.message}`);
            // Return a fallback DigestItem
            return {
                headline: defaultHeadline,
                url: defaultUrl,
                summary: "Error generating summary."
            };
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

    // Messages arrive oldest-first; when the budget triggers, keep the most
    // recent messages (the day's conclusion) and drop the oldest instead.
    private truncateMessages(messages: NormalizedMessage[], maxChars: number): NormalizedMessage[] {
        let total = 0;
        const out: NormalizedMessage[] = [];
        for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            const contentLen = m.content ? m.content.length : 0;
            const remaining = maxChars - total;

            if (remaining <= 0) break;

            if (contentLen <= remaining) {
                out.unshift(m);
                total += contentLen;
            } else {
                const truncatedContent = m.content ? m.content.slice(0, remaining) + "..." : "";
                out.unshift({ ...m, content: truncatedContent });
                break;
            }
        }
        return out;
    }
}
