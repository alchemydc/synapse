// config/index.ts
import { z } from "zod";

const toNum = (v: unknown) => {
  if (v === undefined) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const toBool = (v: unknown) => {
  if (v === undefined) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  const s = String(v).toLowerCase().trim();
  if (["true", "1", "yes"].includes(s)) return true;
  if (["false", "0", "no"].includes(s)) return false;
  return undefined;
};

const toStr = (v: unknown) => {
  if (v === undefined) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  return String(v);
};

const ConfigSchema = z.object({
  // Credentials and optional endpoints — mark optional unless necessary at runtime.
  DISCORD_TOKEN: z.preprocess(toStr, z.string()).optional(),
  DISCORD_CHANNELS: z.preprocess(toStr, z.string()).optional(),
  SLACK_BOT_TOKEN: z.preprocess(toStr, z.string()).optional(),
  SLACK_CHANNEL_ID: z.preprocess(toStr, z.string()).optional(),
  GEMINI_API_KEY: z.preprocess(toStr, z.string()).optional(),

  GEMINI_MODEL: z.preprocess(toStr, z.string()).default("gemini-2.5-flash"),

  MAX_SUMMARY_TOKENS: z.preprocess(
    toNum,
    z.number().int().min(128)
  ).default(1500),

  DRY_RUN: z.preprocess(
    toBool,
    z.boolean()
  ).default(true),

  DIGEST_WINDOW_HOURS: z.preprocess(
    toNum,
    z.number().int().min(1)
  ).default(24),

  LOG_LEVEL: z.string().default("info"),

  MIN_MESSAGE_LENGTH: z.preprocess(
    toNum,
    z.number().int().min(1)
  ).default(20),

  EXCLUDE_COMMANDS: z.preprocess(
    toBool,
    z.boolean()
  ).default(true),

  EXCLUDE_LINK_ONLY: z.preprocess(
    toBool,
    z.boolean()
  ).default(true),




  // Per-source enable flags (keep defaults but allow explicit unset)
  ENABLE_DISCORD: z.preprocess(toBool, z.boolean()).optional().default(true),
  ENABLE_DISCOURSE: z.preprocess(toBool, z.boolean()).optional().default(true),


  // Discourse-related optional settings
  DISCOURSE_BASE_URL: z.preprocess(toStr, z.string()).optional(),
  DISCOURSE_API_KEY: z.preprocess(toStr, z.string()).optional(),
  DISCOURSE_API_USERNAME: z.preprocess(toStr, z.string()).optional(),

  DISCOURSE_LOOKBACK_HOURS: z.preprocess(
    toNum,
    z.number().int().min(1)
  ).optional(),

  DISCOURSE_MAX_TOPICS: z.preprocess(
    toNum,
    z.number().int().min(1)
  ).optional(),


});

export type Config = {
  // Credentials / optional endpoints
  DISCORD_TOKEN?: string;
  DISCORD_CHANNELS: string[]; // parsed to array; may be empty
  SLACK_BOT_TOKEN?: string;
  SLACK_CHANNEL_ID?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL: string;
  MAX_SUMMARY_TOKENS: number;
  DRY_RUN: boolean;
  DIGEST_WINDOW_HOURS: number;
  LOG_LEVEL: string;
  MIN_MESSAGE_LENGTH: number;
  EXCLUDE_COMMANDS: boolean;
  EXCLUDE_LINK_ONLY: boolean;


  // Discourse
  DISCOURSE_BASE_URL?: string;
  DISCOURSE_API_KEY?: string;
  DISCOURSE_API_USERNAME?: string;
  DISCOURSE_LOOKBACK_HOURS?: number;
  DISCOURSE_MAX_TOPICS?: number;


  ENABLE_DISCORD: boolean;
  ENABLE_DISCOURSE: boolean;


  // derived
  DISCORD_ENABLED: boolean;
  DISCOURSE_ENABLED: boolean;
};

import { logger } from "../utils/logger";

function normalizeBaseUrl(raw?: string) {
  if (!raw) return undefined;
  return raw.replace(/\/+$/, "");
}

export function loadConfig(): Config {
  const parsed = ConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error("Invalid config: " + JSON.stringify(parsed.error.format()));
  }
  const raw = parsed.data;
  const configBaseChannels = (raw.DISCORD_CHANNELS ?? "").split(",").map((id: string) => id.trim()).filter(Boolean);

  const discoBase = normalizeBaseUrl(raw.DISCOURSE_BASE_URL);

  const config: Config = {
    ...raw,
    DISCORD_CHANNELS: configBaseChannels,
    ENABLE_DISCORD: raw.ENABLE_DISCORD,
    ENABLE_DISCOURSE: raw.ENABLE_DISCOURSE,

    DISCOURSE_BASE_URL: discoBase,
    DISCOURSE_API_KEY: raw.DISCOURSE_API_KEY,
    DISCOURSE_API_USERNAME: raw.DISCOURSE_API_USERNAME,
    DISCOURSE_LOOKBACK_HOURS: raw.DISCOURSE_LOOKBACK_HOURS,
    DISCOURSE_MAX_TOPICS: raw.DISCOURSE_MAX_TOPICS,

    // derived enablement
    DISCORD_ENABLED: Boolean(raw.ENABLE_DISCORD && raw.DISCORD_TOKEN && raw.DISCORD_CHANNELS),
    DISCOURSE_ENABLED:
      Boolean(raw.ENABLE_DISCOURSE && discoBase && raw.DISCOURSE_API_KEY && raw.DISCOURSE_API_USERNAME),
  };

  // Mask secrets for logging
  function mask(s: string | undefined) {
    if (!s) return { present: false, len: 0 };
    return { present: true, len: s.length };
  }

  logger.info("Config summary", {
    geminiModel: config.GEMINI_MODEL,
    dryRun: config.DRY_RUN,
    digestWindowHours: config.DIGEST_WINDOW_HOURS,
    maxSummaryTokens: config.MAX_SUMMARY_TOKENS,
    logLevel: config.LOG_LEVEL,
    minMessageLength: config.MIN_MESSAGE_LENGTH,
    excludeCommands: config.EXCLUDE_COMMANDS,
    excludeLinkOnly: config.EXCLUDE_LINK_ONLY,
    enableFlags: {
      enableDiscord: raw.ENABLE_DISCORD,
      enableDiscourse: raw.ENABLE_DISCOURSE,
    },

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
