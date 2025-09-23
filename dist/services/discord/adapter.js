"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapDiscordToNormalized = mapDiscordToNormalized;
/**
 * Map Discord MessageDTO -> NormalizedMessage so downstream pipeline can treat sources uniformly.
 */
function mapDiscordToNormalized(msgs) {
    return msgs.map((m) => ({
        id: `discord-${m.id}`,
        source: "discord",
        channelId: m.channelId,
        author: m.author,
        content: m.content,
        createdAt: m.createdAt,
        url: m.url,
    }));
}
