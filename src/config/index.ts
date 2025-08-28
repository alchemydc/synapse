// config/index.ts
import { z } from "zod";

const ConfigSchema = z.object({
  DISCORD_TOKEN: z.string(),
  DISCORD_CHANNELS: z.string(),
  SLACK_BOT_TOKEN: z.string(),
  SLACK_CHANNEL_ID: z.string(),
  GEMINI_API_KEY: z.string(),
  GEMINI_MODEL: z.string().default("gemini-1.5-flash"),
  MAX_SUMMARY_TOKENS: z.preprocess((v) => Number(v), z.number().int().min(128).default(1024)),
  DRY_RUN: z.preprocess((v) => v === "true", z.boolean().default(true)),
  DIGEST_WINDOW_HOURS: z.preprocess((v) => Number(v), z.number().int().min(1).default(24)),
  LOG_LEVEL: z.string().default("info"),
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
