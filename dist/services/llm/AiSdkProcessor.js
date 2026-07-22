"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiSdkProcessor = void 0;
// src/services/llm/AiSdkProcessor.ts
const google_1 = require("@ai-sdk/google");
const ai_1 = require("ai");
const p_retry_1 = __importStar(require("p-retry"));
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
        // Discord fetches newest-first; present the conversation in reading
        // order so the model doesn't see replies before questions.
        messages = [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
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
        const truncated = this.truncateMessages(messages, this.config.MAX_INPUT_CHARS_PER_GROUP);
        const parts = [];
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
    async summarizeDiscourse(messages) {
        if (!this.google)
            throw new Error("Google provider not initialized");
        const first = messages[0];
        const topicTitle = first.topicTitle || "Unknown Topic";
        const topicUrl = first.url;
        const truncated = this.truncateMessages(messages, this.config.MAX_INPUT_CHARS_PER_GROUP);
        const parts = [];
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
    pushSharedRules(parts) {
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
    async generate(prompt, defaultHeadline, defaultUrl) {
        try {
            const model = this.google(this.config.GEMINI_MODEL);
            const { object } = await (0, p_retry_1.default)(async () => {
                try {
                    return await (0, ai_1.generateObject)({
                        model,
                        schema: schemas_1.DigestItemSchema,
                        prompt,
                        maxOutputTokens: this.config.MAX_SUMMARY_TOKENS,
                    });
                }
                catch (err) {
                    // Don't burn retries on errors the API marks permanent
                    // (auth, bad request); do retry 429/5xx/network and
                    // parse failures, which are transient.
                    if (ai_1.APICallError.isInstance(err) && err.isRetryable === false) {
                        throw new p_retry_1.AbortError(err);
                    }
                    throw err;
                }
            }, {
                retries: 3,
                onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
                    logger_1.logger.warn(`LLM attempt ${attemptNumber} failed (${retriesLeft} retries left): ${error.message}`);
                },
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
                // The model occasionally emits literal backslash-n sequences
                // inside the JSON string; render them as real newlines.
                summary: parsed.data.summary.replace(/\\n/g, "\n")
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
    // Messages arrive oldest-first; when the budget triggers, keep the most
    // recent messages (the day's conclusion) and drop the oldest instead.
    truncateMessages(messages, maxChars) {
        let total = 0;
        const out = [];
        for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            const contentLen = m.content ? m.content.length : 0;
            const remaining = maxChars - total;
            if (remaining <= 0)
                break;
            if (contentLen <= remaining) {
                out.unshift(m);
                total += contentLen;
            }
            else {
                const truncatedContent = m.content ? m.content.slice(0, remaining) + "..." : "";
                out.unshift({ ...m, content: truncatedContent });
                break;
            }
        }
        return out;
    }
}
exports.AiSdkProcessor = AiSdkProcessor;
