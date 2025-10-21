"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeToSlackMrkdwn = normalizeToSlackMrkdwn;
exports.truncateSection = truncateSection;
exports.buildDigestBlocks = buildDigestBlocks;
exports.formatDigest = formatDigest;
const logger_1 = require("./logger");
// Normalize generic markdown to Slack mrkdwn
function normalizeToSlackMrkdwn(md) {
    // Convert common Markdown into Slack mrkdwn in a conservative, non-destructive way.
    // We intentionally avoid placeholder collisions and aggressive transforms.
    let out = String(md)
        // Links: [text](https://...) -> <https://...|text>
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "<$2|$1>")
        // Headings: convert to bold since Slack doesn't support header levels
        .replace(/^#{1,6}\s+(.*)$/gm, "*$1*")
        // Bold: **text** -> *text*
        .replace(/\*\*([^*]+)\*\*/g, "*$1*")
        // Note: avoid transforming __text__ to prevent collisions with any literal underscores
        // Lists normalization
        .replace(/^\s*\d+\.\s+/gm, "- ")
        .replace(/^\s*[•*]\s+/gm, "- ")
        .replace(/^\s{1,}-(\s+)/gm, "-$1")
        .replace(/([^\n])\n(-\s)/g, "$1\n\n$2")
        // Collapse excessive blank lines
        .replace(/\n{3,}/g, "\n\n");
    return out;
}
function truncateSection(text, max = 2800) {
    return text.length <= max ? text : text.slice(0, max - 1) + "…";
}
function buildDigestBlocks(params) {
    // Slack limit: 50 blocks per message. Use 45 as safe budget (5 block safety margin)
    const MAX_BLOCKS_PER_MESSAGE = 45;
    const MAX_SECTION_CHARS = Number(process.env.SECTION_CHAR_LIMIT) || 2800;
    let mrkdwn = normalizeToSlackMrkdwn(params.summary);
    if (process.env.LOG_LEVEL && process.env.LOG_LEVEL.toLowerCase() === "debug") {
        logger_1.logger.debug("[DEBUG] buildDigestBlocks.mrkdwn.length", mrkdwn.length);
    }
    const range = `Time window: ${params.dateTitle} 00:00–${params.end.toISOString().slice(0, 10)} 00:00 UTC`;
    // Start with header blocks
    const headerBlocks = [
        { type: "header", text: { type: "plain_text", text: `Community Digest — ${params.dateTitle} (UTC)` } },
        { type: "context", elements: [{ type: "mrkdwn", text: range }] },
        { type: "divider" },
    ];
    // Parse topics by detecting bold headers (converted from H2 markdown)
    // Pattern matches lines like: *[#channel-name](url)* or *Topic Title*
    const topicPattern = /^\*([^*\n]+)\*$/gm;
    const topics = [];
    let match;
    while ((match = topicPattern.exec(mrkdwn)) !== null) {
        topics.push({ start: match.index, header: match[1] });
    }
    if (topics.length === 0) {
        // No topics found, treat entire content as single section
        const sectionText = truncateSection(mrkdwn, MAX_SECTION_CHARS);
        if (sectionText) {
            const blocks = [
                ...headerBlocks,
                { type: "section", text: { type: "mrkdwn", text: sectionText } },
            ];
            return [blocks];
        }
        return [headerBlocks];
    }
    // Build blocks for each topic, splitting into multiple messages when needed
    const HEADER_BLOCK_COUNT = headerBlocks.length;
    const availableBlockBudget = MAX_BLOCKS_PER_MESSAGE - HEADER_BLOCK_COUNT;
    const allBlockSets = [];
    let currentBlocks = [...headerBlocks];
    for (let i = 0; i < topics.length; i++) {
        const start = topics[i].start;
        const end = i < topics.length - 1 ? topics[i + 1].start : mrkdwn.length;
        const topicContent = mrkdwn.slice(start, end).trim();
        // Create section block for this topic (truncate if needed)
        const sectionText = truncateSection(topicContent, MAX_SECTION_CHARS);
        if (!sectionText)
            continue;
        const topicBlock = { type: "section", text: { type: "mrkdwn", text: sectionText } };
        // Check if adding this topic would exceed the budget
        const wouldExceedBudget = (currentBlocks.length - HEADER_BLOCK_COUNT) + 1 > availableBlockBudget;
        if (wouldExceedBudget && currentBlocks.length > HEADER_BLOCK_COUNT) {
            // Save current block set and start a new one
            allBlockSets.push(currentBlocks);
            currentBlocks = [
                { type: "header", text: { type: "plain_text", text: `Community Digest — ${params.dateTitle} (UTC) [continued]` } },
                { type: "context", elements: [{ type: "mrkdwn", text: range }] },
                { type: "divider" },
            ];
        }
        // Add topic block and divider
        currentBlocks.push(topicBlock);
        // Add divider between topics (but not after the last one in a set)
        if (i < topics.length - 1) {
            currentBlocks.push({ type: "divider" });
        }
    }
    // Add final block set
    if (currentBlocks.length > HEADER_BLOCK_COUNT) {
        allBlockSets.push(currentBlocks);
    }
    return allBlockSets.length > 0 ? allBlockSets : [headerBlocks];
}
// Legacy fallback for plain text
function formatDigest(summary) {
    return `*Community Digest*\n${summary}`;
}
