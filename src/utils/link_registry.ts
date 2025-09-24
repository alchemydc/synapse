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

// Discord
export function registerDiscordChannel(meta: ChannelMeta) {
  if (!meta || !meta.id) return;
  discordChannels[meta.id] = meta;
  if (meta.name) {
    discordChannelsByNameLower[meta.name.toLowerCase()] = meta;
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
    discourseTopicsByTitleLower[meta.title.toLowerCase()] = meta;
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
  return getDiscourseTopicByTitle(labelText.trim().toLowerCase());
}
