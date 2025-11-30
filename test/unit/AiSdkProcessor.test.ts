// test/unit/AiSdkProcessor.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiSdkProcessor } from "../../src/services/llm/AiSdkProcessor";
import { Config } from "../../src/config";
import { NormalizedMessage } from "../../src/core/types";

// Mock dependencies
const mockGenerateText = vi.fn();
const mockGoogleModel = vi.fn();
const mockCreateGoogleGenerativeAI = vi.fn(() => mockGoogleModel);

vi.mock("ai", () => ({
    generateText: (args: any) => mockGenerateText(args),
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
        mockGenerateText.mockResolvedValue({ text: "Generated Summary" });

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

        const result = await processor.process(messages);

        expect(mockGoogleModel).toHaveBeenCalledWith("gemini-1.5-pro");
        expect(mockGenerateText).toHaveBeenCalled();
        expect(result).toContain("## [#general](https://discord.com/channels/123/456)");
        expect(result).toContain("Generated Summary");
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

        const result = await processor.process(messages);

        expect(mockGenerateText).toHaveBeenCalled();
        expect(result).toContain("## [My Topic](https://forum.example.com/t/topic-slug/123)");
        expect(result).toContain("Generated Summary");
    });

    it("should handle empty messages", async () => {
        const result = await processor.process([]);
        expect(result).toBe("");
        expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it("should handle generation errors gracefully", async () => {
        mockGenerateText.mockRejectedValue(new Error("API Error"));

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

        const result = await processor.process(messages);
        expect(result).toContain("Error generating summary");
    });
});
