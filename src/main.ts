// main.ts
import dotenv from "dotenv";
import { loadConfig, Config } from "./config";
import { fetchMessages } from "./services/discord";
import { mapDiscordToNormalized } from "./services/discord/adapter";
import { fetchDiscourseMessages } from "./services/discourse";
import { summarize, summarizeAttributed } from "./services/llm/gemini";
import { postDigestBlocks } from "./services/slack";
import { formatDigest, buildDigestBlocks } from "./utils/format";
import { logger } from "./utils/logger";
import { getUtcDailyWindowFrom } from "./utils/time";
import { applyMessageFilters } from "./utils/filters";
import injectMissingParticipants from "./utils/participants_fallback";
import { clusterMessages, TopicCluster } from "./utils/topics";

dotenv.config();
const config: Config = loadConfig();

logger.info("Synapse Digest Bot starting...");
logger.info(`Channels: ${config.DISCORD_CHANNELS.join(", ")}`);
logger.info(`Window: ${config.DIGEST_WINDOW_HOURS} hours`);

async function run() {
  logger.info("Fetching messages from Discord...");
  const discordRaw = await fetchMessages(
    config.DISCORD_TOKEN,
    config.DISCORD_CHANNELS,
    config.DIGEST_WINDOW_HOURS
  );
  logger.info(`Fetched ${discordRaw.length} messages from Discord.`);

  // normalize Discord messages
  const normalizedDiscord = mapDiscordToNormalized(discordRaw);

  // optionally fetch Discourse messages
  let normalizedAll = [...normalizedDiscord];
  if (config.DISCOURSE_ENABLED) {
    logger.info("Discourse config detected — fetching messages from Discourse...");
    try {
      const discourseMsgs = await fetchDiscourseMessages({
        baseUrl: config.DISCOURSE_BASE_URL!,
        apiKey: config.DISCOURSE_API_KEY!,
        apiUser: config.DISCOURSE_API_USERNAME!,
        windowHours: config.DIGEST_WINDOW_HOURS,
        maxTopics: config.DISCOURSE_MAX_TOPICS ?? 50,
        lookbackHours: config.DISCOURSE_LOOKBACK_HOURS,
      });
      logger.info(`Fetched ${discourseMsgs.length} messages from Discourse.`);
      normalizedAll.push(...discourseMsgs);
    } catch (err: any) {
      logger.warn("Discourse fetch failed; continuing with Discord-only messages.", { error: err?.message || err });
    }
  } else {
    logger.info("Discourse disabled (env incomplete).");
  }

  // Reuse existing filters by mapping NormalizedMessage -> Discord-like MessageDTO shape
  const candidateMessages = normalizedAll.map((m) => ({
    id: m.id,
    channelId: m.channelId || "",
    author: m.author,
    content: m.content,
    createdAt: m.createdAt,
    url: m.url,
  }));

  logger.info("Applying filters...");
  const filteredMessages = applyMessageFilters(candidateMessages, config);
  logger.info(`Filtered to ${filteredMessages.length} messages.`);

  logger.info("Summarizing messages...");

  let summary: string;
  let clusters: TopicCluster[] = [];
  if (config.ATTRIBUTION_ENABLED) {
    logger.info("Attribution enabled — building topic clusters...");
    clusters = clusterMessages(filteredMessages, config.TOPIC_GAP_MINUTES);
    logger.info(`Built ${clusters.length} topic clusters for attribution.`);
    summary = await summarizeAttributed(clusters, config);

    if (config.ATTRIBUTION_FALLBACK_ENABLED) {
      logger.info("Attribution fallback enabled — injecting missing participant lines if needed...");
      summary = injectMissingParticipants(summary, clusters, config.MAX_TOPIC_PARTICIPANTS);
    }
  } else {
    summary = await summarize(filteredMessages, config);
  }

  // Block Kit integration
  logger.info("Formatting digest...");
  const lookbackMs = config.DIGEST_WINDOW_HOURS * 60 * 60 * 1000;
  const candidate = new Date(Date.now() - lookbackMs); // now - 24h
  const { start, end, dateTitle } = getUtcDailyWindowFrom(candidate);
  const blocks = buildDigestBlocks({
    summary,
    start,
    end,
    dateTitle,
  });
  const fallback = formatDigest(summary);

  logger.info("Posting digest to Slack...");
  await postDigestBlocks(blocks, fallback, config);
  logger.info("Pipeline complete.");
}

run().catch((err) => {
  logger.error("Pipeline failed:", err);
  process.exit(1);
});
