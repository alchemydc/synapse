// test/unit/digest_pipeline.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DigestPipeline, DigestEntry, sortDigestEntries } from "../../src/DigestPipeline";
import { Source, Destination, Processor } from "../../src/core/interfaces";
import { Config } from "../../src/config";
import { NormalizedMessage } from "../../src/core/types";
import { DigestItem } from "../../src/core/schemas";

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

    describe("weekend skip", () => {
        // The pipeline reads the clock itself, so these cases drive it with a
        // fixed system time. 13:00 UTC is the hour Cloud Scheduler fires.
        const makeMocks = () => ({
            source: {
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
            } as Source,
            dest: {
                name: "mock-dest",
                isEnabled: () => true,
                sendDigest: vi.fn().mockResolvedValue(undefined),
            } as Destination,
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        const runAt = async (iso: string, skipWeekend: boolean) => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(iso));
            config.SKIP_WEEKEND = skipWeekend;

            const { source, dest } = makeMocks();
            const p = new DigestPipeline(config, processor);
            p.addSource(source);
            p.addDestination(dest);
            await p.run();
            return { source, dest };
        };

        it("fetches nothing and sends nothing on Saturday", async () => {
            const { source, dest } = await runAt("2026-08-15T13:00:00Z", true);

            expect(source.fetchMessages).not.toHaveBeenCalled();
            expect(processor.process).not.toHaveBeenCalled();
            expect(dest.sendDigest).not.toHaveBeenCalled();
        });

        it("fetches nothing and sends nothing on Sunday", async () => {
            const { source, dest } = await runAt("2026-08-09T13:00:00Z", true);

            expect(source.fetchMessages).not.toHaveBeenCalled();
            expect(dest.sendDigest).not.toHaveBeenCalled();
        });

        it("passes the 48h weekend extension to sources on Monday", async () => {
            const { source, dest } = await runAt("2026-08-10T13:00:00Z", true);

            expect(source.fetchMessages).toHaveBeenCalledWith(24, 48);
            expect(dest.sendDigest).toHaveBeenCalled();
        });

        it("passes no extension on an ordinary weekday", async () => {
            const { source } = await runAt("2026-08-11T13:00:00Z", true);

            expect(source.fetchMessages).toHaveBeenCalledWith(24, 0);
        });

        it("titles the Monday digest with the full weekend range", async () => {
            const { dest } = await runAt("2026-08-10T13:00:00Z", true);

            const context = (dest.sendDigest as any).mock.calls[0][2];
            expect(context.dateTitle).toBe("2026-08-07 → 2026-08-10");
            expect(context.start.toISOString()).toBe("2026-08-07T13:00:00.000Z");
            expect(context.end.toISOString()).toBe("2026-08-10T13:00:00.000Z");
        });

        it("titles an ordinary weekday digest with a single date", async () => {
            const { dest } = await runAt("2026-08-11T13:00:00Z", true);

            const context = (dest.sendDigest as any).mock.calls[0][2];
            expect(context.dateTitle).toBe("2026-08-11");
        });

        it("runs on Saturday with no extension when SKIP_WEEKEND is false", async () => {
            const { source, dest } = await runAt("2026-08-15T13:00:00Z", false);

            expect(source.fetchMessages).toHaveBeenCalledWith(24, 0);
            expect(dest.sendDigest).toHaveBeenCalled();
        });

        it("drops the Monday extension when SKIP_WEEKEND is false", async () => {
            const { source } = await runAt("2026-08-10T13:00:00Z", false);

            expect(source.fetchMessages).toHaveBeenCalledWith(24, 0);
        });
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

    it("sorts groups by importance before sending", async () => {
        const makeMessage = (id: string, channelId: string): NormalizedMessage => ({
            id,
            source: "discord",
            channelId,
            content: "valid message content",
            author: "user",
            createdAt: new Date().toISOString(),
            url: `http://url/${channelId}`,
        });

        const itemsByChannel: Record<string, DigestItem> = {
            chan1: { headline: "#casual", url: "http://url/chan1", summary: "chatter", importance: "low" },
            chan2: { headline: "#security", url: "http://url/chan2", summary: "vuln report", importance: "high" },
            chan3: { headline: "#dev", url: "http://url/chan3", summary: "refactor talk", importance: "medium" },
        };

        processor.process = vi.fn().mockImplementation(async (msgs: NormalizedMessage[]) =>
            itemsByChannel[msgs[0].channelId!]
        );

        const mockSource: Source = {
            name: "mock-source",
            isEnabled: () => true,
            fetchMessages: vi.fn().mockResolvedValue([
                makeMessage("1", "chan1"),
                makeMessage("2", "chan2"),
                makeMessage("3", "chan3"),
            ]),
        };

        const sent: any[][] = [];
        const mockDest: Destination = {
            name: "mock-dest",
            isEnabled: () => true,
            sendDigest: vi.fn().mockImplementation(async (blocks: any[]) => {
                sent.push(blocks);
            }),
        };

        pipeline.addSource(mockSource);
        pipeline.addDestination(mockDest);

        await pipeline.run();

        expect(sent).toHaveLength(1);
        const sectionTexts = sent[0]
            .filter((b: any) => b.type === "section")
            .map((b: any) => b.text.text);

        // High before medium; low collapsed into a trailing "Also active" line.
        const securityIdx = sectionTexts.findIndex((t: string) => t.includes("#security"));
        const devIdx = sectionTexts.findIndex((t: string) => t.includes("#dev"));
        const alsoActiveIdx = sectionTexts.findIndex((t: string) => t.includes("Also active"));
        expect(securityIdx).toBeGreaterThanOrEqual(0);
        expect(securityIdx).toBeLessThan(devIdx);
        expect(devIdx).toBeLessThan(alsoActiveIdx);
        expect(sectionTexts[alsoActiveIdx]).toContain("<http://url/chan1|#casual>");
    });
});

