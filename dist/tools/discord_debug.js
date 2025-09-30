"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/tools/discord_debug.ts
const dotenv_1 = __importDefault(require("dotenv"));
const discord_js_1 = require("discord.js");
const logger_1 = require("../utils/logger");
const index_1 = require("../config/index");
dotenv_1.default.config();
async function main() {
    const config = (0, index_1.loadConfig)();
    const token = process.env.DISCORD_TOKEN;
    const testChannelId = process.env.DISCORD_TEST_CHANNEL_ID;
    if (!token)
        throw new Error("DISCORD_TOKEN not set");
    const isDebug = config.LOG_LEVEL === "debug";
    const windowMs = config.DIGEST_WINDOW_HOURS * 60 * 60 * 1000;
    const cutoffTime = Date.now() - windowMs;
    const client = new discord_js_1.Client({
        intents: [
            discord_js_1.GatewayIntentBits.Guilds,
            discord_js_1.GatewayIntentBits.GuildMessages,
            discord_js_1.GatewayIntentBits.MessageContent,
        ],
    });
    try {
        await client.login(token);
        console.log("Logged in as", client.user?.tag);
        const guildRefs = await client.guilds.fetch();
        for (const [, ref] of guildRefs) {
            const guild = await ref.fetch();
            console.log(`Guild: ${guild.name} (${guild.id})`);
            const chans = await guild.channels.fetch();
            for (const [, ch] of chans) {
                if (!ch)
                    continue;
                if (ch.type === discord_js_1.ChannelType.GuildText ||
                    ch.type === discord_js_1.ChannelType.GuildAnnouncement) {
                    console.log(`  #${ch.name} (${ch.id})`);
                }
            }
        }
        if (testChannelId) {
            console.log("\nReading last 50 messages from", testChannelId);
            const ch = (await client.channels.fetch(testChannelId));
            if (!ch || ch.type !== discord_js_1.ChannelType.GuildText) {
                throw new Error("DISCORD_TEST_CHANNEL_ID is not a text channel");
            }
            const msgs = await ch.messages.fetch({ limit: 50 });
            const sorted = [...msgs.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
            // Filter messages within the digest window for debug logging
            const recentMessages = sorted.filter(m => m.createdTimestamp >= cutoffTime);
            if (isDebug) {
                logger_1.logger.debug(`\n=== DEBUG: All messages in ${config.DIGEST_WINDOW_HOURS}h window (${recentMessages.length} messages) ===`);
                for (const m of recentMessages) {
                    const ts = new Date(m.createdTimestamp).toISOString();
                    logger_1.logger.debug({
                        id: m.id,
                        timestamp: ts,
                        author: m.author.username,
                        content: m.content || "(empty)",
                        hasAttachments: m.attachments.size > 0,
                        hasEmbeds: m.embeds.length > 0,
                    });
                }
                logger_1.logger.debug("=== END DEBUG ===\n");
            }
            // Standard output (unchanged)
            for (const m of sorted) {
                if (!m.content?.trim())
                    continue;
                const ts = new Date(m.createdTimestamp).toISOString();
                console.log(`[${ts}] ${m.author.username}: ${m.content}`);
            }
        }
        else {
            console.log("Set DISCORD_TEST_CHANNEL_ID in .env to read message history for a channel.");
        }
    }
    finally {
        client.destroy();
    }
}
main().catch((e) => {
    console.error("Discord debug failed:", e);
    process.exit(1);
});
