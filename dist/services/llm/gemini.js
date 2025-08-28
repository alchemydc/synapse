"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarize = summarize;
exports.buildPrompt = buildPrompt;
exports.truncateMessages = truncateMessages;
// services/llm/gemini.ts
const generative_ai_1 = require("@google/generative-ai");
function buildPrompt(messages) {
    return [
        "Community Digest:",
        "Summarize the following Discord messages for key topics, decisions, and action items.",
        "",
        ...messages.map((m, i) => `[${i + 1}] ${m}`),
        "",
        "Digest:"
    ].join("\n");
}
function truncateMessages(messages, maxChars) {
    let total = 0;
    const out = [];
    for (const m of messages) {
        if (total + m.length > maxChars)
            break;
        out.push(m);
        total += m.length;
    }
    return out;
}
async function summarize(messages, config) {
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
