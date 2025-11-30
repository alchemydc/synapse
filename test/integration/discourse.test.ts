import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DiscourseSource } from '../../src/services/discourse/DiscourseSource';
import { Config } from '../../src/config';

// Mock node-fetch
const { mockFetch } = vi.hoisted(() => {
    return { mockFetch: vi.fn() };
});

vi.mock('node-fetch', () => {
    return {
        default: mockFetch,
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

describe('DiscourseSource Integration', () => {
    let config: Config;
    let discourseSource: DiscourseSource;

    beforeEach(() => {
        vi.clearAllMocks();
        config = {
            DISCOURSE_ENABLED: true,
            DISCOURSE_BASE_URL: 'https://forum.example.com',
            DISCOURSE_API_KEY: 'key',
            DISCOURSE_API_USERNAME: 'user',
            DISCOURSE_LOOKBACK_HOURS: 24,
        } as any;
        discourseSource = new DiscourseSource(config);
    });

    it('should not fetch if disabled', async () => {
        config.DISCOURSE_ENABLED = false;
        const messages = await discourseSource.fetchMessages(24);
        expect(messages).toEqual([]);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch categories and topics successfully', async () => {
        const now = Date.now();
        const recent = new Date(now - 1000 * 60).toISOString(); // 1 min ago

        // Mock categories response
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                category_list: {
                    categories: [{ id: 1, name: 'General' }],
                },
            }),
        });

        // Mock latest topics response
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                topic_list: {
                    topics: [
                        {
                            id: 101,
                            title: 'Topic 1',
                            slug: 'topic-1',
                            category_id: 1,
                            created_at: recent,
                            last_posted_at: recent,
                        },
                    ],
                },
            }),
        });

        // Mock topic posts response
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                post_stream: {
                    posts: [
                        {
                            id: 1001,
                            username: 'user1',
                            created_at: recent,
                            cooked: '<p>Hello world</p>',
                        },
                    ],
                },
            }),
        });

        const messages = await discourseSource.fetchMessages(24);

        expect(mockFetch).toHaveBeenCalled();
        expect(messages).toHaveLength(1);
        expect(messages[0].content).toBe('Hello world');
        expect(messages[0].categoryName).toBe('General');
    });

    it('should skip old topics', async () => {
        const now = Date.now();
        const old = new Date(now - 48 * 60 * 60 * 1000).toISOString(); // 48 hours ago

        // Mock categories
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ category_list: { categories: [] } }),
        });

        // Mock latest topics (old topic)
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                topic_list: {
                    topics: [
                        {
                            id: 102,
                            title: 'Old Topic',
                            created_at: old,
                            last_posted_at: old,
                        },
                    ],
                },
            }),
        });

        const messages = await discourseSource.fetchMessages(24);

        // Should fetch categories and topics, but not posts for old topic
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(messages).toHaveLength(0);
    });

    it('should handle pagination', async () => {
        const now = Date.now();
        const recent = new Date(now - 1000 * 60).toISOString();

        // Mock categories
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ category_list: { categories: [] } }),
        });

        // Page 0
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                topic_list: {
                    topics: [
                        { id: 201, created_at: recent, last_posted_at: recent },
                    ],
                },
            }),
        });

        // Topic 201 posts
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ post_stream: { posts: [] } }),
        });

        // Page 1 (empty to stop)
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ topic_list: { topics: [] } }),
        });

        await discourseSource.fetchMessages(24);

        expect(mockFetch).toHaveBeenCalledTimes(4); // Cats + Page 0 + Topic 201 + Page 1
    });
});
