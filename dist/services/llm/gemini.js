"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarize = summarize;
exports.summarizeAttributed = summarizeAttributed;
exports.buildPrompt = buildPrompt;
exports.truncateMessages = truncateMessages;
exports.formatMessageLine = formatMessageLine;
exports.buildAttributedPrompt = buildAttributedPrompt;
// services/llm/gemini.ts
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../../utils/logger");
const topics_1 = require("../../utils/topics");
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
    return `[${msg.channelId} @ ${dateStr} ${tz}] ${msg.content}`;
}
function buildPrompt(messages) {
    return [
        "Community Digest:",
        "Summarize the following Discord messages. For each section, produce concise bullets.",
        "Sections: Decisions, Action Items, Links. For each topic, start with a single title line and then concise bullets; do not add a separate 'Key Topics' heading.",
        "Preserve any leading bracketed source labels (e.g. [Discord #channel], [Forum category]) exactly as provided; do not remove or reword them.",
        "",
        ...messages.map((m, i) => `[${i + 1}] ${formatMessageLine(m)}`),
        "",
        "Digest:",
    ].join("\n");
}
/**
 * Build a prompt that includes per-topic clusters and participant lists.
 * @param clusters TopicCluster[]
 * @param config Config (for token budgeting notes)
 */
function buildAttributedPrompt(clusters, config) {
    const parts = [];
    parts.push("Community Digest (Attributed):");
    parts.push("Summarize the following topic clusters derived from Discord messages.");
    parts.push("For each topic, produce concise bullets. If there are Decisions, Action Items, or Links, label those sections accordingly. Start each topic with a single title line; do not include an extra 'Key Topics' heading.");
    parts.push("When generating each topic heading, preserve the leading bracketed source label exactly as provided (e.g., [Discord #channel], [Forum category]). Do not remove or alter it.");
    parts.push("For any bullet derived from a topic, include a trailing 'Participants: name1, name2' line listing the participants involved in that topic.");
    parts.push("Do not invent participants not listed below. Use the exact participant names provided.");
    parts.push("");
    parts.push("Input topics (chronological):");
    parts.push("");
    for (const c of clusters) {
        const participants = (0, topics_1.formatParticipantList)(c.participants, config.MAX_TOPIC_PARTICIPANTS);
        parts.push(`Topic ${c.id}:`);
        parts.push(`Channel: ${c.channelId}`);
        parts.push(`Participants: ${participants || "none"}`);
        parts.push("Messages:");
        for (let i = 0; i < c.messages.length; i++) {
            parts.push(`[${i + 1}] ${formatMessageLine(c.messages[i])}`);
        }
        parts.push(""); // spacer between topics
    }
    parts.push("Digest:");
    parts.push("");
    parts.push(`Notes: Limit output to concise bullets. If a topic contains no substantive content, omit it. Max summary token budget: ${config.MAX_SUMMARY_TOKENS}.`);
    return parts.join("\n");
}
function truncateMessages(messages, maxChars) {
    let total = 0;
    const out = [];
    for (const m of messages) {
        if (total + m.content.length > maxChars)
            break;
        out.push(m);
        total += m.content.length;
    }
    return out;
}
/**
 * truncateClusters - reduce messages across clusters to fit a global character budget.
 * Returns new clusters with messages trimmed in chronological order until budget exhausted.
 * Participants are preserved from original cluster (TODO: recompute from truncated messages).
 */
function truncateClusters(clusters, maxChars) {
    if (!clusters || clusters.length === 0)
        return [];
    let total = 0;
    const result = [];
    outer: for (const c of clusters) {
        const keptMessages = [];
        for (const m of c.messages) {
            const len = m.content ? m.content.length : 0;
            if (total + len > maxChars) {
                if (keptMessages.length === 0) {
                    // No room for any message in this cluster; stop processing further clusters.
                    break outer;
                }
                else {
                    // Partial cluster preserved; stop after this cluster.
                    result.push({ ...c, messages: keptMessages, participants: c.participants });
                    break outer;
                }
            }
            keptMessages.push(m);
            total += len;
        }
        if (keptMessages.length > 0) {
            result.push({ ...c, messages: keptMessages, participants: c.participants });
        }
        if (total >= maxChars)
            break;
    }
    return result;
}
async function summarize(messages, config) {
    if (!config.GEMINI_MODEL || config.GEMINI_MODEL.trim() === "") {
        logger_1.logger.error("GEMINI_MODEL is empty; check CI env or repository Variables export.");
        throw new Error("GEMINI_MODEL is required");
    }
    logger_1.logger.info("Gemini init", { model: config.GEMINI_MODEL, maxTokens: config.MAX_SUMMARY_TOKENS });
    const genAI = new generative_ai_1.GoogleGenerativeAI(config.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: config.GEMINI_MODEL });
    // Truncate to fit token budget (roughly 4 chars per token)
    const maxChars = config.MAX_SUMMARY_TOKENS * 4;
    const truncated = truncateMessages(messages, maxChars);
    const prompt = buildPrompt(truncated);
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
 * summarizeAttributed - accepts topic clusters (with participants) and asks the LLM
 * to include Participants lines per topic-derived bullet.
 */
async function summarizeAttributed(clusters, config) {
    if (!config.GEMINI_MODEL || config.GEMINI_MODEL.trim() === "") {
        logger_1.logger.error("GEMINI_MODEL is empty; check CI env or repository Variables export.");
        throw new Error("GEMINI_MODEL is required");
    }
    logger_1.logger.info("Gemini attributed init", { model: config.GEMINI_MODEL, maxTokens: config.MAX_SUMMARY_TOKENS });
    const genAI = new generative_ai_1.GoogleGenerativeAI(config.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: config.GEMINI_MODEL });
    // Build prompt from clusters and truncate to token budget.
    const maxChars = config.MAX_SUMMARY_TOKENS * 4;
    const truncatedClusters = truncateClusters(clusters, maxChars);
    let prompt = buildAttributedPrompt(truncatedClusters, config);
    // If truncation occurred, append a short note so the LLM knows input was truncated.
    const truncatedOccurred = truncatedClusters.length !== clusters.length ||
        truncatedClusters.some((tc, idx) => (clusters[idx] ? tc.messages.length !== clusters[idx].messages.length : true));
    if (truncatedOccurred) {
        prompt += "\n\n[Note: input truncated to fit token budget]";
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
