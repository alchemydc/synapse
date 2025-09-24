"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectSourceLinks = injectSourceLinks;
// src/utils/source_link_inject.ts
const link_registry_1 = require("./link_registry");
/**
 * Replace stable bracketed source labels with Slack-friendly <url|label> links
 * when metadata is available in the runtime registry.
 *
 * This file sanitizes visible labels to avoid leaking emojis or decorative
 * characters captured from channel names into the Slack-visible link text.
 */
/**
 * Produce a safe visible label by removing emoji and control/decorative
 * characters while preserving letters, numbers, spaces, hyphens, and underscores.
 */
function sanitizeVisible(s) {
    if (!s)
        return "";
    try {
        // Normalize first
        const normalized = String(s).normalize("NFKD");
        // Try building a Unicode-property RegExp at runtime to avoid parse-time errors in environments
        // that don't support \p escapes.
        try {
            const re = new RegExp("[^\\p{L}\\p{N}\\s\\-\\_:]", "gu");
            return normalized.replace(re, "").replace(/\s+/g, " ").trim();
        }
        catch {
            // Fallback if \p{...} is not supported at runtime
            return normalized.replace(/[^\w\s\-\_:]/g, "").replace(/\s+/g, " ").trim();
        }
    }
    catch {
        // Ultimate fallback
        return String(s).replace(/[^\w\s\-\_:]/g, "").replace(/\s+/g, " ").trim();
    }
}
/**
 * Replace stable bracketed labels with slack links.
 */
function injectSourceLinks(md) {
    if (!md || typeof md !== "string")
        return md;
    // Discord: [Discord #name] optionally followed by raw channel id
    md = md.replace(/\[Discord\s+#([^\]]+)\](?:\s+([0-9]{8,30}))?/g, (_m, label, id) => {
        // Prefer lookup by numeric id if present
        if (id) {
            const byId = (0, link_registry_1.getDiscordChannelById)(id);
            if (byId && byId.url) {
                const visible = `#${sanitizeVisible(byId.name) || id}`;
                return `[Discord <${byId.url}|${visible}>]`;
            }
        }
        const meta = (0, link_registry_1.lookupDiscordByLabel)(`#${label}`);
        if (meta && meta.url) {
            const visible = `#${sanitizeVisible(meta.name) || label}`;
            return `[Discord <${meta.url}|${visible}>]`;
        }
        return `[Discord #${label}]${id ? " " + id : ""}`;
    });
    // Forum topic: [Forum topic:Some title] — also handle if LLM preserved a following disc-topic-<id>
    md = md.replace(/\[Forum\s+topic:([^\]]+)\](?:\s+(disc-topic-(\d+)))?/g, (_m, title, discToken, topicIdStr) => {
        // If a disc-topic-N token followed, prefer direct id lookup
        if (topicIdStr) {
            const tid = Number(topicIdStr);
            const tMeta = (0, link_registry_1.getDiscourseTopicById)(tid);
            if (tMeta && tMeta.url) {
                const visible = `topic: ${sanitizeVisible(tMeta.title) || `topic-${tid}`}`;
                return `[Forum <${tMeta.url}|${visible}>]`;
            }
        }
        const meta = (0, link_registry_1.lookupDiscourseTopicByLabel)(title);
        if (meta && meta.url) {
            const visible = `topic: ${sanitizeVisible(meta.title) || title}`;
            return `[Forum <${meta.url}|${visible}>]`;
        }
        return `[Forum topic:${title}]${discToken ? " " + discToken : ""}`;
    });
    // Forum category: [Forum category:some-name] — if followed by disc-topic-N, try linking to the topic instead
    md = md.replace(/\[Forum\s+category:([^\]]+)\](?:\s+(disc-topic-(\d+)))?/g, (_m, label, discToken, topicIdStr) => {
        if (topicIdStr) {
            const tid = Number(topicIdStr);
            const tMeta = (0, link_registry_1.getDiscourseTopicById)(tid);
            if (tMeta && tMeta.url) {
                const visible = `topic: ${sanitizeVisible(tMeta.title) || `topic-${tid}`}`;
                return `[Forum <${tMeta.url}|${visible}>]`;
            }
        }
        const meta = (0, link_registry_1.lookupDiscourseCategoryByLabel)(label);
        if (meta && meta.url) {
            const visible = `category: ${sanitizeVisible(meta.name) || label}`;
            return `[Forum <${meta.url}|${visible}>]`;
        }
        return `[Forum category:${label}]${discToken ? " " + discToken : ""}`;
    });
    return md;
}
