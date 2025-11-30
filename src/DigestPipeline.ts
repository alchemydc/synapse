// src/DigestPipeline.ts
import { Source, Destination, Processor } from "./core/interfaces";
import { NormalizedMessage, DigestContext } from "./core/types";
import { Config } from "./config";
import { logger } from "./utils/logger";
import { getUtcDailyWindowFrom } from "./utils/time";
import { applyMessageFilters } from "./utils/filters";
import { buildDigestBlocks, formatDigest } from "./utils/format";

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
                    // Continue with other sources? Or fail?
                    // Original code failed on Discourse error but logged Discord error?
                    // Let's log and continue for robustness, unless it's critical.
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
        // We need to group by "conversation" (channel or topic)
        const groups = new Map<string, NormalizedMessage[]>();

        for (const msg of allMessages) {
            const key = msg.channelId || msg.topicId?.toString() || "unknown";
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(msg);
        }

        logger.info(`Processing ${groups.size} conversation groups...`);

        const summaries: string[] = [];

        // 3. Process (Summarize)
        for (const [key, messages] of groups) {
            const filtered = applyMessageFilters(messages, this.config);

            if (filtered.length === 0) {
                logger.debug(`No messages after filtering for group ${key}`);
                continue;
            }

            try {
                const summary = await this.processor.process(filtered);
                if (summary.trim()) {
                    summaries.push(summary);
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
        const combinedSummary = summaries.join("\n\n");
        const blockSets = buildDigestBlocks({
            summary: combinedSummary,
            start,
            end,
            dateTitle,
        });

        // Flatten block sets? No, sendDigest might handle one set or we iterate.
        // buildDigestBlocks returns any[][]. Each inner array is a message payload (blocks).
        // SlackDestination expects DigestBlock[] (which is any[] for now).
        // But SlackDestination handles splitting internally?
        // Wait, `SlackDestination` I implemented COPIED the splitting logic.
        // So `SlackDestination` expects the FULL set of blocks?
        // Let's check `SlackDestination.ts`.
        // It takes `blocks: DigestBlock[]` and splits them.
        // But `buildDigestBlocks` ALSO splits them?
        // `buildDigestBlocks` returns `any[][]`.
        // If I pass `any[][]` to `SlackDestination`, it might be wrong.

        // Let's look at `buildDigestBlocks` in `src/utils/format.ts`.
        // It returns `any[][]`.
        // It splits by topic if needed.

        // If `SlackDestination` also splits, we might be double splitting or confusing it.
        // `SlackDestination` implementation:
        // `if (blocks.length <= MAX_BLOCKS_PER_MESSAGE ...)`
        // `else ... split`

        // If `buildDigestBlocks` returns multiple sets, it means it ALREADY split them to fit logical chunks (topics).
        // So we should iterate over the sets returned by `buildDigestBlocks` and send each one?
        // OR, we should pass the raw summary to `SlackDestination` and let it format?
        // But `Destination` interface takes `blocks`.

        // Ideally, `Pipeline` shouldn't know about Slack block limits.
        // But `buildDigestBlocks` is a helper that knows about Slack limits.
        // Maybe `SlackDestination` should call `buildDigestBlocks`?
        // But `buildDigestBlocks` is generic formatting logic? No, it's specific to Slack blocks.
        // It's in `utils/format.ts`.

        // Refactor idea: Move `buildDigestBlocks` INTO `SlackDestination`?
        // Or keep it as a utility.

        // If `buildDigestBlocks` returns `any[][]`, it means "List of Messages".
        // `SlackDestination.sendDigest` takes `blocks: DigestBlock[]`.
        // This implies ONE message (or a logical unit).
        // If `buildDigestBlocks` returns multiple messages, we should probably call `sendDigest` multiple times?
        // But `sendDigest` also has splitting logic!

        // Let's simplify.
        // `SlackDestination`'s splitting logic is for when a SINGLE logical digest is too big.
        // `buildDigestBlocks` logic is for formatting AND splitting.

        // I should probably remove the splitting logic from `SlackDestination` if `buildDigestBlocks` handles it.
        // OR, I should make `buildDigestBlocks` return a single huge list of blocks and let `SlackDestination` split it.
        // But `buildDigestBlocks` adds headers/dividers intelligently.

        // Let's assume `buildDigestBlocks` returns `any[][]` (list of block-sets).
        // And we want to send all of them.
        // But `Destination.sendDigest` signature is `Promise<void>`.
        // Maybe `sendDigest` should take `blocks: DigestBlock[][]`?
        // Or we iterate.

        // But wait, `SlackDestination` implementation I wrote:
        // `async sendDigest(blocks: DigestBlock[], summary: string, context: DigestContext)`
        // It has splitting logic: `for (let i = 0; i < blocks.length; i += MAX_BLOCKS_PER_MESSAGE)`

        // If `buildDigestBlocks` returns `any[][]`, I can flatten it?
        // No, `buildDigestBlocks` adds headers to each set.

        // I'll iterate over `blockSets` and call `sendDigest` for each?
        // But `sendDigest` expects `summary` string for fallback.
        // `buildDigestBlocks` uses `summary` to generate blocks.

        // This is a bit messy.
        // The issue is `buildDigestBlocks` does too much (formatting + splitting).
        // And `SlackDestination` also does splitting.

        // Decision:
        // I will use `buildDigestBlocks` to get `any[][]`.
        // I will flatten it into `any[]`? No, headers would be duplicated or wrong.

        // Actually, `SlackDestination` should probably just take the `summary` and do the formatting itself?
        // `sendDigest(blocks: DigestBlock[], summary: string, ...)`
        // If I pass empty blocks, `SlackDestination` could generate them?
        // But `Destination` is generic.

        // Let's stick to: Pipeline formats blocks.
        // If `buildDigestBlocks` returns multiple sets, I will send them one by one.
        // But `SlackDestination` logic might try to split them AGAIN if they are big?
        // `buildDigestBlocks` ensures they are <= 45 blocks.
        // `SlackDestination` checks `<= 50`.
        // So `SlackDestination` won't split them again if `buildDigestBlocks` did its job.

        // So:
        // 1. `buildDigestBlocks` returns `blockSets: any[][]`.
        // 2. Iterate `blockSets`.
        // 3. For each `blocks`, call `dest.sendDigest(blocks, summary, context)`.
        // Wait, `summary` is the WHOLE summary.
        // If we send partial blocks, the fallback `summary` should probably match?
        // Or just send the whole summary as fallback for every part? That's spammy.

        // `SlackDestination` splits fallback text too.

        // Okay, the previous `postDigestBlocks` in `slack/index.ts` handled `any[][]`?
        // No, `postDigestBlocks` took `blocks: any[]` and split it.
        // `main.ts` called `buildDigestBlocks` which returned `blockSets`.
        // Then `main.ts` iterated:
        /*
          for (let i = 0; i < blockSets.length; i++) {
            const blocks = blockSets[i];
            const messageFallback = ...
            await postDigestBlocks(blocks, messageFallback, config);
          }
        */

        // So `main.ts` handled the iteration.
        // `postDigestBlocks` ALSO had splitting logic?
        /*
          // If blocks fit ... send as one
          // Otherwise, split ...
        */
        // Yes, it had double safety.

        // So `DigestPipeline` should mimic `main.ts` logic.
        // Iterate `blockSets`.
        // Calculate fallback for each set?
        // `main.ts` logic:
        /*
          const messageFallback = blockSets.length > 1
            ? `${fallback} (Part ${i + 1}/${blockSets.length})`
            : fallback;
        */
        // This passes the FULL fallback (plus part suffix) to each message?
        // That seems wrong if the fallback is huge.
        // But `postDigestBlocks` handles splitting the fallback text if it's too large.

        // So passing the full fallback is fine, `SlackDestination` will chunk it if needed.
        // But if we send 3 messages, and each has the full fallback (chunked), we send 3x the text?
        // No, `postDigestBlocks` splits the text into chunks and sends chunk 1 with message 1?
        // `postDigestBlocks` logic:
        /*
          const textChunks = ...
          const totalParts = Math.max(blockChunks.length, textChunks.length);
          for (let part = 0; part < totalParts; part++) {
             ...
             await postSingle({ blocks: ..., text: textChunks[part] });
          }
        */
        // If we pass a small set of blocks (from `buildDigestBlocks`), `blockChunks` will have length 1.
        // If we pass a huge fallback, `textChunks` will have length N.
        // Then it sends N messages.
        // Message 1: blocks + textChunk 1.
        // Message 2: no blocks + textChunk 2.

        // This seems robust enough.

        // So `DigestPipeline` will:
        // 1. Get `blockSets` from `buildDigestBlocks`.
        // 2. Iterate and call `dest.sendDigest`.

        for (const destination of this.destinations) {
            if (destination.isEnabled()) {
                logger.info(`Sending digest to ${destination.name}...`);

                // We might need to handle the "Part X/Y" logic here if we want it in the fallback text.
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
