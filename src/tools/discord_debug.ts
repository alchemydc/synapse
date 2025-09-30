// src/tools/discord_debug.ts
import dotenv from "dotenv";
import {
  ChannelType,
  Client,
  GatewayIntentBits,
  TextChannel,
} from "discord.js";
import { logger } from "../utils/logger";
import { loadConfig } from "../config/index";

dotenv.config();

async function main() {
  const config = loadConfig();
  const token = process.env.DISCORD_TOKEN;
  const testChannelId = process.env.DISCORD_TEST_CHANNEL_ID;
  if (!token) throw new Error("DISCORD_TOKEN not set");

  const isDebug = config.LOG_LEVEL === "debug";
  const windowMs = config.DIGEST_WINDOW_HOURS * 60 * 60 * 1000;
  const cutoffTime = Date.now() - windowMs;

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
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
        if (!ch) continue;
        if (
          ch.type === ChannelType.GuildText ||
          ch.type === ChannelType.GuildAnnouncement
        ) {
          console.log(`  #${(ch as TextChannel).name} (${ch.id})`);
        }
      }
    }

    if (testChannelId) {
      console.log("\nReading last 50 messages from", testChannelId);
      const ch = (await client.channels.fetch(testChannelId)) as TextChannel;
      if (!ch || ch.type !== ChannelType.GuildText) {
        throw new Error("DISCORD_TEST_CHANNEL_ID is not a text channel");
      }
      const msgs = await ch.messages.fetch({ limit: 50 });
      const sorted = [...msgs.values()].sort(
        (a, b) => a.createdTimestamp - b.createdTimestamp
      );
      
      // Filter messages within the digest window for debug logging
      const recentMessages = sorted.filter(m => m.createdTimestamp >= cutoffTime);
      
      if (isDebug) {
        logger.debug(`\n=== DEBUG: All messages in ${config.DIGEST_WINDOW_HOURS}h window (${recentMessages.length} messages) ===`);
        for (const m of recentMessages) {
          const ts = new Date(m.createdTimestamp).toISOString();
          logger.debug({
            id: m.id,
            timestamp: ts,
            author: m.author.username,
            content: m.content || "(empty)",
            hasAttachments: m.attachments.size > 0,
            hasEmbeds: m.embeds.length > 0,
          });
        }
        logger.debug("=== END DEBUG ===\n");
      }
      
      // Standard output (unchanged)
      for (const m of sorted) {
        if (!m.content?.trim()) continue;
        const ts = new Date(m.createdTimestamp).toISOString();
        console.log(`[${ts}] ${m.author.username}: ${m.content}`);
      }
    } else {
      console.log(
        "Set DISCORD_TEST_CHANNEL_ID in .env to read message history for a channel."
      );
    }
  } finally {
    client.destroy();
  }
}

main().catch((e) => {
  console.error("Discord debug failed:", e);
  process.exit(1);
});
