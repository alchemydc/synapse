// main.ts
import dotenv from "dotenv";
import { loadConfig, Config } from "./config";
import { fetchMessages } from "./services/discord";
import { mapDiscordToNormalized } from "./services/discord/adapter";
import { fetchDiscourseMessages } from "./services/discourse";
import { summarize, summarizeAttributed } from "./services/llm/gemini";
import { postDigestBlocks } from "./services/slack";
import { formatDigest, buildDigestBlocks } from "./utils/format";
import { injectSourceLinks } from "./utils/source_link_inject";
import { logger } from "./utils/logger";
import { getUtcDailyWindowFrom } from "./utils/time";
import { applyMessageFilters } from "./utils/filters";
import injectMissingParticipants from "./utils/participants_fallback";
import { clusterMessages } from "./utils/topics";
import { formatSourceLabel } from "./utils/source_labels";

dotenv.config();
const config: Config = loadConfig();

const isDebug = config.LOG_LEVEL && config.LOG_LEVEL.toLowerCase() === "debug";

logger.info("Synapse Digest Bot starting...");
logger.info(`Channels: ${config.DISCORD_CHANNELS.join(", ")}`);
logger.info(`Window: ${config.DIGEST_WINDOW_HOURS} hours`);
if (isDebug) logger.debug("[DEBUG] Log level set to debug");

async function run() {
  // Gather normalized messages from enabled sources
  let normalizedAll: any[] = [];

  if (config.DISCORD_ENABLED) {
    logger.info("Fetching messages from Discord...");
    const discordRaw = await fetchMessages(
      config.DISCORD_TOKEN,
      config.DISCORD_CHANNELS,
      config.DIGEST_WINDOW_HOURS
    );
    logger.info(`Fetched ${discordRaw.length} messages from Discord.`);
    // normalize Discord messages
    const normalizedDiscord = mapDiscordToNormalized(discordRaw);
    normalizedAll.push(...normalizedDiscord);
  } else {
    logger.info("Discord disabled by config.");
  }

  // Discourse: honor explicit enable flag vs incomplete credentials
  if (config.ENABLE_DISCOURSE === false) {
    logger.info("Discourse disabled by flag.");
  } else if (config.DISCOURSE_ENABLED) {
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
      logger.warn("Discourse fetch failed; continuing with available messages.", { error: err?.message || err });
    }
  } else {
    logger.info("Discourse disabled (incomplete credentials).");
  }

  // Group messages by source identifier (Discord channel or Discourse topic).
  // For Discord use channelId; for Discourse use a stable `disc-topic-<id>` key.
  const messagesBySource = new Map<string, any[]>();
  for (const m of normalizedAll) {
    const sourceId =
      m.source === "discord" ? m.channelId : m.topicId ? `disc-topic-${m.topicId}` : m.channelId;
    if (!messagesBySource.has(sourceId)) {
      messagesBySource.set(sourceId, []);
    }
    messagesBySource.get(sourceId)!.push(m);
  }

  logger.info(`Found ${messagesBySource.size} message groups by source.`);

  const allSummaries: string[] = [];
  let totalFiltered = 0;
  let totalSummarizedGroups = 0;

  // Process each group independently: filter, (optional) cluster, summarize
  for (const [sourceId, group] of messagesBySource.entries()) {
    // Map to candidateMessages shape and inject source label into channelId
    const candidateGroup = group.map((m) => {
      const sourceLabel = formatSourceLabel({
        source: m.source,
        channelId: m.channelId,
        forum: m.forum,
        categoryId: m.categoryId,
      });
      return {
        id: m.id,
        channelId: `${sourceLabel} ${m.channelId || ""}`.trim(),
        author: m.author,
        content: m.content,
        createdAt: m.createdAt,
        url: m.url,
      };
    });

    // Ensure chronological order for clustering assumptions
    candidateGroup.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Apply existing filters to this group's messages
    const filteredGroup = applyMessageFilters(candidateGroup, config);
    if (!filteredGroup || filteredGroup.length === 0) {
      if (isDebug) logger.debug("Skipping group with no messages after filters", { sourceId });
      continue;
    }
    totalFiltered += filteredGroup.length;

    // Summarize per-group (attributed or not)
    let groupSummary = "";
    if (config.ATTRIBUTION_ENABLED) {
      if (isDebug) logger.debug("Attribution enabled for group", { sourceId, count: filteredGroup.length });
      const clustersForGroup = clusterMessages(filteredGroup, config.TOPIC_GAP_MINUTES);
      if (isDebug) logger.debug("Built clusters for group", { sourceId, clusterCount: clustersForGroup.length });
      groupSummary = await summarizeAttributed(clustersForGroup, config);

      if (config.ATTRIBUTION_FALLBACK_ENABLED) {
        if (isDebug) logger.debug("Applying attribution fallback for group", { sourceId });
        groupSummary = injectMissingParticipants(groupSummary, clustersForGroup, config.MAX_TOPIC_PARTICIPANTS);
      }
    } else {
      groupSummary = await summarize(filteredGroup, config);
    }

    if (groupSummary && groupSummary.trim().length > 0) {
      allSummaries.push(groupSummary);
      totalSummarizedGroups++;
    }
  }

  // Combine all per-source summaries into one digest
  let summary: string = allSummaries.join("\n\n---\n\n");

  if (isDebug) {
    logger.debug("[DEBUG] total.groups.summarized", totalSummarizedGroups);
    logger.debug("[DEBUG] total.filtered.messages", totalFiltered);
    logger.debug("[DEBUG] summary.raw.len", summary.length);
    logger.debug("[DEBUG] summary.raw.preview", summary.slice(0, 1200));
  }

  // Block Kit integration
  logger.info("Formatting digest...");
  const lookbackMs = config.DIGEST_WINDOW_HOURS * 60 * 60 * 1000;
  const candidate = new Date(Date.now() - lookbackMs); // now - 24h
  const { start, end, dateTitle } = getUtcDailyWindowFrom(candidate);

  // Inject links into the LLM-generated summary where registry metadata exists (configurable).
  const linkedSummary = config.LINKED_SOURCE_LABELS === false ? summary : injectSourceLinks(summary);

  const blocks = buildDigestBlocks({
    summary: linkedSummary,
    start,
    end,
    dateTitle,
  });
  const fallback = formatDigest(linkedSummary);

  logger.info("Posting digest to Slack...");
  await postDigestBlocks(blocks, fallback, config);
  logger.info("Pipeline complete.");
}

run().catch((err) => {
  logger.error("Pipeline failed:", err);
  process.exit(1);
});
