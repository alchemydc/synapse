// config/index.ts
import { z } from "zod";

const toNum = (v: unknown) =>
  v === undefined || v === "" ? undefined : Number(v);

const toBool = (v: unknown) =>
  v === undefined || v === "" ? undefined : String(v).toLowerCase() === "true";

const ConfigSchema = z.object({
  DISCORD_TOKEN: z.string(),
  DISCORD_CHANNELS: z.string(),
  SLACK_BOT_TOKEN: z.string(),
  SLACK_CHANNEL_ID: z.string(),
  GEMINI_API_KEY: z.string(),
  GEMINI_MODEL: z.string().default("gemini-1.5-flash"),

  MAX_SUMMARY_TOKENS: z.preprocess(
    toNum,
    z.number().int().min(128)
  ).default(1024),

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
});

export type Config = {
  DISCORD_TOKEN: string;
  DISCORD_CHANNELS: string[];
  SLACK_BOT_TOKEN: string;
  SLACK_CHANNEL_ID: string;
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
  MAX_SUMMARY_TOKENS: number;
  DRY_RUN: boolean;
  DIGEST_WINDOW_HOURS: number;
  LOG_LEVEL: string;
  MIN_MESSAGE_LENGTH: number;
  EXCLUDE_COMMANDS: boolean;
  EXCLUDE_LINK_ONLY: boolean;
};

export function loadConfig(): Config {
  const parsed = ConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error("Invalid config: " + JSON.stringify(parsed.error.format()));
  }
  const raw = parsed.data;
  return {
    ...raw,
    DISCORD_CHANNELS: raw.DISCORD_CHANNELS.split(",").map((id: string) => id.trim()).filter(Boolean),
  };
}
