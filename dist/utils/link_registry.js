"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDiscordChannel = registerDiscordChannel;
exports.getDiscordChannelById = getDiscordChannelById;
exports.getDiscordChannelByName = getDiscordChannelByName;
exports.registerDiscourseCategory = registerDiscourseCategory;
exports.getDiscourseCategoryById = getDiscourseCategoryById;
exports.getDiscourseCategoryByName = getDiscourseCategoryByName;
exports.registerDiscourseTopic = registerDiscourseTopic;
exports.getDiscourseTopicById = getDiscourseTopicById;
exports.getDiscourseTopicByTitle = getDiscourseTopicByTitle;
exports.lookupDiscordByLabel = lookupDiscordByLabel;
exports.lookupDiscourseCategoryByLabel = lookupDiscourseCategoryByLabel;
exports.lookupDiscourseTopicByLabel = lookupDiscourseTopicByLabel;
/**
 * Simple in-memory registries for mapping ids/names -> link metadata.
 * This is intentionally minimal and process-local. Callers should register
 * discovered channels/categories/topics during ingestion.
 */
const discordChannels = {}; // keyed by channel id
const discordChannelsByNameLower = {}; // keyed by name.toLowerCase()
const discourseCategories = {}; // keyed by category id
const discourseCategoriesByNameLower = {}; // keyed by name.toLowerCase()
const discourseTopics = {}; // keyed by topic id
const discourseTopicsByTitleLower = {}; // keyed by title.toLowerCase()
// Discord
function registerDiscordChannel(meta) {
    if (!meta || !meta.id)
        return;
    discordChannels[meta.id] = meta;
    if (meta.name) {
        discordChannelsByNameLower[meta.name.toLowerCase()] = meta;
    }
}
function getDiscordChannelById(id) {
    if (!id)
        return undefined;
    return discordChannels[id];
}
function getDiscordChannelByName(name) {
    if (!name)
        return undefined;
    return discordChannelsByNameLower[name.toLowerCase()];
}
// Discourse categories
function registerDiscourseCategory(meta) {
    if (!meta || typeof meta.id === "undefined")
        return;
    discourseCategories[meta.id] = meta;
    if (meta.name) {
        discourseCategoriesByNameLower[meta.name.toLowerCase()] = meta;
    }
}
function getDiscourseCategoryById(id) {
    if (typeof id === "undefined" || id === null)
        return undefined;
    return discourseCategories[Number(id)];
}
function getDiscourseCategoryByName(name) {
    if (!name)
        return undefined;
    return discourseCategoriesByNameLower[name.toLowerCase()];
}
// Discourse topics
function registerDiscourseTopic(meta) {
    if (!meta || typeof meta.id === "undefined")
        return;
    discourseTopics[meta.id] = meta;
    if (meta.title) {
        discourseTopicsByTitleLower[meta.title.toLowerCase()] = meta;
    }
}
function getDiscourseTopicById(id) {
    if (typeof id === "undefined" || id === null)
        return undefined;
    return discourseTopics[Number(id)];
}
function getDiscourseTopicByTitle(title) {
    if (!title)
        return undefined;
    return discourseTopicsByTitleLower[title.toLowerCase()];
}
// Utility: try best-effort lookup by label text in bracketed labels.
// These helpers are small conveniences for the injection step.
function lookupDiscordByLabel(labelText) {
    // labelText might be "#general" or "general" — normalize
    const name = labelText.replace(/^#/, "").trim().toLowerCase();
    return getDiscordChannelByName(name);
}
function lookupDiscourseCategoryByLabel(labelText) {
    // labelText may be category name or "category:123" style; just try name first
    return getDiscourseCategoryByName(labelText.trim().toLowerCase());
}
function lookupDiscourseTopicByLabel(labelText) {
    return getDiscourseTopicByTitle(labelText.trim().toLowerCase());
}
