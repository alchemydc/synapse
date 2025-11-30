// src/services/discord/DiscordSource.ts
import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import pRetry from "p-retry";
import { Source } from "../../core/interfaces";
import { NormalizedMessage } from "../../core/types";
import { Config } from "../../config";
import { logger } from "../../utils/logger";


export class DiscordSource implements Source {
    name = "discord";
    private config: Config;

    constructor(config: Config) {
        this.config = config;
    }

    isEnabled(): boolean {
        return this.config.DISCORD_ENABLED;
    }

    async fetchMessages(windowHours: number): Promise<NormalizedMessage[]> {
        if (!this.isEnabled()) return [];

        const token = this.config.DISCORD_TOKEN;
        const channelIds = this.config.DISCORD_CHANNELS;

        if (!token) {
            logger.error("DISCORD_TOKEN is required but missing");
            throw new Error("DISCORD_TOKEN is required to fetch Discord messages");
        }

        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
        });

        try {
            await client.login(token);
        } catch (err: any) {
            logger.error(`Failed to login to Discord: ${err.message}`);
            throw err;
        }

        const now = Date.now();
        const since = now - windowHours * 60 * 60 * 1000;
        const messages: NormalizedMessage[] = [];

        try {
            for (const channelId of channelIds) {
                try {
                    const channel = await client.channels.fetch(channelId);
                    if (!channel || !(channel instanceof TextChannel)) continue;

                    let lastId: string | undefined = undefined;
                    let done = false;

                    while (!done) {
                        const batch = await pRetry(
                            () => channel.messages.fetch({ limit: 100, before: lastId }),
                            { retries: 3 }
                        );

                        if (batch.size === 0) break;

                        for (const msg of batch.values()) {
                            if (msg.createdTimestamp < since) {
                                done = true;
                                break;
                            }
                            if (msg.author.bot || !msg.content.trim()) continue;

                            messages.push({
                                id: msg.id,
                                source: "discord",
                                channelId,
                                channelName: (channel as TextChannel).name,
                                author: msg.author.username,
                                content: msg.content,
                                createdAt: new Date(msg.createdTimestamp).toISOString(),
                                url: msg.url,
                            });
                            lastId = msg.id;
                        }
                        if (batch.size < 100) break;
                    }
                } catch (err: any) {
                    logger.warn(`Failed to fetch channel ${channelId}: ${err.message}`);
                }
            }
        } finally {
            await client.destroy();
        }

        return messages;
    }
}
