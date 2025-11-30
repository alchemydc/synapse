// src/DigestPipeline.ts
import { Source, Destination, Processor } from "./core/interfaces";
import { NormalizedMessage, DigestContext } from "./core/types";
import { Config } from "./config";
import { logger } from "./utils/logger";
import { getUtcDailyWindowFrom } from "./utils/time";
import { applyMessageFilters } from "./utils/filters";
import { buildDigestBlocks, formatDigest } from "./utils/format";
import { DigestItem } from "./core/schemas";

export class DigestPipeline {
    private sources: Source[] = [];
    private destinations: Destination[] = [];
    private processor: Processor;
    private config: Config;

    constructor(config: Config, processor: Processor) {
        this.config = config;
        this.processor = processor;
    }

    addSource(source: Source) {
        this.sources.push(source);
    }

    addDestination(destination: Destination) {
        this.destinations.push(destination);
    }

    async run() {
        logger.info("Starting digest pipeline...");
        const { start, end, dateTitle } = getUtcDailyWindowFrom(new Date());
        const context: DigestContext = { start, end, dateTitle };

        const allMessages: NormalizedMessage[] = [];

        // 1. Fetch
        for (const source of this.sources) {
            if (source.isEnabled()) {
                logger.info(`Fetching from source: ${source.name}`);
                try {
                    const messages = await source.fetchMessages(this.config.DIGEST_WINDOW_HOURS);
                    logger.info(`Fetched ${messages.length} messages from ${source.name}`);
                    allMessages.push(...messages);
                } catch (err: any) {
                    logger.error(`Failed to fetch from ${source.name}: ${err.message}`);
                }
            } else {
                logger.info(`Source ${source.name} is disabled.`);
            }
        }

        if (allMessages.length === 0) {
            logger.info("No messages fetched from any source.");
            return;
        }

        // 2. Group & Filter
        const groups = new Map<string, NormalizedMessage[]>();

        for (const msg of allMessages) {
            const key = msg.channelId || msg.topicId?.toString() || "unknown";
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(msg);
        }

        logger.info(`Processing ${groups.size} conversation groups...`);

        const summaries: (string | DigestItem)[] = [];

        // 3. Process (Summarize)
        for (const [key, messages] of groups) {
            const filtered = applyMessageFilters(messages, this.config);

            if (filtered.length === 0) {
                logger.debug(`No messages after filtering for group ${key}`);
                continue;
            }

            try {
                const result = await this.processor.process(filtered);
                if (typeof result === 'string') {
                    if (result.trim()) summaries.push(result);
                } else {
                    summaries.push(result);
                }
            } catch (err: any) {
                logger.error(`Failed to process group ${key}: ${err.message}`);
            }
        }

        if (summaries.length === 0) {
            logger.info("No summaries generated.");
            return;
        }

        // 4. Format & Send
        // Generate fallback text by converting items to markdown
        const combinedSummary = summaries.map(s => {
            if (typeof s === 'string') return s;
            return `## [${s.headline}](${s.url})\n\n${s.summary}`;
        }).join("\n\n");

        const blockSets = buildDigestBlocks({
            items: summaries,
            start,
            end,
            dateTitle,
        });

        for (const destination of this.destinations) {
            if (destination.isEnabled()) {
                logger.info(`Sending digest to ${destination.name}...`);

                const fallback = formatDigest(combinedSummary);

                for (let i = 0; i < blockSets.length; i++) {
                    const blocks = blockSets[i];
                    const messageFallback = blockSets.length > 1
                        ? `${fallback} (Part ${i + 1}/${blockSets.length})`
                        : fallback;

                    await destination.sendDigest(blocks, messageFallback, context);
                }
            }
        }

        logger.info("Pipeline run complete.");
    }
}
