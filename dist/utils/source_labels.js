"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatSourceLabel = formatSourceLabel;
const link_registry_1 = require("./link_registry");
/**
 * Build a short, stable bracketed source label the LLM will see.
 * Prefer human-readable names when available (registered earlier), but do NOT include URLs here.
 */
function formatSourceLabel(msg) {
    // Discord: prefer registered channel name, then channelName, then raw id
    if (msg.source === "discord") {
        const id = msg.channelId ?? "";
        const chMeta = (0, link_registry_1.getDiscordChannelById)(id);
        const name = chMeta?.name ?? msg.channelName ?? id ?? "unknown-channel";
        // ensure label is short and safe; remove spaces/newlines
        const safe = String(name).replace(/\s+/g, "-").replace(/[^\w-]/g, "").slice(0, 40);
        return `[Discord #${safe}]`;
    }
    // Discourse/forum: prefer topic title when available, then category name, then numeric id
    if (msg.source === "discourse") {
        const tid = msg.topicId;
        if (typeof tid !== "undefined" && tid !== null) {
            const tMeta = (0, link_registry_1.getDiscourseTopicById)(Number(tid));
            const title = tMeta?.title ?? msg.channelName ?? `topic-${tid}`;
            const safeTitle = String(title).replace(/\s+/g, " ").replace(/\n+/g, " ").trim().slice(0, 60);
            return `[Forum topic:${safeTitle}]`;
        }
        const cid = msg.categoryId;
        if (typeof cid !== "undefined" && cid !== null) {
            const cMeta = (0, link_registry_1.getDiscourseCategoryById)(Number(cid));
            const cname = cMeta?.name ?? msg.channelName ?? `category:${cid}`;
            const safeCat = String(cname).replace(/\s+/g, "-").replace(/[^\w-]/g, "").slice(0, 40);
            return `[Forum category:${safeCat}]`;
        }
        if (msg.forum) {
            const host = String(msg.forum).replace(/^https?:\/\//, "").split("/")[0];
            return `[Forum ${host}]`;
        }
        return `[Forum]`;
    }
    return `[Source ${String(msg.source)}]`;
}
