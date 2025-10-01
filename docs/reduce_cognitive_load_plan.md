# Reduce Cognitive Load — Refactor Plan

## User's Simplified Architecture Vision

**Original prompt:**
Complexity spiraled out of control because we over complicated things. In the new flow I want to:
1. Pull messages for DISCORD_CHANNELS for DIGEST_WINDOW_HOURS from discord
2. Make a call to the LLM to generate a summary per channel (with the channel being a clickable human readable name), allowing the LLM to highlight conversations we care about (funding, governance, security, performance, adoption, etc.) and noting which participants were involved in which conversation
3. Pull messages from the forum for DIGEST_WINDOW_HOURS, using the existing logic to not get hung up on pinned messages
4. Make a call to the LLM to generate a summary for each new forum topic (+ replies) or replies to existing forum topics, again highlighting convos we care about, with the summary header being a human readable clickable link to the forum topic in question
5. Send the summaries to slack, with pretty formatting and being cognizant of slack mrkdown and block size limits

This simplified approach eliminates clustering and link injection code that is a hangover from a previous architecture.

**Clarifications:**
- Use Discord API to get human readable channel names
- Keep existing filters
- Let LLM decide what's important (may tune later)
- Ask LLM to note participants (certain participants give weight to topics)
- Group forum replies by parent topic

## Goal
Reduce extraneous cognitive load while preserving current functionality. Make the codebase easier to read, reason about, and modify by eliminating unnecessary utilities and linearizing the main pipeline.

## Key Problems Identified
- **Too many shallow utility modules** (8 files) that force frequent context switches
- **Complex multi-path formatting** function with nested logic (`buildDigestBlocks`)
- **Scattered transformations** and hidden state (link_registry with global state)
- **Convoluted pipeline** requiring jumping between many modules to follow data flow
- **Over-engineered clustering** when per-source summarization is simpler

## Simplified Architecture

### New Flow (Linear & Simple)
```
Discord: fetch per channel → filter → LLM summarize per channel → aggregate
Forum: fetch all → group by topic → filter → LLM summarize per topic → aggregate
Combined: all summaries → format for Slack → post
```

### What Gets Deleted (8+ files)
- `src/utils/topics.ts` - clustering logic (replaced by per-source summarization)
- `src/utils/link_registry.ts` - global link state (no longer needed)
- `src/utils/source_link_inject.ts` - post-hoc link injection (LLM includes links)
- `src/utils/participants_dedupe.ts` - deduplication (LLM handles)
- `src/utils/participants_fallback.ts` - fallback injection (LLM handles)
- `src/utils/topic_priority.ts` - emoji-based sorting (LLM decides priority)
- `src/utils/topic_refine.ts` - refinement logic (no longer needed)
- `src/utils/source_labels.ts` - source label formatting (simplified)
- `src/utils/llm_sanitize.ts` - output cleanup (LLM outputs clean markdown)

### What Gets Simplified
- `src/main.ts` - from 180+ lines to ~100 lines (linear pipeline)
- `src/services/llm/gemini.ts` - two focused functions instead of multiple paths
- `src/utils/format.ts` - simpler (just markdown→mrkdwn→blocks)
- `src/services/discord/index.ts` - remove link_registry calls
- `src/services/discourse/index.ts` - remove link_registry calls

## Implementation Phases

### Phase 1: Delete Unnecessary Code
**Action:** Remove 8 utility files that add complexity without value
**Files to delete:**
- All utils listed above
- Related unit tests (topic_priority.test.ts, topics.test.ts, sanitize_mixed_format.test.ts, link_and_inject.test.ts, gemini_attributed_prompt.test.ts)

### Phase 2: Simplify Services
**2.1 Update Discord service (`src/services/discord/index.ts`):**
- Remove `registerDiscordChannel()` calls and import
- Keep `channelName` in MessageDTO (already fetched from API)

**2.2 Update Discourse service (`src/services/discourse/index.ts`):**
- Remove `registerDiscourseCategory()` and `registerDiscourseTopic()` calls
- Keep topic grouping by `topicId` (already working)
- Remove link_registry imports

