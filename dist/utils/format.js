"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeToSlackMrkdwn = normalizeToSlackMrkdwn;
exports.truncateSection = truncateSection;
exports.stripLeadingDigestTitle = stripLeadingDigestTitle;
exports.buildDigestBlocks = buildDigestBlocks;
exports.formatDigest = formatDigest;
const logger_1 = require("./logger");
// utils/format.ts
// Normalize generic markdown to Slack mrkdwn
const DEBUG_SLICE = 1200;
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
    if (process.env.LOG_LEVEL && process.env.LOG_LEVEL.toLowerCase() === "debug") {
        logger_1.logger.debug("[DEBUG] buildDigestBlocks.cleaned", cleaned.slice(0, DEBUG_SLICE));
    }
    let mrkdwn = normalizeToSlackMrkdwn(cleaned);
    if (process.env.LOG_LEVEL && process.env.LOG_LEVEL.toLowerCase() === "debug") {
        logger_1.logger.debug("[DEBUG] buildDigestBlocks.mrkdwn", mrkdwn.slice(0, DEBUG_SLICE));
    }
    // Extract trailing global Participants line (if present) and remove it from mrkdwn so
    // it can be rendered as a single context block after splitting logic.
    let trailingParticipants = null;
    const participantsMatch = mrkdwn.match(/\n{1,2}Participants:\s*(.+)$/i);
    if (participantsMatch && participantsMatch.index !== undefined) {
        trailingParticipants = participantsMatch[1].trim();
        mrkdwn = mrkdwn.slice(0, participantsMatch.index).trim();
    }
    const range = `Time window: ${params.dateTitle} 00:00–${params.end.toISOString().slice(0, 10)} 00:00 UTC`;
    const blocks = [
        { type: "header", text: { type: "plain_text", text: `Community Digest — ${params.dateTitle} (UTC)` } },
        { type: "context", elements: [{ type: "mrkdwn", text: range }] },
        { type: "divider" },
    ];
    // If the digest doesn't include explicit sectioning, attempt to avoid aggressive truncation
    // by splitting legacy single-blob output into smaller topic/paragraph sections.
    if (!/^\s*\*?Summary\*?/im.test(mrkdwn)) {
        const MAX_SECTION_CHARS = Number(process.env.SECTION_CHAR_LIMIT) || 2800;
        // Helper to push a section and ensure the very first pushed section is labeled "*Summary*"
        let firstSectionPrefixed = false;
        function pushSection(text) {
            if (!text)
                return;
            const payload = firstSectionPrefixed ? text : `*Summary*\n${text}`;
            firstSectionPrefixed = true;
            blocks.push({ type: "section", text: { type: "mrkdwn", text: payload } });
        }
        // Helper to append trailing global Participants (if extracted) before returning.
        function appendTrailingParticipants() {
            if (trailingParticipants) {
                blocks.push({
                    type: "context",
                    elements: [{ type: "mrkdwn", text: `Participants: ${trailingParticipants}` }],
                });
            }
        }
        // First, try to split on legacy '---' group delimiter produced by older prompts.
        const legacyGroups = mrkdwn.split(/\n{2}---\n{2}/).map(s => s.trim()).filter(Boolean);
        if (legacyGroups.length > 1) {
            for (const group of legacyGroups) {
                const groupParts = group.length > MAX_SECTION_CHARS ? group.split(/\n{2,}/).map(p => p.trim()).filter(Boolean) : [group];
                for (const part of groupParts) {
                    const text = truncateSection(part, MAX_SECTION_CHARS);
                    if (text) {
                        pushSection(text);
                    }
                }
                // Insert a divider between legacy groups for readability
                blocks.push({ type: "divider" });
            }
            // remove trailing divider if present
            if (blocks.length && blocks[blocks.length - 1].type === "divider") {
                blocks.pop();
            }
            appendTrailingParticipants();
            return blocks;
        }
        // Next, try splitting by paragraphs (two-or-more newlines) to create smaller sections
        const paragraphs = mrkdwn.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
        if (paragraphs.length > 1) {
            for (const para of paragraphs) {
                // Try to extract a trailing Participants line similar to the normal parsing below.
                const lines = para.split("\n").map(l => l.trim()).filter(Boolean);
                let participantsLine = null;
                const last = lines[lines.length - 1] || "";
                const match = last.match(/^\s*Participants:\s*(.+)$/i);
                if (match) {
                    participantsLine = match[1].trim();
                    lines.pop();
                }
                const sectionText = truncateSection(lines.join("\n\n"), MAX_SECTION_CHARS);
                if (sectionText) {
                    pushSection(sectionText);
                }
                if (participantsLine) {
                    blocks.push({
                        type: "context",
                        elements: [{ type: "mrkdwn", text: `Participants: ${participantsLine}` }],
                    });
                }
            }
            appendTrailingParticipants();
            return blocks;
        }
        // As a last resort for a single very large blob, soft-split by character windows at safe boundaries.
        const max = MAX_SECTION_CHARS;
        let cursor = 0;
        while (cursor < mrkdwn.length) {
            const window = mrkdwn.slice(cursor, cursor + max);
            // Prefer splitting at a paragraph boundary; fall back to raw slice.
            const br = window.lastIndexOf("\n\n");
            const part = br > Math.floor(max / 4) ? window.slice(0, br) : window;
            const text = truncateSection(part, max);
            if (text) {
                pushSection(text);
            }
            cursor += part.length || max;
        }
        appendTrailingParticipants();
        return blocks;
    }
    // Split digest into logical sections by two-or-more newlines.
    // Each section may end with a "Participants: ..." line which we render as a separate context block.
    const sections = mrkdwn.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
    for (const sec of sections) {
        // Try to extract a trailing Participants line
        const lines = sec.split("\n").map(l => l.trim()).filter(Boolean);
        let participantsLine = null;
        // check last line for a Participants: prefix (case-insensitive)
        const last = lines[lines.length - 1] || "";
        const match = last.match(/^\s*Participants:\s*(.+)$/i);
        if (match) {
            participantsLine = match[1].trim();
            // remove the last line from the section text
            lines.pop();
        }
        const sectionText = truncateSection(lines.join("\n\n"));
        if (sectionText) {
            blocks.push({ type: "section", text: { type: "mrkdwn", text: sectionText } });
        }
        if (participantsLine) {
            // render participants in a smaller context block
            blocks.push({
                type: "context",
                elements: [{ type: "mrkdwn", text: `Participants: ${participantsLine}` }],
            });
        }
    }
    return blocks;
}
// Legacy fallback
function formatDigest(summary) {
    return `*Community Digest*\n${summary}`;
}
