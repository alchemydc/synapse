import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { loadConfig } from '../../src/config';

describe('Config Service', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should load default values when no env vars are present', () => {
        // Clear relevant env vars to test defaults
        delete process.env.GEMINI_MODEL;
        delete process.env.MAX_SUMMARY_TOKENS;
        delete process.env.DRY_RUN;
        delete process.env.DIGEST_WINDOW_HOURS;
        delete process.env.LOG_LEVEL;
        delete process.env.MIN_MESSAGE_LENGTH;
        delete process.env.EXCLUDE_COMMANDS;
        delete process.env.EXCLUDE_LINK_ONLY;
        delete process.env.ENABLE_DISCORD;
        delete process.env.ENABLE_DISCOURSE;

        const config = loadConfig();

        expect(config.GEMINI_MODEL).toBe('gemini-2.5-flash');
        expect(config.MAX_SUMMARY_TOKENS).toBe(1500);
        expect(config.DRY_RUN).toBe(true);
        expect(config.DIGEST_WINDOW_HOURS).toBe(24);
        expect(config.LOG_LEVEL).toBe('info');
        expect(config.MIN_MESSAGE_LENGTH).toBe(20);
        expect(config.EXCLUDE_COMMANDS).toBe(true);
        expect(config.EXCLUDE_LINK_ONLY).toBe(true);
        expect(config.ENABLE_DISCORD).toBe(true);
        expect(config.ENABLE_DISCOURSE).toBe(true);
    });

    it('should override defaults with environment variables', () => {
        process.env.GEMINI_MODEL = 'gemini-pro';
        process.env.MAX_SUMMARY_TOKENS = '2000';
        process.env.DRY_RUN = 'false';
        process.env.DIGEST_WINDOW_HOURS = '48';
        process.env.LOG_LEVEL = 'debug';
        process.env.MIN_MESSAGE_LENGTH = '10';
        process.env.EXCLUDE_COMMANDS = 'false';
        process.env.EXCLUDE_LINK_ONLY = 'false';

        const config = loadConfig();

        expect(config.GEMINI_MODEL).toBe('gemini-pro');
        expect(config.MAX_SUMMARY_TOKENS).toBe(2000);
        expect(config.DRY_RUN).toBe(false);
        expect(config.DIGEST_WINDOW_HOURS).toBe(48);
        expect(config.LOG_LEVEL).toBe('debug');
        expect(config.MIN_MESSAGE_LENGTH).toBe(10);
        expect(config.EXCLUDE_COMMANDS).toBe(false);
        expect(config.EXCLUDE_LINK_ONLY).toBe(false);
    });

    it('should correctly parse boolean values', () => {
        process.env.DRY_RUN = '1';
        expect(loadConfig().DRY_RUN).toBe(true);

        process.env.DRY_RUN = 'yes';
        expect(loadConfig().DRY_RUN).toBe(true);

        process.env.DRY_RUN = '0';
        expect(loadConfig().DRY_RUN).toBe(false);

        process.env.DRY_RUN = 'no';
        expect(loadConfig().DRY_RUN).toBe(false);
    });

    it('should correctly parse number values', () => {
        process.env.MAX_SUMMARY_TOKENS = ' 1000 ';
        expect(loadConfig().MAX_SUMMARY_TOKENS).toBe(1000);
    });

    it('should derive DISCORD_ENABLED correctly', () => {
        process.env.ENABLE_DISCORD = 'true';
        process.env.DISCORD_TOKEN = 'token';
        process.env.DISCORD_CHANNELS = '123,456';
        expect(loadConfig().DISCORD_ENABLED).toBe(true);

        process.env.ENABLE_DISCORD = 'false';
        expect(loadConfig().DISCORD_ENABLED).toBe(false);

        process.env.ENABLE_DISCORD = 'true';
        delete process.env.DISCORD_TOKEN;
        expect(loadConfig().DISCORD_ENABLED).toBe(false);
    });

    it('should derive DISCOURSE_ENABLED correctly', () => {
        process.env.ENABLE_DISCOURSE = 'true';
        process.env.DISCOURSE_BASE_URL = 'http://example.com';
        process.env.DISCOURSE_API_KEY = 'key';
        process.env.DISCOURSE_API_USERNAME = 'user';
        expect(loadConfig().DISCOURSE_ENABLED).toBe(true);

        process.env.ENABLE_DISCOURSE = 'false';
        expect(loadConfig().DISCOURSE_ENABLED).toBe(false);

        process.env.ENABLE_DISCOURSE = 'true';
        delete process.env.DISCOURSE_BASE_URL;
        expect(loadConfig().DISCOURSE_ENABLED).toBe(false);
    });

    it('should normalize Discourse Base URL', () => {
        process.env.DISCOURSE_BASE_URL = 'http://example.com/';
        process.env.DISCOURSE_API_KEY = 'key';
        process.env.DISCOURSE_API_USERNAME = 'user';

        const config = loadConfig();
        expect(config.DISCOURSE_BASE_URL).toBe('http://example.com');
    });
});
