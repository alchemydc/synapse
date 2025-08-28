"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchMessages = fetchMessages;
// services/discord/index.ts
const discord_js_1 = require("discord.js");
const p_retry_1 = __importDefault(require("p-retry"));
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
