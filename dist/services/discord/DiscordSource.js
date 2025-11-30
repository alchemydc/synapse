"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordSource = void 0;
// src/services/discord/DiscordSource.ts
const discord_js_1 = require("discord.js");
const p_retry_1 = __importDefault(require("p-retry"));
const logger_1 = require("../../utils/logger");
class DiscordSource {
    name = "discord";
    config;
    constructor(config) {
        this.config = config;
    }
    isEnabled() {
        return this.config.DISCORD_ENABLED;
    }
    async fetchMessages(windowHours) {
        if (!this.isEnabled())
            return [];
        const token = this.config.DISCORD_TOKEN;
        const channelIds = this.config.DISCORD_CHANNELS;
        if (!token) {
            logger_1.logger.error("DISCORD_TOKEN is required but missing");
            throw new Error("DISCORD_TOKEN is required to fetch Discord messages");
        }
        const client = new discord_js_1.Client({
            intents: [
                discord_js_1.GatewayIntentBits.Guilds,
                discord_js_1.GatewayIntentBits.GuildMessages,
                discord_js_1.GatewayIntentBits.MessageContent,
            ],
        });
        try {
            await client.login(token);
        }
        catch (err) {
            logger_1.logger.error(`Failed to login to Discord: ${err.message}`);
            throw err;
        }
        const now = Date.now();
        const since = now - windowHours * 60 * 60 * 1000;
        const messages = [];
        try {
            for (const channelId of channelIds) {
                try {
                    const channel = await client.channels.fetch(channelId);
                    if (!channel || !(channel instanceof discord_js_1.TextChannel))
                        continue;
                    let lastId = undefined;
                    let done = false;
                    while (!done) {
                        const batch = await (0, p_retry_1.default)(() => channel.messages.fetch({ limit: 100, before: lastId }), { retries: 3 });
                        if (batch.size === 0)
                            break;
                        for (const msg of batch.values()) {
                            if (msg.createdTimestamp < since) {
                                done = true;
                                break;
                            }
                            if (msg.author.bot || !msg.content.trim())
                                continue;
                            messages.push({
                                id: msg.id,
                                source: "discord",
                                channelId,
                                channelName: channel.name,
                                author: msg.author.username,
                                content: msg.content,
                                createdAt: new Date(msg.createdTimestamp).toISOString(),
                                url: msg.url,
                            });
                            lastId = msg.id;
                        }
                        if (batch.size < 100)
                            break;
                    }
                }
                catch (err) {
                    logger_1.logger.warn(`Failed to fetch channel ${channelId}: ${err.message}`);
                }
            }
        }
        finally {
            await client.destroy();
        }
        return messages;
    }
}
exports.DiscordSource = DiscordSource;
