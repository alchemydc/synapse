// services/discord/index.ts
import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import pRetry from "p-retry";
import { registerDiscordChannel, ChannelMeta } from "../../utils/link_registry";
import { logger } from "../../utils/logger";

export interface MessageDTO {
  id: string;
  channelId: string;
  channelName?: string;
  author: string;
  content: string;
  createdAt: string;
  url: string;
}

export async function fetchMessages(
  token: string | undefined,
  channelIds: string[],
  windowHours: number
): Promise<MessageDTO[]> {
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

  await client.login(token!);

  const now = Date.now();
  const since = now - windowHours * 60 * 60 * 1000;
  const allMessages: MessageDTO[] = [];

    for (const channelId of channelIds) {
    const channel = await client.channels.fetch(channelId);
    // Register channel metadata (best-effort) for link injection elsewhere
    if (channel && channel instanceof TextChannel) {
      try {
        const meta: ChannelMeta = {
          id: channelId,
          name: (channel as TextChannel).name,
          guildId: (channel as TextChannel).guildId,
          url: `https://discord.com/channels/${(channel as TextChannel).guildId}/${channelId}`,
          platform: "discord",
        };
        registerDiscordChannel(meta);
        if (process.env.LOG_LEVEL && process.env.LOG_LEVEL.toLowerCase() === "debug") {
          try {
            logger.debug("[DEBUG] registerDiscordChannel", { id: meta.id, name: meta.name, guildId: meta.guildId, urlPresent: Boolean(meta.url) });
          } catch (e) {
            // ignore logging failures
          }
        }
      } catch (e) {
        // ignore registration failures
      }
    }
    if (!channel || !(channel instanceof TextChannel)) continue;

    let lastId: string | undefined = undefined;
    let done = false;

    while (!done) {
      const messages = await pRetry(
        () => channel.messages.fetch({ limit: 100, before: lastId }),
        { retries: 3 }
      );
      if (messages.size === 0) break;

      for (const msg of messages.values()) {
        if (msg.createdTimestamp < since) {
          done = true;
          break;
        }
        if (msg.author.bot || !msg.content.trim()) continue;
        allMessages.push({
          id: msg.id,
          channelId,
          channelName: (channel as TextChannel).name,
          author: msg.author.username,
          content: msg.content,
          createdAt: new Date(msg.createdTimestamp).toISOString(),
          url: msg.url,
        });
        lastId = msg.id;
      }
      if (messages.size < 100) break;
    }
  }

  await client.destroy();
  return allMessages;
}
