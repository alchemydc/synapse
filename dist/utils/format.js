"use strict";
// utils/format.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeToSlackMrkdwn = normalizeToSlackMrkdwn;
exports.truncateSection = truncateSection;
exports.stripLeadingDigestTitle = stripLeadingDigestTitle;
exports.buildDigestBlocks = buildDigestBlocks;
exports.formatDigest = formatDigest;
// Normalize generic markdown to Slack mrkdwn
function normalizeToSlackMrkdwn(md) {
    // Protect fenced code blocks
    const fences = [];
    md = md.replace(/```([\s\S]*?)```/g, (_m, p1) => {
        fences.push(p1);
        return `__FENCE_${fences.length - 1}__`;
    });
    // Protect inline code
    const inlines = [];
    md = md.replace(/`([^`]+)`/g, (_m, p1) => {
        inlines.push(p1);
        return `__INL_${inlines.length - 1}__`;
    });
    let out = md
        // headings -> bold lines
        .replace(/^#{1,6}\s+(.*)$/gm, "*$1*")
        // bold: **text** and __text__ -> *text*
        .replace(/\*\*([^*]+)\*\*/g, "*$1*")
        .replace(/__([^_]+)__/g, "*$1*")
        // ensure label lines like **Key Topics:** -> *Key Topics:*
        .replace(/^\*([^*]+:)\*$/gm, "*$1*")
        // links [text](url) -> <url|text>
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "<$2|$1>")
        // lists normalization...
        .replace(/^\s*\d+\.\s+/gm, "- ")
        .replace(/^\s*[•*]\s+/gm, "- ")
        .replace(/^\s{1,}-(\s+)/gm, "-$1")
        .replace(/([^\n])\n(-\s)/g, "$1\n\n$2")
        .replace(/\n{3,}/g, "\n\n")
        // Normalize label emphasis around colon-terminated labels to single *
        .replace(/(^|\n)-\s+\*{1,2}([^*\n]+:)\*{1,2}(?=\s|$)/g, "$1- *$2*")
        .replace(/(^|\n)\*{2}([^*\n]+:)\*{1,2}(?=\s|$)/g, "$1*$2*")
        .replace(/(^|\n)\*{1,2}([^*\n]+:)\*{2}(?=\s|$)/g, "$1*$2*")
        .replace(/\*\*([^*\n]+:)\*\*/g, "*$1*");
    // Restore code blocks and inline code
    out = out.replace(/__FENCE_(\d+)__/g, (_m, i) => "```" + fences[+i] + "```");
    out = out.replace(/__INL_(\d+)__/g, (_m, i) => "`" + inlines[+i] + "`");
    return out;
}
function truncateSection(text, max = 2800) {
    return text.length <= max ? text : text.slice(0, max - 1) + "…";
}
function stripLeadingDigestTitle(s) {
    // Remove a leading "Community Digest" line (with optional markdown, date, etc.)
    return s.replace(/^\s*(?:[#*]+\s*)?Community\s+Digest(?:\s*-\s*\d{4}-\d{2}-\d{2})?\s*:?\s*\n?/i, "").replace(/^\*\s*\n/, "").trimStart();
}
function buildDigestBlocks(params) {
    const cleaned = stripLeadingDigestTitle(params.summary);
    const mrkdwn = normalizeToSlackMrkdwn(cleaned);
    const range = `Time window: ${params.dateTitle} 00:00–${params.end.toISOString().slice(0, 10)} 00:00 UTC`;
    return [
        { type: "header", text: { type: "plain_text", text: `Community Digest — ${params.dateTitle} (UTC)` } },
        { type: "context", elements: [{ type: "mrkdwn", text: range }] },
        { type: "divider" },
        { type: "section", text: { type: "mrkdwn", text: `*Summary*\n${truncateSection(mrkdwn)}` } }
    ];
}
// Legacy fallback
function formatDigest(summary) {
    return `*Community Digest*\n${summary}`;
}
