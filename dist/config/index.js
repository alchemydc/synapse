"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
// config/index.ts
const zod_1 = require("zod");
const ConfigSchema = zod_1.z.object({
    DISCORD_TOKEN: zod_1.z.string(),
    DISCORD_CHANNELS: zod_1.z.string(),
    SLACK_BOT_TOKEN: zod_1.z.string(),
    SLACK_CHANNEL_ID: zod_1.z.string(),
    GEMINI_API_KEY: zod_1.z.string(),
    GEMINI_MODEL: zod_1.z.string().default("gemini-1.5-flash"),
    MAX_SUMMARY_TOKENS: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().min(128).default(1024)),
    DRY_RUN: zod_1.z.preprocess((v) => v === "true", zod_1.z.boolean().default(true)),
    DIGEST_WINDOW_HOURS: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().min(1).default(24)),
    LOG_LEVEL: zod_1.z.string().default("info"),
});
function loadConfig() {
    const parsed = ConfigSchema.safeParse(process.env);
    if (!parsed.success) {
        throw new Error("Invalid config: " + JSON.stringify(parsed.error.format()));
    }
    const raw = parsed.data;
    return {
        ...raw,
        DISCORD_CHANNELS: raw.DISCORD_CHANNELS.split(",").map((id) => id.trim()).filter(Boolean),
    };
}
