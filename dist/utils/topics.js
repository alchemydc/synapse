"use strict";
/**
 * src/utils/topics.ts
 *
 * Utilities to cluster Discord messages into lightweight "topic" windows
 * and extract participants for per-topic attribution in digests.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.clusterMessages = clusterMessages;
exports.extractParticipants = extractParticipants;
exports.formatParticipantList = formatParticipantList;
const UNKNOWN_AUTHOR = "unknown";
/**
 * clusterMessages - group messages into topic windows by channel + time gap
 * @param messages unsorted array of MessageDTO
 * @param gapMinutes break cluster when gap (minutes) exceeded
 */
function clusterMessages(messages, gapMinutes = 20) {
    if (!messages || messages.length === 0)
        return [];
    // Sort by timestamp ascending to produce globally chronological clusters.
    // This interleaves channels (Discord + Discourse) so the LLM sees time-ordered topics
    // and prevents one source from consuming the token budget before others.
    const sorted = [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const clusters = [];
    let current = null;
    let id = 1;
    const gapMs = gapMinutes * 60 * 1000;
    for (const msg of sorted) {
        const ts = new Date(msg.createdAt).getTime();
        if (!current) {
            current = {
                id: id++,
                channelId: msg.channelId,
                start: msg.createdAt,
                end: msg.createdAt,
                messages: [msg],
                participants: [],
            };
            continue;
        }
        const lastMsg = current.messages[current.messages.length - 1];
        const lastTs = new Date(lastMsg.createdAt).getTime();
        const channelChanged = msg.channelId !== current.channelId;
        const gapExceeded = ts - lastTs > gapMs;
        if (channelChanged || gapExceeded) {
            // finalize participants
            current.participants = extractParticipants(current);
            clusters.push(current);
            current = {
                id: id++,
                channelId: msg.channelId,
                start: msg.createdAt,
                end: msg.createdAt,
                messages: [msg],
                participants: [],
            };
        }
        else {
            current.messages.push(msg);
            current.end = msg.createdAt;
        }
    }
    if (current) {
        current.participants = extractParticipants(current);
        clusters.push(current);
    }
    return clusters;
}
/**
 * extractParticipants - return unique author names in chronological order
 */
function extractParticipants(cluster) {
    const seen = new Set();
    const out = [];
    for (const m of cluster.messages) {
        const name = m.author || UNKNOWN_AUTHOR;
        if (!seen.has(name)) {
            seen.add(name);
            out.push(name);
        }
    }
    return out;
}
/**
 * formatParticipantList - produce a compact comma-separated list capped by max
 * returns e.g. "alice, bob, carol +2"
 */
function formatParticipantList(list, max = 6) {
    if (!list || list.length === 0)
        return "";
    if (list.length <= max)
        return list.join(", ");
    const shown = list.slice(0, max).join(", ");
    const remaining = list.length - max;
    return `${shown} +${remaining}`;
}
