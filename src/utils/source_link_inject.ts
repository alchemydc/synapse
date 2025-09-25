// src/utils/source_link_inject.ts
import {
  lookupDiscordByLabel,
  lookupDiscourseCategoryByLabel,
  lookupDiscourseTopicByLabel,
  getDiscordChannelById,
  getDiscourseTopicById,
} from "./link_registry";
import { logger } from "./logger";

/**
 * Replace stable bracketed source labels with Slack-friendly <url|label> links
 * when metadata is available in the runtime registry.
 *
 * This file sanitizes visible labels to avoid leaking emojis or decorative
 * characters captured from channel names into the Slack-visible link text.
 */

/**
 * Produce a safe visible label by removing emoji and control/decorative
 * characters while preserving letters, numbers, spaces, hyphens, and underscores.
 */
function sanitizeVisible(s: string | undefined): string {
  if (!s) return "";
  try {
    // Normalize first
    const normalized = String(s).normalize("NFKD");
    // Try building a Unicode-property RegExp at runtime to avoid parse-time errors in environments
    // that don't support \p escapes.
    try {
      const re = new RegExp("[^\\p{L}\\p{N}\\s\\-\\_:]", "gu");
      return normalized.replace(re, "").replace(/\s+/g, " ").trim();
    } catch {
      // Fallback if \p{...} is not supported at runtime
      return normalized.replace(/[^\w\s\-\_:]/g, "").replace(/\s+/g, " ").trim();
    }
  } catch {
    // Ultimate fallback
    return String(s).replace(/[^\w\s\-\_:]/g, "").replace(/\s+/g, " ").trim();
  }
}

/**
 * Replace stable bracketed labels with slack links.
 */
export function injectSourceLinks(md: string): string {
  if (!md || typeof md !== "string") return md;

  let discordFound = 0;
  let discordLinked = 0;
  const discordSamples: Array<any> = [];
 
  // Discord: [Discord #name] optionally followed by raw channel id
  md = md.replace(/\[Discord\s+#([^\]]+)\](?:\s+([0-9]{8,30}))?/g, (_m: string, label: string, id?: string) => {
    discordFound++;
    const sample: any = { label, id: id || null, byId: null, byLabel: null };
 
    // Prefer lookup by numeric id if present
    if (id) {
      const byId = getDiscordChannelById(id);
      sample.byId = byId ? { id: byId.id, name: byId.name, guildId: byId.guildId, urlPresent: Boolean(byId.url) } : null;
      if (byId) {
        // synthesize url if missing but guildId is available
        const url =
          byId.url ||
          (byId.guildId ? `https://discord.com/channels/${byId.guildId}/${id}` : undefined);
        if (url) {
          discordLinked++;
          const visible = `#${sanitizeVisible(byId.name) || id}`;
          // capture one sample for debugging
          if (discordSamples.length < 6) discordSamples.push({ used: "byId", label, id, url, visible });
          return `[Discord <${url}|${visible}>]`;
        }
      }
    }
 
    // Fallback: lookup by label text (e.g. "#general" or "general")
    const meta = lookupDiscordByLabel(`#${label}`);
    sample.byLabel = meta ? { id: meta.id, name: meta.name, guildId: (meta as any).guildId, urlPresent: Boolean(meta.url) } : null;
    if (meta) {
      const url =
        meta.url ||
        ((meta as any).guildId ? `https://discord.com/channels/${(meta as any).guildId}/${(meta as any).id}` : undefined);
      if (url) {
        discordLinked++;
        const visible = `#${sanitizeVisible(meta.name) || label}`;
        if (discordSamples.length < 6) discordSamples.push({ used: "byLabel", label, id: id || null, url, visible });
        return `[Discord <${url}|${visible}>]`;
      }
    }
 
    // No metadata available; leave the original label intact
    if (discordSamples.length < 6) discordSamples.push({ used: "none", label, id: id || null });
    return `[Discord #${label}]${id ? " " + id : ""}`;
  });

  // Forum topic: [Forum topic:Some title] — also handle if LLM preserved a following disc-topic-<id>
  md = md.replace(/\[Forum\s+topic:([^\]]+)\](?:\s+(disc-topic-(\d+)))?/g, (_m: string, title: string, discToken?: string, topicIdStr?: string) => {
    try {
      // If a disc-topic-N token followed, prefer direct id lookup
      if (topicIdStr) {
        const tid = Number(topicIdStr);
        const tMeta = getDiscourseTopicById(tid);
        if (tMeta && tMeta.url) {
          // Use the registered topic title verbatim for visible text (preserve emoji/punctuation)
          const visible = `topic: ${tMeta.title || `topic-${tid}`}`;
          if (process.env.LOG_LEVEL && process.env.LOG_LEVEL.toLowerCase() === "debug") {
            logger.debug("[DEBUG] injectSourceLinks.forumTopic (byId)", { title, discToken, topicId: tid, url: tMeta.url });
          }
          return `[Forum <${tMeta.url}|${visible}>]`;
        }
      }

      const meta = lookupDiscourseTopicByLabel(title);
      if (meta && meta.url) {
        // Prefer the registered title verbatim so emoji/punctuation are preserved in Slack visible text
        const visible = `topic: ${meta.title || title}`;
        if (process.env.LOG_LEVEL && process.env.LOG_LEVEL.toLowerCase() === "debug") {
          logger.debug("[DEBUG] injectSourceLinks.forumTopic (byLabel)", { title, discToken, matchedTitle: meta.title, url: meta.url });
        }
        return `[Forum <${meta.url}|${visible}>]`;
      }

      if (process.env.LOG_LEVEL && process.env.LOG_LEVEL.toLowerCase() === "debug") {
        logger.debug("[DEBUG] injectSourceLinks.forumTopic.notFound", { title, discToken });
      }
    } catch (e) {
      // ignore and fallthrough to leaving original label
      try {
        if (process.env.LOG_LEVEL && process.env.LOG_LEVEL.toLowerCase() === "debug") {
          logger.debug("[DEBUG] injectSourceLinks.forumTopic.error", { title, discToken, error: (e as any)?.message || e });
        }
      } catch {}
    }
    return `[Forum topic:${title}]${discToken ? " " + discToken : ""}`;
  });

  // Forum category: [Forum category:some-name] — if followed by disc-topic-N, try linking to the topic instead
  md = md.replace(/\[Forum\s+category:([^\]]+)\](?:\s+(disc-topic-(\d+)))?/g, (_m: string, label: string, discToken?: string, topicIdStr?: string) => {
    if (topicIdStr) {
      const tid = Number(topicIdStr);
      const tMeta = getDiscourseTopicById(tid);
      if (tMeta && tMeta.url) {
        const visible = `topic: ${sanitizeVisible(tMeta.title) || `topic-${tid}`}`;
        return `[Forum <${tMeta.url}|${visible}>]`;
      }
    }
    const meta = lookupDiscourseCategoryByLabel(label);
    if (meta && meta.url) {
      const visible = `category: ${sanitizeVisible(meta.name) || label}`;
      return `[Forum <${meta.url}|${visible}>]`;
    }
    return `[Forum category:${label}]${discToken ? " " + discToken : ""}`;
  });

  if (process.env.LOG_LEVEL && process.env.LOG_LEVEL.toLowerCase() === "debug") {
    try {
      logger.debug("[DEBUG] injectSourceLinks.discord", { discordFound, discordLinked, samples: discordSamples });
    } catch (e) {
      // ignore logging failures
    }
  }

  return md;
}
