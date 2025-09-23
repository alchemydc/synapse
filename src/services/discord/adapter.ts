// src/services/discord/adapter.ts
import { MessageDTO } from "./index";
import type { NormalizedMessage } from "../discourse";

/**
 * Map Discord MessageDTO -> NormalizedMessage so downstream pipeline can treat sources uniformly.
 */
export function mapDiscordToNormalized(msgs: MessageDTO[]): NormalizedMessage[] {
  return msgs.map((m) => ({
    id: `discord-${m.id}`,
    source: "discord",
    channelId: m.channelId,
    channelName: m.channelName,
    author: m.author,
    content: m.content,
    createdAt: m.createdAt,
    url: m.url,
  }));
}
