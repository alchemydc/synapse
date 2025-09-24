"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchMessages = fetchMessages;
// services/discord/index.ts
const discord_js_1 = require("discord.js");
const p_retry_1 = __importDefault(require("p-retry"));
const link_registry_1 = require("../../utils/link_registry");
const logger_1 = require("../../utils/logger");
async function fetchMessages(token, channelIds, windowHours) {
    const client = new discord_js_1.Client({
        intents: [
            discord_js_1.GatewayIntentBits.Guilds,
            discord_js_1.GatewayIntentBits.GuildMessages,
            discord_js_1.GatewayIntentBits.MessageContent,
        ],
    });
    await client.login(token);
    const now = Date.now();
    const since = now - windowHours * 60 * 60 * 1000;
    const allMessages = [];
    for (const channelId of channelIds) {
        const channel = await client.channels.fetch(channelId);
        // Register channel metadata (best-effort) for link injection elsewhere
        if (channel && channel instanceof discord_js_1.TextChannel) {
            try {
                const meta = {
                    id: channelId,
                    name: channel.name,
                    guildId: channel.guildId,
                    url: `https://discord.com/channels/${channel.guildId}/${channelId}`,
                    platform: "discord",
                };
                (0, link_registry_1.registerDiscordChannel)(meta);
                if (process.env.LOG_LEVEL && process.env.LOG_LEVEL.toLowerCase() === "debug") {
                    try {
                        logger_1.logger.debug("[DEBUG] registerDiscordChannel", { id: meta.id, name: meta.name, guildId: meta.guildId, urlPresent: Boolean(meta.url) });
                    }
                    catch (e) {
                        // ignore logging failures
                    }
                }
            }
            catch (e) {
                // ignore registration failures
            }
        }
        if (!channel || !(channel instanceof discord_js_1.TextChannel))
            continue;
        let lastId = undefined;
        let done = false;
        while (!done) {
            const messages = await (0, p_retry_1.default)(() => channel.messages.fetch({ limit: 100, before: lastId }), { retries: 3 });
            if (messages.size === 0)
                break;
            for (const msg of messages.values()) {
                if (msg.createdTimestamp < since) {
                    done = true;
                    break;
                }
                if (msg.author.bot || !msg.content.trim())
                    continue;
                allMessages.push({
                    id: msg.id,
                    channelId,
                    channelName: channel.name,
                    author: msg.author.username,
                    content: msg.content,
                    createdAt: new Date(msg.createdTimestamp).toISOString(),
                    url: msg.url,
                });
                lastId = msg.id;
            }
            if (messages.size < 100)
                break;
        }
    }
    await client.destroy();
    return allMessages;
}
