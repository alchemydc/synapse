// main.ts
import dotenv from "dotenv";
import { loadConfig, Config } from "./config";
import { fetchMessages, MessageDTO } from "./services/discord";
import { fetchDiscourseMessages, NormalizedMessage } from "./services/discourse";
import { summarizeDiscordChannel, summarizeDiscourseTopic } from "./services/llm/gemini";
import { postDigestBlocks } from "./services/slack";
import { formatDigest, buildDigestBlocks } from "./utils/format";
import { logger } from "./utils/logger";
import { getUtcDailyWindowFrom } from "./utils/time";
import { applyMessageFilters } from "./utils/filters";

dotenv.config();
const config: Config = loadConfig();

const isDebug = config.LOG_LEVEL && config.LOG_LEVEL.toLowerCase() === "debug";

logger.info("Synapse Digest Bot starting...");
logger.info(`Discord channels: ${config.DISCORD_CHANNELS.join(", ")}`);
logger.info(`Window: ${config.DIGEST_WINDOW_HOURS} hours`);
if (isDebug) logger.debug("[DEBUG] Log level set to debug");

async function run() {
  const summaries: string[] = [];
  const { start, end, dateTitle } = getUtcDailyWindowFrom(new Date());

  // === DISCORD CHANNELS ===
  if (config.DISCORD_ENABLED) {
    logger.info(`Fetching from ${config.DISCORD_CHANNELS.length} Discord channels...`);

    const allDiscordMessages = await fetchMessages(
      config.DISCORD_TOKEN,
      config.DISCORD_CHANNELS,
      config.DIGEST_WINDOW_HOURS
    );

    logger.info(`Fetched ${allDiscordMessages.length} total Discord messages.`);

    // Group messages by channel
    const messagesByChannel = new Map<string, MessageDTO[]>();
    for (const msg of allDiscordMessages) {
      if (!messagesByChannel.has(msg.channelId)) {
        messagesByChannel.set(msg.channelId, []);
      }
      messagesByChannel.get(msg.channelId)!.push(msg);
    }

    logger.info(`Processing ${messagesByChannel.size} Discord channels...`);

    for (const [channelId, messages] of messagesByChannel) {
      const filtered = applyMessageFilters(messages, config);

      if (filtered.length === 0) {
        logger.info(`No messages after filtering for channel ${channelId}`);
        continue;
      }

      // Channel name and guildId already fetched by Discord API
      const channelName = filtered[0].channelName || channelId;
      const guildId = filtered[0].url?.split('/')[4] || 'unknown';

      if (isDebug) {
        logger.debug("Fetched messages for channel (debug)", {
          channelId,
          channelName,
          count: filtered.length,
          messages: filtered.map(m => ({
            id: m.id,
            author: m.author,
            createdAt: m.createdAt,
            content: (m.content || "").slice(0, 500)
          }))
        });
      }

      logger.info(`Summarizing ${filtered.length} messages from #${channelName}...`);

      const summary = await summarizeDiscordChannel(
        filtered,
        channelName,
        channelId,
        guildId,
        config
      );

      if (summary.trim()) {
        summaries.push(summary);
      }
    }
  } else {
    logger.info("Discord disabled by config.");
  }

  // === DISCOURSE FORUM ===
  if (config.ENABLE_DISCOURSE === false) {
    logger.info("Discourse disabled by flag.");
  } else if (config.DISCOURSE_ENABLED) {
    logger.info("Fetching from Discourse forum...");

    try {
      const forumMessages = await fetchDiscourseMessages({
        baseUrl: config.DISCOURSE_BASE_URL!,
        apiKey: config.DISCOURSE_API_KEY!,
        apiUser: config.DISCOURSE_API_USERNAME!,
        windowHours: config.DIGEST_WINDOW_HOURS,
        maxTopics: config.DISCOURSE_MAX_TOPICS ?? 50,
        lookbackHours: config.DISCOURSE_LOOKBACK_HOURS,
      });

      logger.info(`Fetched ${forumMessages.length} messages from Discourse.`);

      // Group by topicId
      const topicGroups = new Map<number, NormalizedMessage[]>();
      for (const msg of forumMessages) {
        if (!msg.topicId) continue;
        if (!topicGroups.has(msg.topicId)) {
          topicGroups.set(msg.topicId, []);
        }
        topicGroups.get(msg.topicId)!.push(msg);
      }

      logger.info(`Processing ${topicGroups.size} forum topics...`);

      for (const [topicId, messages] of topicGroups) {
        const filtered = applyMessageFilters(messages, config);

        if (filtered.length === 0) {
          logger.info(`No messages after filtering for topic ${topicId}`);
          continue;
        }

        if (isDebug) {
          logger.debug("Fetched messages for topic (debug)", {
            topicId,
            topicTitle: filtered[0].topicTitle,
            count: filtered.length,
            messages: filtered.map(m => ({
              id: m.id,
              author: m.author,
              createdAt: m.createdAt,
              content: (m.content || "").slice(0, 500)
            }))
          });
        }

        // Topic info from first message
        const topicTitle = filtered[0].topicTitle || `Topic ${topicId}`;
        const topicUrl = filtered[0].url;

        logger.info(`Summarizing topic: ${topicTitle}...`);

        const summary = await summarizeDiscourseTopic(
          filtered,
          topicTitle,
          topicUrl,
          config
        );

        if (summary.trim()) {
          summaries.push(summary);
        }
      }
    } catch (err: any) {
      logger.error("Discourse fetch failed:", err);
      throw err; // Fail entire run as per user requirement
    }
  } else {
    logger.info("Discourse disabled (incomplete credentials).");
  }

  // === FORMAT AND POST TO SLACK ===
  if (summaries.length === 0) {
    logger.info("No summaries generated, skipping Slack post");
    return;
  }

  logger.info(`Formatting ${summaries.length} summaries for Slack...`);
  const combinedSummary = summaries.join('\n\n');

  const blockSets = buildDigestBlocks({
    summary: combinedSummary,
    start,
    end,
    dateTitle,
  });

  const fallback = formatDigest(combinedSummary);

  logger.info("Posting digest to Slack...");
  if (blockSets.length > 1) {
    logger.info(`Digest split into ${blockSets.length} messages due to block count`);
  }

  for (let i = 0; i < blockSets.length; i++) {
    const blocks = blockSets[i];
    const messageFallback = blockSets.length > 1
      ? `${fallback} (Part ${i + 1}/${blockSets.length})`
      : fallback;

    logger.info(`Posting message ${i + 1}/${blockSets.length}...`);
    await postDigestBlocks(blocks, messageFallback, config);
  }

  logger.info("Pipeline complete.");
}

run().catch((err) => {
  logger.error("Pipeline failed:", err);
  process.exit(1);
});
