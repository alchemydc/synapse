"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeDiscordChannel = summarizeDiscordChannel;
exports.summarizeDiscourseTopic = summarizeDiscourseTopic;
exports.formatMessageLine = formatMessageLine;
exports.truncateMessages = truncateMessages;
// services/llm/gemini.ts
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../../utils/logger");
function formatMessageLine(msg) {
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
function truncateMessages(messages, maxChars) {
    let total = 0;
    const out = [];
    for (const m of messages) {
        if (total + (m.content ? m.content.length : 0) > maxChars)
            break;
        out.push(m);
        total += m.content ? m.content.length : 0;
    }
    return out;
}
/**
 * Summarize messages from a single Discord channel.
 * Returns markdown with clickable header: ## [#channel-name](url)
 */
async function summarizeDiscordChannel(messages, channelName, channelId, guildId, config) {
    if (!config.GEMINI_MODEL || config.GEMINI_MODEL.trim() === "") {
        logger_1.logger.error("GEMINI_MODEL is empty; check CI env or repository Variables export.");
        throw new Error("GEMINI_MODEL is required");
    }
    const channelUrl = `https://discord.com/channels/${guildId}/${channelId}`;
    logger_1.logger.info("Summarizing Discord channel", {
        channel: channelName,
        messageCount: messages.length,
        model: config.GEMINI_MODEL
    });
    const genAI = new generative_ai_1.GoogleGenerativeAI(config.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: config.GEMINI_MODEL });
    // Truncate to fit token budget (roughly 4 chars per token)
    const maxChars = config.MAX_SUMMARY_TOKENS * 4;
    const truncated = truncateMessages(messages, maxChars);
    const parts = [];
    parts.push("Discord Channel Digest:");
    parts.push("");
    parts.push("Summarize the following Discord channel messages.");
    parts.push("");
    parts.push("FORMATTING RULES:");
    parts.push(`- Start with a clickable H2 header: ## [#${channelName}](${channelUrl})`);
    parts.push("- Identify important conversations naturally (security, funding, governance, performance, adoption, customer feedback, growth, etc.)");
    parts.push("- For each significant topic, provide concise bullets");
    parts.push("- Include participant names inline for significant discussions (e.g., 'Alice and Bob discussed X')");
    parts.push("- If there are decisions, action items, or shared links, label those sections");
    parts.push("- OUTPUT ONLY the digest content starting with the H2 header");
    parts.push("- Do NOT output acknowledgements, confirmations, or meta-commentary");
    parts.push("");
    parts.push("Messages:");
    parts.push("");
    for (let i = 0; i < truncated.length; i++) {
        parts.push(`[${i + 1}] ${formatMessageLine(truncated[i])}`);
    }
    parts.push("");
    parts.push("=== INPUT END ===");
    parts.push("BEGIN DIGEST:");
    parts.push("");
    const prompt = parts.join("\n");
    if (process.env.LOG_LEVEL && process.env.LOG_LEVEL.toLowerCase() === "debug") {
        const promptLen = String(prompt).length;
        const estTokens = Math.ceil(promptLen / 4);
        logger_1.logger.debug("[DEBUG] Discord summarize prompt", { len: promptLen, estTokens });
    }
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            maxOutputTokens: config.MAX_SUMMARY_TOKENS,
            temperature: 0.2,
        },
    });
    return result.response.text();
}
/**
 * Summarize messages from a single Discourse topic (original post + replies).
 * Returns markdown with clickable header: ## [Topic Title](url)
 */
async function summarizeDiscourseTopic(messages, topicTitle, topicUrl, config) {
    if (!config.GEMINI_MODEL || config.GEMINI_MODEL.trim() === "") {
        logger_1.logger.error("GEMINI_MODEL is empty; check CI env or repository Variables export.");
        throw new Error("GEMINI_MODEL is required");
    }
    logger_1.logger.info("Summarizing Discourse topic", {
        topic: topicTitle,
        messageCount: messages.length,
        model: config.GEMINI_MODEL
    });
    const genAI = new generative_ai_1.GoogleGenerativeAI(config.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: config.GEMINI_MODEL });
    // Truncate to fit token budget (roughly 4 chars per token)
    const maxChars = config.MAX_SUMMARY_TOKENS * 4;
    const truncated = truncateMessages(messages, maxChars);
    const parts = [];
    parts.push("Forum Topic Digest:");
    parts.push("");
    parts.push("Summarize the following forum topic and its replies.");
    parts.push("");
    parts.push("FORMATTING RULES:");
    parts.push(`- Start with a clickable H2 header: ## [${topicTitle}](${topicUrl})`);
    parts.push("- Identify important conversations naturally (security, funding, governance, performance, adoption, customer feedback, growth, etc.)");
    parts.push("- Provide concise bullets covering the main discussion points");
    parts.push("- Include participant names inline for significant contributions (e.g., 'Charlie proposed X')");
    parts.push("- If there are decisions, action items, or shared links, label those sections");
    parts.push("- OUTPUT ONLY the digest content starting with the H2 header");
    parts.push("- Do NOT output acknowledgements, confirmations, or meta-commentary");
    parts.push("");
    parts.push("Messages:");
    parts.push("");
    for (let i = 0; i < truncated.length; i++) {
        parts.push(`[${i + 1}] ${formatMessageLine(truncated[i])}`);
    }
    parts.push("");
    parts.push("=== INPUT END ===");
    parts.push("BEGIN DIGEST:");
    parts.push("");
    const prompt = parts.join("\n");
    if (process.env.LOG_LEVEL && process.env.LOG_LEVEL.toLowerCase() === "debug") {
        const promptLen = String(prompt).length;
        const estTokens = Math.ceil(promptLen / 4);
        logger_1.logger.debug("[DEBUG] Discourse summarize prompt", { len: promptLen, estTokens });
    }
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            maxOutputTokens: config.MAX_SUMMARY_TOKENS,
            temperature: 0.2,
        },
    });
    return result.response.text();
}
