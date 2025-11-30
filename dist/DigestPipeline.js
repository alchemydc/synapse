"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigestPipeline = void 0;
const logger_1 = require("./utils/logger");
const time_1 = require("./utils/time");
const filters_1 = require("./utils/filters");
const format_1 = require("./utils/format");
class DigestPipeline {
    sources = [];
    destinations = [];
    processor;
    config;
    constructor(config, processor) {
        this.config = config;
        this.processor = processor;
    }
    addSource(source) {
        this.sources.push(source);
    }
    addDestination(destination) {
        this.destinations.push(destination);
    }
    async run() {
        logger_1.logger.info("Starting digest pipeline...");
        const { start, end, dateTitle } = (0, time_1.getUtcDailyWindowFrom)(new Date());
        const context = { start, end, dateTitle };
        const allMessages = [];
        // 1. Fetch
        for (const source of this.sources) {
            if (source.isEnabled()) {
                logger_1.logger.info(`Fetching from source: ${source.name}`);
                try {
                    const messages = await source.fetchMessages(this.config.DIGEST_WINDOW_HOURS);
                    logger_1.logger.info(`Fetched ${messages.length} messages from ${source.name}`);
                    allMessages.push(...messages);
                }
                catch (err) {
                    logger_1.logger.error(`Failed to fetch from ${source.name}: ${err.message}`);
                }
            }
            else {
                logger_1.logger.info(`Source ${source.name} is disabled.`);
            }
        }
        if (allMessages.length === 0) {
            logger_1.logger.info("No messages fetched from any source.");
            return;
        }
        // 2. Group & Filter
        const groups = new Map();
        for (const msg of allMessages) {
            const key = msg.channelId || msg.topicId?.toString() || "unknown";
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(msg);
        }
        logger_1.logger.info(`Processing ${groups.size} conversation groups...`);
        const summaries = [];
        // 3. Process (Summarize)
        for (const [key, messages] of groups) {
            const filtered = (0, filters_1.applyMessageFilters)(messages, this.config);
            if (filtered.length === 0) {
                logger_1.logger.debug(`No messages after filtering for group ${key}`);
                continue;
            }
            try {
                const result = await this.processor.process(filtered);
                if (typeof result === 'string') {
                    if (result.trim())
                        summaries.push(result);
                }
                else {
                    summaries.push(result);
                }
            }
            catch (err) {
                logger_1.logger.error(`Failed to process group ${key}: ${err.message}`);
            }
        }
        if (summaries.length === 0) {
            logger_1.logger.info("No summaries generated.");
            return;
        }
        // 4. Format & Send
        // Generate fallback text by converting items to markdown
        const combinedSummary = summaries.map(s => {
            if (typeof s === 'string')
                return s;
            return `## [${s.headline}](${s.url})\n\n${s.summary}`;
        }).join("\n\n");
        const blockSets = (0, format_1.buildDigestBlocks)({
            items: summaries,
            start,
            end,
            dateTitle,
        });
        for (const destination of this.destinations) {
            if (destination.isEnabled()) {
                logger_1.logger.info(`Sending digest to ${destination.name}...`);
                const fallback = (0, format_1.formatDigest)(combinedSummary);
                for (let i = 0; i < blockSets.length; i++) {
                    const blocks = blockSets[i];
                    const messageFallback = blockSets.length > 1
                        ? `${fallback} (Part ${i + 1}/${blockSets.length})`
                        : fallback;
                    await destination.sendDigest(blocks, messageFallback, context);
                }
            }
        }
        logger_1.logger.info("Pipeline run complete.");
    }
}
exports.DigestPipeline = DigestPipeline;
