// services/discord/index.ts
import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import pRetry from "p-retry";

export interface MessageDTO {
  id: string;
  channelId: string;
  author: string;
  content: string;
  createdAt: string;
  url: string;
}

export async function fetchMessages(
  token: string,
  channelIds: string[],
  windowHours: number
): Promise<MessageDTO[]> {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  await client.login(token);

  const now = Date.now();
  const since = now - windowHours * 60 * 60 * 1000;
  const allMessages: MessageDTO[] = [];

  for (const channelId of channelIds) {
    const channel = await client.channels.fetch(channelId);
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
