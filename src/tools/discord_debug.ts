// src/tools/discord_debug.ts
import dotenv from "dotenv";
import {
  ChannelType,
  Client,
  GatewayIntentBits,
  TextChannel,
} from "discord.js";

dotenv.config();

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const testChannelId = process.env.DISCORD_TEST_CHANNEL_ID;
  if (!token) throw new Error("DISCORD_TOKEN not set");

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
