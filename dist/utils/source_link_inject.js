"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectSourceLinks = injectSourceLinks;
// src/utils/source_link_inject.ts
const link_registry_1 = require("./link_registry");
/**
 * Replace stable bracketed source labels with Slack-friendly <url|label> links
 * when metadata is available in the runtime registry.
 *
 * Examples it recognizes (produced by formatSourceLabel):
 *   [Discord #general]
 *   [Forum topic:Some topic title]
 *   [Forum category:category-name]
 *
 * Behavior:
 * - If a matching meta entry is found, replace inner label with a Slack link:
 *     [Discord <https://...|#general>]
 * - If no metadata found, leave label unchanged.
 *
 * This function is conservative and only replaces the recognized bracketed labels.
 */
function injectSourceLinks(md) {
    if (!md || typeof md !== "string")
        return md;
    // Discord: [Discord #name]
    md = md.replace(/\[Discord\s+#([^\]]+)\]/g, (_m, label) => {
        const meta = (0, link_registry_1.lookupDiscordByLabel)(`#${label}`);
        if (meta && meta.url) {
            // show as: [Discord <url|#name>]
            return `[Discord <${meta.url}|#${meta.name}>]`;
        }
        return `[Discord #${label}]`;
    });
    // Forum topic: [Forum topic:Some title]
    md = md.replace(/\[Forum\s+topic:([^\]]+)\]/g, (_m, title) => {
        const meta = (0, link_registry_1.lookupDiscourseTopicByLabel)(title);
        if (meta && meta.url) {
            // Keep the visible label short: "topic: Title"
            const visible = `topic: ${meta.title}`;
            return `[Forum <${meta.url}|${visible}>]`;
        }
        return `[Forum topic:${title}]`;
    });
    // Forum category: [Forum category:some-name]
    md = md.replace(/\[Forum\s+category:([^\]]+)\]/g, (_m, label) => {
        const meta = (0, link_registry_1.lookupDiscourseCategoryByLabel)(label);
        if (meta && meta.url) {
            const visible = `category: ${meta.name}`;
            return `[Forum <${meta.url}|${visible}>]`;
        }
        return `[Forum category:${label}]`;
    });
    return md;
}
