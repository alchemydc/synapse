// src/services/discord/types.ts

export interface DiscordMessageDTO {
    id: string;
    channelId: string;
    channelName?: string;
    author: string;
    content: string;
    createdAt: string;
    url: string;
}
