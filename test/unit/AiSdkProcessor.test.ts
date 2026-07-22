// test/unit/AiSdkProcessor.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiSdkProcessor } from "../../src/services/llm/AiSdkProcessor";
import { Config } from "../../src/config";
import { NormalizedMessage } from "../../src/core/types";
import { DigestItem } from "../../src/core/schemas";

// Mock dependencies
const mockGenerateObject = vi.fn();
const mockGoogleModel = vi.fn();
const mockCreateGoogleGenerativeAI = vi.fn((_args: any) => mockGoogleModel);

vi.mock("ai", () => ({
    generateObject: (args: any) => mockGenerateObject(args),
}));

vi.mock("@ai-sdk/google", () => ({
    createGoogleGenerativeAI: (args: any) => mockCreateGoogleGenerativeAI(args),
}));

describe("AiSdkProcessor", () => {
    let config: Config;
    let processor: AiSdkProcessor;

    beforeEach(() => {
        vi.clearAllMocks();
        config = {
            GEMINI_API_KEY: "test-key",
            GEMINI_MODEL: "gemini-1.5-pro",
            MAX_SUMMARY_TOKENS: 100,
            MAX_INPUT_CHARS_PER_GROUP: 100000,
            // ... other required config props
            DISCORD_CHANNELS: [],
            DRY_RUN: true,
            DIGEST_WINDOW_HOURS: 24,
            LOG_LEVEL: "info",
            MIN_MESSAGE_LENGTH: 10,
            EXCLUDE_COMMANDS: true,
            EXCLUDE_LINK_ONLY: true,
            ENABLE_DISCORD: true,
            ENABLE_DISCOURSE: true,
            DISCORD_ENABLED: true,
            DISCOURSE_ENABLED: true,
        } as Config;

        // Mock successful generation by default
        mockGenerateObject.mockResolvedValue({
            object: {
                headline: "Generated Headline",
                url: "https://generated.url",
                summary: "Generated Summary"
            }
        });

        processor = new AiSdkProcessor(config);
    });

    it("should initialize with google provider", () => {
        expect(mockCreateGoogleGenerativeAI).toHaveBeenCalledWith({ apiKey: "test-key" });
    });

    it("should process Discord messages", async () => {
        const messages: NormalizedMessage[] = [
            {
                id: "1",
                source: "discord",
                author: "User1",
                content: "Hello world",
                createdAt: new Date().toISOString(),
                url: "https://discord.com/channels/123/456/789",
                channelId: "456",
                channelName: "general",
            },
        ];

        const result = await processor.process(messages) as DigestItem;

        expect(mockGoogleModel).toHaveBeenCalledWith("gemini-1.5-pro");
        expect(mockGenerateObject).toHaveBeenCalled();
        expect(result.headline).toBe("Generated Headline"); // Or check if it falls back to default if mocked return is empty?
        // The mock returns "Generated Headline", so we expect that.
        // Actually, the code uses `object.headline || defaultHeadline`.
        expect(result.summary).toBe("Generated Summary");
    });

    it("should process Discourse messages", async () => {
        const messages: NormalizedMessage[] = [
            {
                id: "1",
                source: "discourse",
                author: "User1",
                content: "Topic content",
                createdAt: new Date().toISOString(),
                url: "https://forum.example.com/t/topic-slug/123",
                topicTitle: "My Topic",
            },
        ];

        const result = await processor.process(messages) as DigestItem;

        expect(mockGenerateObject).toHaveBeenCalled();
        expect(result.headline).toBe("Generated Headline");
        expect(result.summary).toBe("Generated Summary");
    });

    it("should handle empty messages", async () => {
        const result = await processor.process([]);
        expect(result).toBe("");
        expect(mockGenerateObject).not.toHaveBeenCalled();
    });

    it("should handle generation errors gracefully, retrying transient failures", async () => {
        vi.useFakeTimers();
        try {
            mockGenerateObject.mockRejectedValue(new Error("API Error"));

            const messages: NormalizedMessage[] = [
                {
                    id: "1",
                    source: "discord",
                    author: "User1",
                    content: "Hello",
                    createdAt: new Date().toISOString(),
                    url: "url",
                },
            ];

            const promise = processor.process(messages) as Promise<DigestItem>;
            await vi.runAllTimersAsync(); // drain p-retry backoff timers
            const result = await promise;

            expect(result.summary).toContain("Error generating summary");
            expect(mockGenerateObject).toHaveBeenCalledTimes(4); // 1 attempt + 3 retries
        } finally {
            vi.useRealTimers();
        }
    });

    it("should recover when a transient failure is followed by success", async () => {
        vi.useFakeTimers();
        try {
            mockGenerateObject
                .mockRejectedValueOnce(new Error("503 overloaded"))
                .mockResolvedValueOnce({
                    object: { headline: "H", url: "U", summary: "Recovered" },
                });

            const messages: NormalizedMessage[] = [
                { id: "1", source: "discord", author: "A", content: "Hello", createdAt: new Date().toISOString(), url: "url" },
            ];

            const promise = processor.process(messages) as Promise<DigestItem>;
            await vi.runAllTimersAsync();
            const result = await promise;

            expect(result.summary).toBe("Recovered");
            expect(mockGenerateObject).toHaveBeenCalledTimes(2);
        } finally {
            vi.useRealTimers();
        }
    });

    it("should sort messages chronologically before prompting", async () => {
        const messages: NormalizedMessage[] = [
            { id: "2", source: "discord", author: "Bob", content: "Second message", createdAt: "2026-07-21T12:00:00.000Z", url: "url", channelId: "456", channelName: "general" },
            { id: "1", source: "discord", author: "Alice", content: "First message", createdAt: "2026-07-21T10:00:00.000Z", url: "url", channelId: "456", channelName: "general" },
        ];

        await processor.process(messages);

        const prompt: string = mockGenerateObject.mock.calls[0][0].prompt;
        expect(prompt.indexOf("First message")).toBeGreaterThan(-1);
        expect(prompt.indexOf("First message")).toBeLessThan(prompt.indexOf("Second message"));
    });

    it("should keep the newest messages when the input budget is exceeded", async () => {
        // 800 fits NEWEST (407) fully and MIDDLE partially; OLDEST is dropped.
        config.MAX_INPUT_CHARS_PER_GROUP = 800;
        processor = new AiSdkProcessor(config);

        const filler = "x".repeat(400);
        const messages: NormalizedMessage[] = [
            { id: "1", source: "discord", author: "A", content: `OLDEST ${filler}`, createdAt: "2026-07-21T08:00:00.000Z", url: "url", channelId: "456", channelName: "general" },
            { id: "2", source: "discord", author: "B", content: `MIDDLE ${filler}`, createdAt: "2026-07-21T09:00:00.000Z", url: "url", channelId: "456", channelName: "general" },
            { id: "3", source: "discord", author: "C", content: `NEWEST ${filler}`, createdAt: "2026-07-21T10:00:00.000Z", url: "url", channelId: "456", channelName: "general" },
        ];

        await processor.process(messages);

        const prompt: string = mockGenerateObject.mock.calls[0][0].prompt;
        expect(prompt).toContain("NEWEST");
        expect(prompt).toContain("MIDDLE");
        expect(prompt).not.toContain("OLDEST ");
        // Kept messages must still read oldest-first.
        expect(prompt.indexOf("MIDDLE")).toBeLessThan(prompt.indexOf("NEWEST"));
    });
});
