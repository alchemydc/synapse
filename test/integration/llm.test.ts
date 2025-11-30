import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiProcessor } from '../../src/services/llm/GeminiProcessor';
import { Config } from '../../src/config';
import { NormalizedMessage } from '../../src/core/types';

// Mock GoogleGenerativeAI
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn();

vi.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
            getGenerativeModel: mockGetGenerativeModel,
        })),
    };
});

// Mock logger
vi.mock('../../src/utils/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('GeminiProcessor Integration', () => {
    let config: Config;
    let processor: GeminiProcessor;

    beforeEach(() => {
        vi.clearAllMocks();
        config = {
            GEMINI_API_KEY: 'fake-key',
            GEMINI_MODEL: 'gemini-pro',
            MAX_SUMMARY_TOKENS: 100,
        } as any;

        mockGetGenerativeModel.mockReturnValue({
            generateContent: mockGenerateContent,
        });

        processor = new GeminiProcessor(config);
    });

    it('should initialize with correct model', () => {
        expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-pro' });
    });

    it('should return empty string if no messages', async () => {
        const result = await processor.process([]);
        expect(result).toBe('');
        expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('should summarize Discord messages', async () => {
        const messages: NormalizedMessage[] = [
            {
                id: '1',
                source: 'discord',
                channelId: '123',
                channelName: 'general',
                author: 'user1',
                content: 'Hello',
                createdAt: new Date().toISOString(),
                url: 'https://discord.com/channels/1/123/1',
            },
        ];

        mockGenerateContent.mockResolvedValue({
            response: {
                text: () => 'Summary of discord',
            },
        });

        const result = await processor.process(messages);

        expect(mockGenerateContent).toHaveBeenCalled();
        expect(result).toContain('Summary of discord');
        expect(result).toContain('#general');
    });

    it('should summarize Discourse messages', async () => {
        const messages: NormalizedMessage[] = [
            {
                id: '1',
                source: 'discourse',
                topicId: 101,
                topicTitle: 'Topic 1',
                author: 'user1',
                content: 'Hello',
                createdAt: new Date().toISOString(),
                url: 'https://forum.example.com/t/topic-1/101/1',
            },
        ];

        mockGenerateContent.mockResolvedValue({
            response: {
                text: () => 'Summary of discourse',
            },
        });

        const result = await processor.process(messages);

        expect(mockGenerateContent).toHaveBeenCalled();
        expect(result).toContain('Summary of discourse');
        expect(result).toContain('Topic 1');
    });

    it('should handle generation errors', async () => {
        const messages: NormalizedMessage[] = [
            {
                id: '1',
                source: 'discord',
                channelId: '123',
                author: 'user1',
                content: 'Hello',
                createdAt: new Date().toISOString(),
                url: 'url',
            },
        ];

        mockGenerateContent.mockRejectedValue(new Error('API Error'));

        const result = await processor.process(messages);

        expect(result).toContain('Error generating summary');
    });
});
