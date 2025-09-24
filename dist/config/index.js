"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
// config/index.ts
const zod_1 = require("zod");
const toNum = (v) => {
    if (v === undefined)
        return undefined;
    if (typeof v === "string" && v.trim() === "")
        return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
};
const toBool = (v) => {
    if (v === undefined)
        return undefined;
    if (typeof v === "string" && v.trim() === "")
        return undefined;
    const s = String(v).toLowerCase().trim();
    if (["true", "1", "yes"].includes(s))
        return true;
    if (["false", "0", "no"].includes(s))
        return false;
    return undefined;
};
const toStr = (v) => {
    if (v === undefined)
        return undefined;
    if (typeof v === "string" && v.trim() === "")
        return undefined;
    return String(v);
};
const ConfigSchema = zod_1.z.object({
    // Credentials and optional endpoints — mark optional unless necessary at runtime.
    DISCORD_TOKEN: zod_1.z.preprocess(toStr, zod_1.z.string()).optional(),
    DISCORD_CHANNELS: zod_1.z.preprocess(toStr, zod_1.z.string()).optional(),
    SLACK_BOT_TOKEN: zod_1.z.preprocess(toStr, zod_1.z.string()).optional(),
    SLACK_CHANNEL_ID: zod_1.z.preprocess(toStr, zod_1.z.string()).optional(),
    GEMINI_API_KEY: zod_1.z.preprocess(toStr, zod_1.z.string()).optional(),
    GEMINI_MODEL: zod_1.z.preprocess(toStr, zod_1.z.string()).default("gemini-1.5-flash"),
    MAX_SUMMARY_TOKENS: zod_1.z.preprocess(toNum, zod_1.z.number().int().min(128)).default(1024),
    DRY_RUN: zod_1.z.preprocess(toBool, zod_1.z.boolean()).default(true),
    DIGEST_WINDOW_HOURS: zod_1.z.preprocess(toNum, zod_1.z.number().int().min(1)).default(24),
    LOG_LEVEL: zod_1.z.string().default("info"),
    MIN_MESSAGE_LENGTH: zod_1.z.preprocess(toNum, zod_1.z.number().int().min(1)).default(20),
    EXCLUDE_COMMANDS: zod_1.z.preprocess(toBool, zod_1.z.boolean()).default(true),
    EXCLUDE_LINK_ONLY: zod_1.z.preprocess(toBool, zod_1.z.boolean()).default(true),
    ATTRIBUTION_ENABLED: zod_1.z.preprocess(toBool, zod_1.z.boolean()).default(false),
    TOPIC_GAP_MINUTES: zod_1.z.preprocess(toNum, zod_1.z.number().int().min(1)).default(20),
    MAX_TOPIC_PARTICIPANTS: zod_1.z.preprocess(toNum, zod_1.z.number().int().min(1)).default(6),
    ATTRIBUTION_FALLBACK_ENABLED: zod_1.z.preprocess(toBool, zod_1.z.boolean()).default(true),
    // Per-source enable flags (keep defaults but allow explicit unset)
    ENABLE_DISCORD: zod_1.z.preprocess(toBool, zod_1.z.boolean()).optional().default(true),
    ENABLE_DISCOURSE: zod_1.z.preprocess(toBool, zod_1.z.boolean()).optional().default(true),
    LINKED_SOURCE_LABELS: zod_1.z.preprocess(toBool, zod_1.z.boolean()).optional(),
    // Discourse-related optional settings
    DISCOURSE_BASE_URL: zod_1.z.preprocess(toStr, zod_1.z.string()).optional(),
    DISCOURSE_API_KEY: zod_1.z.preprocess(toStr, zod_1.z.string()).optional(),
    DISCOURSE_API_USERNAME: zod_1.z.preprocess(toStr, zod_1.z.string()).optional(),
    DISCOURSE_LOOKBACK_HOURS: zod_1.z.preprocess(toNum, zod_1.z.number().int().min(1)).optional(),
    DISCOURSE_MAX_TOPICS: zod_1.z.preprocess(toNum, zod_1.z.number().int().min(1)).optional(),
});
const logger_1 = require("../utils/logger");
function normalizeBaseUrl(raw) {
    if (!raw)
        return undefined;
    return raw.replace(/\/+$/, "");
}
function loadConfig() {
    const parsed = ConfigSchema.safeParse(process.env);
    if (!parsed.success) {
        throw new Error("Invalid config: " + JSON.stringify(parsed.error.format()));
    }
    const raw = parsed.data;
    const configBaseChannels = (raw.DISCORD_CHANNELS ?? "").split(",").map((id) => id.trim()).filter(Boolean);
    const discoBase = normalizeBaseUrl(raw.DISCOURSE_BASE_URL);
    const config = {
        ...raw,
        DISCORD_CHANNELS: configBaseChannels,
        ENABLE_DISCORD: raw.ENABLE_DISCORD,
        ENABLE_DISCOURSE: raw.ENABLE_DISCOURSE,
        LINKED_SOURCE_LABELS: typeof raw.LINKED_SOURCE_LABELS !== "undefined" ? raw.LINKED_SOURCE_LABELS : true,
        DISCOURSE_BASE_URL: discoBase,
        DISCOURSE_API_KEY: raw.DISCOURSE_API_KEY,
        DISCOURSE_API_USERNAME: raw.DISCOURSE_API_USERNAME,
        DISCOURSE_LOOKBACK_HOURS: raw.DISCOURSE_LOOKBACK_HOURS,
        DISCOURSE_MAX_TOPICS: raw.DISCOURSE_MAX_TOPICS,
        // derived enablement
        DISCORD_ENABLED: Boolean(raw.ENABLE_DISCORD && raw.DISCORD_TOKEN && raw.DISCORD_CHANNELS),
        DISCOURSE_ENABLED: Boolean(raw.ENABLE_DISCOURSE && discoBase && raw.DISCOURSE_API_KEY && raw.DISCOURSE_API_USERNAME),
    };
    // Mask secrets for logging
    function mask(s) {
        if (!s)
            return { present: false, len: 0 };
        return { present: true, len: s.length };
    }
    logger_1.logger.info("Config summary", {
        geminiModel: config.GEMINI_MODEL,
        dryRun: config.DRY_RUN,
        digestWindowHours: config.DIGEST_WINDOW_HOURS,
        maxSummaryTokens: config.MAX_SUMMARY_TOKENS,
        logLevel: config.LOG_LEVEL,
        minMessageLength: config.MIN_MESSAGE_LENGTH,
        excludeCommands: config.EXCLUDE_COMMANDS,
        excludeLinkOnly: config.EXCLUDE_LINK_ONLY,
        attributionEnabled: config.ATTRIBUTION_ENABLED,
        topicGapMinutes: config.TOPIC_GAP_MINUTES,
        maxTopicParticipants: config.MAX_TOPIC_PARTICIPANTS,
        attributionFallbackEnabled: config.ATTRIBUTION_FALLBACK_ENABLED,
        enableFlags: {
            enableDiscord: raw.ENABLE_DISCORD,
            enableDiscourse: raw.ENABLE_DISCOURSE,
        },
        linkedSourceLabels: config.LINKED_SOURCE_LABELS,
        discord: {
            enabled: config.DISCORD_ENABLED,
            channelsCount: config.DISCORD_CHANNELS.length,
        },
        discourse: {
            enabled: config.DISCOURSE_ENABLED,
            baseUrl: config.DISCOURSE_BASE_URL ? new URL(config.DISCOURSE_BASE_URL).hostname : undefined,
            maxTopics: config.DISCOURSE_MAX_TOPICS ?? null,
            lookbackHours: config.DISCOURSE_LOOKBACK_HOURS ?? null,
        },
        secrets: {
            GEMINI_API_KEY: mask(process.env.GEMINI_API_KEY || ""),
            SLACK_BOT_TOKEN: mask(process.env.SLACK_BOT_TOKEN || ""),
            DISCORD_TOKEN: mask(process.env.DISCORD_TOKEN || ""),
            DISCOURSE_API_KEY: mask(process.env.DISCOURSE_API_KEY || ""),
        }
    });
    return config;
}
