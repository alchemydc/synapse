// test/unit/config_enable_flags.test.ts
import { describe, it, expect, afterEach } from "vitest";
import { loadConfig } from "../../src/config";

describe("config enable flags", () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    // restore original env between tests
    process.env = { ...origEnv };
  });

  it("DISCORD_ENABLED is false when ENABLE_DISCORD=false", () => {
    process.env = {
      ...origEnv,
      ENABLE_DISCORD: "false",
      DISCORD_TOKEN: "t",
      DISCORD_CHANNELS: "c1,c2",
      SLACK_BOT_TOKEN: "s",
      SLACK_CHANNEL_ID: "ch",
      GEMINI_API_KEY: "g",
    };
    const cfg = loadConfig();
    expect(cfg.DISCORD_ENABLED).toBe(false);
  });

  it("DISCOURSE_ENABLED is false when ENABLE_DISCOURSE=false even if creds present", () => {
    process.env = {
      ...origEnv,
      ENABLE_DISCOURSE: "false",
      DISCOURSE_BASE_URL: "https://forum.example.org",
      DISCOURSE_API_KEY: "api",
      DISCOURSE_API_USERNAME: "user",
      DISCORD_TOKEN: "t",
      DISCORD_CHANNELS: "c1",
      SLACK_BOT_TOKEN: "s",
      SLACK_CHANNEL_ID: "ch",
      GEMINI_API_KEY: "g",
    };
    const cfg = loadConfig();
    expect(cfg.DISCOURSE_ENABLED).toBe(false);
  });

  it("DISCOURSE_ENABLED is true when ENABLE_DISCOURSE unset and creds present", () => {
    process.env = {
      ...origEnv,
      // ENABLE_DISCOURSE not set
      DISCOURSE_BASE_URL: "https://forum.example.org",
      DISCOURSE_API_KEY: "api",
      DISCOURSE_API_USERNAME: "user",
      DISCORD_TOKEN: "t",
      DISCORD_CHANNELS: "c1",
      SLACK_BOT_TOKEN: "s",
      SLACK_CHANNEL_ID: "ch",
      GEMINI_API_KEY: "g",
    };
    const cfg = loadConfig();
    expect(cfg.DISCOURSE_ENABLED).toBe(true);
  });

  it("DISCOURSE_ENABLED is false when creds missing", () => {
    process.env = {
      ...origEnv,
      ENABLE_DISCOURSE: "true",
      // no DISCOURSE_BASE_URL / API key / username
      DISCORD_TOKEN: "t",
      DISCORD_CHANNELS: "c1",
      SLACK_BOT_TOKEN: "s",
      SLACK_CHANNEL_ID: "ch",
      GEMINI_API_KEY: "g",
    };
    const cfg = loadConfig();
    expect(cfg.DISCOURSE_ENABLED).toBe(false);
  });
});
