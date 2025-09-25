// src/utils/link_registry.ts
export type Platform = "discord" | "discourse";

export interface ChannelMeta {
  id: string; // Discord channel id string
  name: string; // human readable name (e.g., "general")
  guildId?: string; // optional guild/server id for Discord
  url?: string; // link to channel or forum listing
  platform: Platform;
}

export interface CategoryMeta {
  id: number;
  name: string;
  slug?: string;
  url?: string;
  platform: Platform;
}

export interface TopicMeta {
  id: number;
  title: string;
  url?: string;
  categoryId?: number;
  platform: Platform;
}

/**
 * Simple in-memory registries for mapping ids/names -> link metadata.
 * This is intentionally minimal and process-local. Callers should register
 * discovered channels/categories/topics during ingestion.
 */

const discordChannels: Record<string, ChannelMeta> = {}; // keyed by channel id
const discordChannelsByNameLower: Record<string, ChannelMeta> = {}; // keyed by name.toLowerCase()

const discourseCategories: Record<number, CategoryMeta> = {}; // keyed by category id
const discourseCategoriesByNameLower: Record<string, CategoryMeta> = {}; // keyed by name.toLowerCase()

const discourseTopics: Record<number, TopicMeta> = {}; // keyed by topic id
const discourseTopicsByTitleLower: Record<string, TopicMeta> = {}; // keyed by title.toLowerCase()
// Additional index: sanitized title -> TopicMeta for permissive lookups
const discourseTopicsBySanitizedLower: Record<string, TopicMeta> = {};

/**
 * Helper: create a simplified, ASCII-friendly lowercase name used for permissive lookups.
 * Strips emoji/decorative characters and keeps letters, numbers, spaces, hyphen, underscore.
 */
function sanitizeNameForLookup(s?: string): string {
  if (!s) return "";
  try {
    const normalized = String(s).normalize("NFKD");
    try {
      // collapse multiple whitespace to single space after removing unwanted chars
      return normalized.replace(/[^\p{L}\p{N}\s\-_]/gu, "").replace(/\s+/g, " ").trim().toLowerCase();
    } catch {
      return normalized.replace(/[^\w\s\-_]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
    }
  } catch {
    return String(s).replace(/[^\w\s\-_]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  }
}

// Discord
export function registerDiscordChannel(meta: ChannelMeta) {
  if (!meta || !meta.id) return;
  discordChannels[meta.id] = meta;
  if (meta.name) {
    const nameLower = meta.name.toLowerCase();
    discordChannelsByNameLower[nameLower] = meta;

    // Index a sanitized variant so lookups like "general" match "🍀┊general" etc.
    const sanitized = sanitizeNameForLookup(meta.name);
    if (sanitized && sanitized !== nameLower) {
      discordChannelsByNameLower[sanitized] = meta;
    }

    // Also index a "simple" variant removing leading non-alphanum characters (e.g., "┊zingo" -> "zingo")
    const simple = nameLower.replace(/^[^a-z0-9]+/i, "").trim();
    if (simple && simple !== nameLower && simple !== sanitized) {
      discordChannelsByNameLower[simple] = meta;
    }
  }
}

export function getDiscordChannelById(id?: string): ChannelMeta | undefined {
  if (!id) return undefined;
  return discordChannels[id];
}

export function getDiscordChannelByName(name?: string): ChannelMeta | undefined {
  if (!name) return undefined;
  return discordChannelsByNameLower[name.toLowerCase()];
}

// Discourse categories
export function registerDiscourseCategory(meta: CategoryMeta) {
  if (!meta || typeof meta.id === "undefined") return;
  discourseCategories[meta.id] = meta;
  if (meta.name) {
    discourseCategoriesByNameLower[meta.name.toLowerCase()] = meta;
  }
}

export function getDiscourseCategoryById(id?: number): CategoryMeta | undefined {
  if (typeof id === "undefined" || id === null) return undefined;
  return discourseCategories[Number(id)];
}

export function getDiscourseCategoryByName(name?: string): CategoryMeta | undefined {
  if (!name) return undefined;
  return discourseCategoriesByNameLower[name.toLowerCase()];
}

// Discourse topics
export function registerDiscourseTopic(meta: TopicMeta) {
  if (!meta || typeof meta.id === "undefined") return;
  discourseTopics[meta.id] = meta;
  if (meta.title) {
    const titleLower = meta.title.toLowerCase();
    discourseTopicsByTitleLower[titleLower] = meta;

    // Also index a sanitized variant for permissive lookups
    const sanitized = sanitizeNameForLookup(meta.title);
    if (sanitized && sanitized !== titleLower) {
      discourseTopicsBySanitizedLower[sanitized] = meta;
    }
  }
}

export function getDiscourseTopicById(id?: number): TopicMeta | undefined {
  if (typeof id === "undefined" || id === null) return undefined;
  return discourseTopics[Number(id)];
}

export function getDiscourseTopicByTitle(title?: string): TopicMeta | undefined {
  if (!title) return undefined;
  return discourseTopicsByTitleLower[title.toLowerCase()];
}

export function getDiscourseTopicBySanitizedName(name?: string): TopicMeta | undefined {
  if (!name) return undefined;
  const s = sanitizeNameForLookup(name);
  if (!s) return undefined;
  return discourseTopicsBySanitizedLower[s];
}

// Utility: try best-effort lookup by label text in bracketed labels.
// These helpers are small conveniences for the injection step.
export function lookupDiscordByLabel(labelText: string): ChannelMeta | undefined {
  // labelText might be "#general" or "general" — normalize
  const name = labelText.replace(/^#/, "").trim().toLowerCase();
  return getDiscordChannelByName(name);
}

export function lookupDiscourseCategoryByLabel(labelText: string): CategoryMeta | undefined {
  // labelText may be category name or "category:123" style; just try name first
  return getDiscourseCategoryByName(labelText.trim().toLowerCase());
}

export function lookupDiscourseTopicByLabel(labelText: string): TopicMeta | undefined {
  const raw = labelText.trim();
  // try exact title match first
  const exact = getDiscourseTopicByTitle(raw);
  if (exact) return exact;
  // fallback to sanitized lookup
  const sanitized = getDiscourseTopicBySanitizedName(raw);
  if (sanitized) return sanitized;
  return undefined;
}

/**
 * Reset all in-memory registries — intended for unit tests.
 */
export function resetRegistries() {
  for (const k of Object.keys(discordChannels)) delete (discordChannels as any)[k];
  for (const k of Object.keys(discordChannelsByNameLower)) delete (discordChannelsByNameLower as any)[k];
  for (const k of Object.keys(discourseCategories)) delete (discourseCategories as any)[k];
  for (const k of Object.keys(discourseCategoriesByNameLower)) delete (discourseCategoriesByNameLower as any)[k];
  for (const k of Object.keys(discourseTopics)) delete (discourseTopics as any)[k];
  for (const k of Object.keys(discourseTopicsByTitleLower)) delete (discourseTopicsByTitleLower as any)[k];
}