describe("sortDigestEntries", () => {
    const item = (importance: DigestItem["importance"]): DigestItem => ({
        headline: "h",
        url: "u",
        summary: "s",
        ...(importance ? { importance } : {}),
    });

    it("orders high before medium before low, with strings last", () => {
        const entries: DigestEntry[] = [
            { result: item("low"), messageCount: 1, key: "a" },
            { result: "plain string", messageCount: 100, key: "b" },
            { result: item("high"), messageCount: 1, key: "c" },
            { result: item("medium"), messageCount: 1, key: "d" },
        ];

        const sorted = sortDigestEntries(entries);
        expect(sorted.map(e => e.key)).toEqual(["c", "d", "a", "b"]);
    });

    it("treats missing importance as medium", () => {
        const entries: DigestEntry[] = [
            { result: item("low"), messageCount: 1, key: "a" },
            { result: item(undefined), messageCount: 1, key: "b" },
            { result: item("high"), messageCount: 1, key: "c" },
        ];

        const sorted = sortDigestEntries(entries);
        expect(sorted.map(e => e.key)).toEqual(["c", "b", "a"]);
    });

    it("tiebreaks by message count desc, then key", () => {
        const entries: DigestEntry[] = [
            { result: item("medium"), messageCount: 2, key: "b" },
            { result: item("medium"), messageCount: 5, key: "c" },
            { result: item("medium"), messageCount: 2, key: "a" },
        ];

        const sorted = sortDigestEntries(entries);
        expect(sorted.map(e => e.key)).toEqual(["c", "a", "b"]);
    });

    it("does not mutate the input array", () => {
        const entries: DigestEntry[] = [
            { result: item("low"), messageCount: 1, key: "a" },
            { result: item("high"), messageCount: 1, key: "b" },
        ];
        sortDigestEntries(entries);
        expect(entries.map(e => e.key)).toEqual(["a", "b"]);
    });
});