### Phase 3: Create New LLM Functions
**Update `src/services/llm/gemini.ts`:**

Create two new focused functions:
```typescript
// Summarize one Discord channel's messages
async function summarizeDiscordChannel(
  messages: MessageDTO[],
  channelName: string,
  channelId: string,
  guildId: string,
  config: Config
): Promise<string>

// Summarize one Discourse topic (original post + replies)
async function summarizeDiscourseTopic(
  messages: NormalizedMessage[],
  topicTitle: string,
  topicUrl: string,
  config: Config
): Promise<string>
```

**Prompt guidance:**
- Ask LLM to identify important conversations naturally
- Request participant names for significant discussions
- Output format: markdown with clickable header (Discord channel link or Forum topic link)
- No need for explicit emoji prefixes or priority sorting
- LLM handles participant attribution inline

**Remove old functions:**
- `summarize()` (non-attributed)
- `summarizeAttributed()` (clustering-based)

### Phase 4: Rewrite main.ts (Linear Pipeline)

**New simplified structure:**
```typescript
async function run() {
  const summaries: string[] = [];
  const { start, end, dateTitle } = getUtcDailyWindowFrom(new Date());
  
  // === DISCORD CHANNELS ===
  if (config.DISCORD_ENABLED) {
    logger.info(`Fetching from ${config.DISCORD_CHANNELS.length} Discord channels...`);
    
    for (const channelId of config.DISCORD_CHANNELS) {
      const messages = await fetchMessagesForChannel(channelId, config);
      const filtered = applyMessageFilters(messages, config);
      
      if (filtered.length === 0) {
        logger.info(`No messages after filtering for channel ${channelId}`);
        continue;
      }
      
      // Channel name already fetched by Discord API
      const channelName = filtered[0].channelName || channelId;
      const guildId = filtered[0].guildId || 'unknown';
      
      logger.info(`Summarizing ${filtered.length} messages from #${channelName}...`);
      const summary = await summarizeDiscordChannel(
        filtered, 
        channelName, 
        channelId,
        guildId,
        config
      );
      
      if (summary.trim()) {
        summaries.push(summary);
      }
    }
  }
  
  // === DISCOURSE FORUM ===
  if (config.DISCOURSE_ENABLED) {
    logger.info("Fetching from Discourse forum...");
    
    const forumMessages = await fetchDiscourseMessages({
      baseUrl: config.DISCOURSE_BASE_URL!,
      apiKey: config.DISCOURSE_API_KEY!,
      apiUser: config.DISCOURSE_API_USERNAME!,
      windowHours: config.DIGEST_WINDOW_HOURS,
      maxTopics: config.DISCOURSE_MAX_TOPICS ?? 50,
      lookbackHours: config.DISCOURSE_LOOKBACK_HOURS,
    });
    
    // Group by topicId
    const topicGroups = new Map<number, NormalizedMessage[]>();
    for (const msg of forumMessages) {
      if (!msg.topicId) continue;
      if (!topicGroups.has(msg.topicId)) {
        topicGroups.set(msg.topicId, []);
      }
      topicGroups.get(msg.topicId)!.push(msg);
    }
    
    logger.info(`Processing ${topicGroups.size} forum topics...`);
    
    for (const [topicId, messages] of topicGroups) {
      const filtered = applyMessageFilters(messages, config);
      
      if (filtered.length === 0) continue;
      
      // Topic info from first message
      const topicTitle = filtered[0].topicTitle || `Topic ${topicId}`;
      const topicUrl = filtered[0].url;
      
      logger.info(`Summarizing topic: ${topicTitle}...`);
      const summary = await summarizeDiscourseTopic(
        filtered,
        topicTitle,
        topicUrl,
        config
      );
      
      if (summary.trim()) {
        summaries.push(summary);
      }
    }
  }
  
  // === FORMAT AND POST TO SLACK ===
  if (summaries.length === 0) {
    logger.info("No summaries generated, skipping Slack post");
    return;
  }
  
  logger.info(`Formatting ${summaries.length} summaries for Slack...`);
  const combinedSummary = summaries.join('\n\n---\n\n');
  
  const blockSets = buildDigestBlocks({
    summary: combinedSummary,
    start,
    end,
    dateTitle
  });
  
  const fallback = formatDigest(combinedSummary);
  
  logger.info("Posting digest to Slack...");
  for (let i = 0; i < blockSets.length; i++) {
    const blocks = blockSets[i];
    const messageFallback = blockSets.length > 1 
      ? `${fallback} (Part ${i + 1}/${blockSets.length})`
      : fallback;
    
    await postDigestBlocks(blocks, messageFallback, config);
  }
  
  logger.info("Pipeline complete.");
}
```

### Phase 5: Simplify format.ts

**Remove complexity:**
- Remove topic header parsing (LLM outputs ready-to-use markdown with links)
- Remove participants extraction logic (LLM includes it inline)
- Simplify to: markdown → Slack mrkdwn → blocks with dividers

**Keep:**
- `normalizeToSlackMrkdwn()` - convert markdown to Slack format
- Block splitting for 50-block limit (chunk into multiple messages)
- Dividers between source summaries for visual separation

### Phase 6: Update Tests

**Delete tests for removed code:**
- `test/unit/topic_priority.test.ts`
- `test/unit/topics.test.ts`
- `test/unit/sanitize_mixed_format.test.ts`
- `test/unit/link_and_inject.test.ts`
- `test/unit/gemini_attributed_prompt.test.ts`
- Others related to deleted utils

**Keep and update:**
- `test/unit/discord_filters.test.ts` - still valid
- `test/unit/format.test.ts` - simplify for new format logic
- `test/unit/format_block_*.test.ts` - update for simplified structure
- `test/unit/discourse_*.test.ts` - still valid

## Impact Summary

### File Count Reduction
- **Before:** ~25 source files, ~15 test files
- **After:** ~15 source files, ~10 test files
- **Deleted:** 8 utility files, 5+ test files
- **Simplified:** main.ts, format.ts, gemini.ts, discord/index.ts, discourse/index.ts

### Code Size Reduction
- `main.ts`: 180 lines → ~100 lines
- `format.ts`: 200 lines → ~100 lines
- `gemini.ts`: Focused functions replace multiple paths
- Overall: ~30-40% code reduction

### Cognitive Load Reduction
- **From:** 🤯 (cognitive overload - too many modules to track)
- **To:** 🧠+ (manageable - linear flow, deep modules)

**Key improvements:**
- Linear, easy-to-trace pipeline
- No more jumping between 8+ utility modules
- LLM does natural language work (its strength)
- Code does structured work (fetch, filter, format)
- Simple interfaces: one function per source type
- No hidden global state
- Explicit data flow

## Testing & Safety

- Keep existing filter tests (logic unchanged)
- Update format tests for simplified structure
- Run full test suite before and after
- Use DRY_RUN to validate Slack formatting
- Staging test with real Discord/Forum data before production

## Expected Benefits

1. **Easier onboarding** - new developers can understand the flow in minutes
2. **Simpler debugging** - linear execution path, no hidden state
3. **More maintainable** - fewer files, clearer responsibilities
4. **Flexible** - easy to add new sources or modify prompts
5. **Reliable** - fewer moving parts means fewer bugs

## Implementation Order

1. ✅ Document new architecture (this file)
2. ⬜ Delete unnecessary utility files (Phase 1)
3. ⬜ Remove link_registry from services (Phase 2)
4. ⬜ Create new LLM functions (Phase 3)
5. ⬜ Rewrite main.ts (Phase 4)
6. ⬜ Simplify format.ts (Phase 5)
7. ⬜ Update/delete tests (Phase 6)
8. ⬜ Run full test suite
9. ⬜ DRY_RUN validation
10. ⬜ Deploy and monitor
