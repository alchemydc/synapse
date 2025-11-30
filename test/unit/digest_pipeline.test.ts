// test/unit/digest_pipeline.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DigestPipeline } from "../../src/DigestPipeline";
import { Source, Destination, Processor } from "../../src/core/interfaces";
import { Config } from "../../src/config";
import { NormalizedMessage } from "../../src/core/types";

describe("DigestPipeline", () => {
    let config: Config;
    let processor: Processor;
    let pipeline: DigestPipeline;

    beforeEach(() => {
        config = {
            DIGEST_WINDOW_HOURS: 24,
            MIN_MESSAGE_LENGTH: 10,
            EXCLUDE_COMMANDS: true,
            EXCLUDE_LINK_ONLY: true,
            DISCORD_CHANNELS: [],
            DISCORD_ENABLED: true,
            DISCOURSE_ENABLED: true,
            DRY_RUN: false,
        } as any;

        processor = {
            name: "mock-processor",
            process: vi.fn().mockResolvedValue("Mock Summary"),
        };

        pipeline = new DigestPipeline(config, processor);
    });

    it("runs the full pipeline", async () => {
        const mockSource: Source = {
            name: "mock-source",
            isEnabled: () => true,
            fetchMessages: vi.fn().mockResolvedValue([
                {
                    id: "1",
                    source: "discord",
                    channelId: "chan1",
                    content: "valid message content",
                    author: "user",
                    createdAt: new Date().toISOString(),
                    url: "http://url",
                } as NormalizedMessage,
            ]),
        };

        const mockDest: Destination = {
            name: "mock-dest",
            isEnabled: () => true,
            sendDigest: vi.fn().mockResolvedValue(undefined),
        };

        pipeline.addSource(mockSource);
        pipeline.addDestination(mockDest);

        await pipeline.run();

        expect(mockSource.fetchMessages).toHaveBeenCalled();
        expect(processor.process).toHaveBeenCalled();
        expect(mockDest.sendDigest).toHaveBeenCalled();
    });

    it("skips disabled sources", async () => {
        const mockSource: Source = {
            name: "disabled-source",
            isEnabled: () => false,
            fetchMessages: vi.fn(),
        };

        pipeline.addSource(mockSource);
        await pipeline.run();

        expect(mockSource.fetchMessages).not.toHaveBeenCalled();
    });

    it("handles empty fetch results", async () => {
        const mockSource: Source = {
            name: "empty-source",
            isEnabled: () => true,
            fetchMessages: vi.fn().mockResolvedValue([]),
        };

        const mockDest: Destination = {
            name: "mock-dest",
            isEnabled: () => true,
            sendDigest: vi.fn(),
        };

        pipeline.addSource(mockSource);
        pipeline.addDestination(mockDest);

        await pipeline.run();

        expect(mockSource.fetchMessages).toHaveBeenCalled();
        expect(processor.process).not.toHaveBeenCalled();
        expect(mockDest.sendDigest).not.toHaveBeenCalled();
    });
});
