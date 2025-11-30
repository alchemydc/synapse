import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DiscordSource } from '../../src/services/discord/DiscordSource';
import { Config } from '../../src/config';
import { Collection } from 'discord.js';

// Mock discord.js
const mockLogin = vi.fn();
const mockDestroy = vi.fn();
const mockChannelsFetch = vi.fn();
const mockMessagesFetch = vi.fn();

vi.mock('discord.js', () => {
    return {
        Client: vi.fn().mockImplementation(() => ({
            login: mockLogin,
            destroy: mockDestroy,
            channels: {
                fetch: mockChannelsFetch,
            },
        })),
        GatewayIntentBits: {
            Guilds: 1,
            GuildMessages: 2,
            MessageContent: 3,
        },
        TextChannel: class { },
    };
});

// Mock logger to avoid noise
vi.mock('../../src/utils/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('DiscordSource Integration', () => {
    let config: Config;
    let discordSource: DiscordSource;

    beforeEach(() => {
        vi.clearAllMocks();
        config = {
            DISCORD_ENABLED: true,
            DISCORD_TOKEN: 'fake-token',
            DISCORD_CHANNELS: ['123'],
        } as any;
        discordSource = new DiscordSource(config);
    });

    it('should not fetch if disabled', async () => {
        config.DISCORD_ENABLED = false;
        const messages = await discordSource.fetchMessages(24);
        expect(messages).toEqual([]);
        expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should throw if token is missing', async () => {
        config.DISCORD_TOKEN = undefined;
        await expect(discordSource.fetchMessages(24)).rejects.toThrow('DISCORD_TOKEN is required');
    });

    it('should fetch messages successfully', async () => {
        const now = Date.now();
        const mockChannel = {
            id: '123',
            name: 'general',
            messages: {
                fetch: mockMessagesFetch,
            },
        };
        // Need to simulate instanceof TextChannel check. 
        // Since we mocked TextChannel class, we can just make mockChannel an instance of it if needed, 
        // or rely on the implementation detail. 
        // The implementation checks `instanceof TextChannel`.
        // Let's adjust the mock to handle this.
        const { TextChannel } = await import('discord.js');
        Object.setPrototypeOf(mockChannel, TextChannel.prototype);

        mockChannelsFetch.mockResolvedValue(mockChannel);

        // Mock messages
        const mockMsg1 = {
            id: 'msg1',
            content: 'Hello',
            author: { username: 'user1', bot: false },
            createdTimestamp: now - 1000 * 60, // 1 min ago
            url: 'http://discord.com/msg1',
        };

        // Return a Collection-like object
        const collection = new Map();
        collection.set('msg1', mockMsg1);

        mockMessagesFetch.mockResolvedValueOnce(collection); // First batch
        mockMessagesFetch.mockResolvedValueOnce(new Map()); // Second batch empty

        const messages = await discordSource.fetchMessages(24);

        expect(mockLogin).toHaveBeenCalledWith('fake-token');
        expect(mockChannelsFetch).toHaveBeenCalledWith('123');
        expect(messages).toHaveLength(1);
        expect(messages[0].content).toBe('Hello');
        expect(mockDestroy).toHaveBeenCalled();
    });

    it('should filter out bot messages and empty content', async () => {
        const now = Date.now();
        const mockChannel = {
            id: '123',
            name: 'general',
            messages: {
                fetch: mockMessagesFetch,
            },
        };
        const { TextChannel } = await import('discord.js');
        Object.setPrototypeOf(mockChannel, TextChannel.prototype);

        mockChannelsFetch.mockResolvedValue(mockChannel);

        const mockMsgBot = {
            id: 'bot',
            content: 'I am bot',
            author: { username: 'bot', bot: true },
            createdTimestamp: now,
        };
        const mockMsgEmpty = {
            id: 'empty',
            content: '   ',
            author: { username: 'user', bot: false },
            createdTimestamp: now,
        };

        const collection = new Map();
        collection.set('bot', mockMsgBot);
        collection.set('empty', mockMsgEmpty);

        mockMessagesFetch.mockResolvedValueOnce(collection);
        mockMessagesFetch.mockResolvedValueOnce(new Map());

        const messages = await discordSource.fetchMessages(24);
        expect(messages).toHaveLength(0);
    });

    it('should stop fetching when messages are older than window', async () => {
        const now = Date.now();
        const windowHours = 1;
        const oldTimestamp = now - (windowHours * 60 * 60 * 1000) - 1000; // Just outside window

        const mockChannel = {
            id: '123',
            name: 'general',
            messages: {
                fetch: mockMessagesFetch,
            },
        };
        const { TextChannel } = await import('discord.js');
        Object.setPrototypeOf(mockChannel, TextChannel.prototype);
        mockChannelsFetch.mockResolvedValue(mockChannel);

        const mockMsgOld = {
            id: 'old',
            content: 'Old message',
            author: { username: 'user', bot: false },
            createdTimestamp: oldTimestamp,
        };

        const collection = new Map();
        collection.set('old', mockMsgOld);

        mockMessagesFetch.mockResolvedValueOnce(collection);

        const messages = await discordSource.fetchMessages(windowHours);
        expect(messages).toHaveLength(0);
        // Should stop after finding old message
        expect(mockMessagesFetch).toHaveBeenCalledTimes(1);
    });
});
