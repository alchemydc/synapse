import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlackDestination } from '../../src/services/slack/SlackDestination';
import { Config } from '../../src/config';

// Mock WebClient
const mockPostMessage = vi.fn();

vi.mock('@slack/web-api', () => {
    class MockWebClient {
        chat = {
            postMessage: mockPostMessage,
        };
    }

    return {
        WebClient: MockWebClient,
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

describe('SlackDestination Integration', () => {
    let config: Config;
    let slackDestination: SlackDestination;

    beforeEach(() => {
        vi.clearAllMocks();
        config = {
            SLACK_BOT_TOKEN: 'fake-token',
            SLACK_CHANNEL_ID: 'C12345',
            DRY_RUN: false,
            LOG_LEVEL: 'info',
        } as any;
        slackDestination = new SlackDestination(config);
    });

    it('should not post if disabled', async () => {
        config.SLACK_BOT_TOKEN = undefined;
        slackDestination = new SlackDestination(config); // Re-init to pick up config change
        await slackDestination.sendDigest([], 'summary');
        expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should log only in dry run mode', async () => {
        config.DRY_RUN = true;
        await slackDestination.sendDigest([], 'summary');
        expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should post message successfully', async () => {
        mockPostMessage.mockResolvedValue({ ok: true });
        await slackDestination.sendDigest([], 'summary');
        expect(mockPostMessage).toHaveBeenCalledWith({
            channel: 'C12345',
            text: 'summary',
            blocks: expect.anything(),
        });
    });

    it('should split large messages', async () => {
        const longSummary = 'a'.repeat(30001); // > 30000 chars
        mockPostMessage.mockResolvedValue({ ok: true });

        await slackDestination.sendDigest([], longSummary);

        // Should be split into at least 2 parts
        expect(mockPostMessage).toHaveBeenCalledTimes(2);
    });

    it('should retry on rate limit', async () => {
        mockPostMessage.mockRejectedValueOnce({
            data: { error: 'ratelimited', retry_after: 0.1 },
        });
        mockPostMessage.mockResolvedValueOnce({ ok: true });

        await slackDestination.sendDigest([], 'summary');

        expect(mockPostMessage).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
        mockPostMessage.mockRejectedValue({
            data: { error: 'ratelimited', retry_after: 0.01 },
        });

        await expect(slackDestination.sendDigest([], 'summary')).rejects.toThrow('Failed to post digest blocks to Slack after 3 attempts');
        expect(mockPostMessage).toHaveBeenCalledTimes(3);
    });
});
