# Next Steps for Project Synapse (2025-08-28)

## Actionable Checklist (2025-08-29)

- [X] Make Slack output prettier and clearer (acceptance: digest is visually distinct, easy to scan, and sections are well-formatted)
- [ ] Implement longer digest window on Mondays to capture weekend activity (acceptance: Monday digests cover Fri–Sun messages, header shows correct date range)
- [ ] Add support for pulling messages from multiple Discord servers (acceptance: config supports multiple server IDs, digests aggregate across servers)
- [ ] Flesh out Discourse integration (acceptance: forum messages are ingested, normalized, and summarized in the digest with source attribution)
- [X] Explore alternate LLM models for summarization; current "gemini-2.5-flash" returns no output (acceptance: alternate models tested, output validated). Fix was using gemini-2.0-flash as there is no 2.5 flash :) 
- [X] Scaffold utility to list available Gemini models and validate model names at runtime (acceptance: npm run models:list prints available model IDs, startup logs show model validation/fallback)
- [X] Fix link rendering for Gemini 2.0 output (acceptance: links in LLM output render correctly in Slack for both Markdown and bare URLs; formatter normalizes to Slack mrkdwn; unit tests cover link cases; default model remains gemini-1.5-flash until 2.0 passes)

## Implementation Roadmap

- [x] Scaffold Node.js/TypeScript project structure
- [x] Set up baseline scripts (lint, test, build, run)
- [x] Implement Discord service (channel/message retrieval, filters, rate limits)
- [x] Implement LLM service (Google Gemini API integration, prompt template, token controls)
- [x] Implement Slack service (mrkdwn formatting, posting)
- [x] Add scheduling (cron/Cloud Scheduler/GitHub Actions)
- [x] Configure environment variables (.env) and config module
- [x] Write unit tests for formatter and message filtering utilities
- [ ] Add centralized error handling and logging
- [ ] Monitor and tune rate limits for Discord API
- [x] Document architecture and usage

---

### Discourse Integration: Concrete Tasks

- [ ] Implement discourse debug script (done: `src/tools/discourse_debug.ts`)
- [ ] Implement discourse ingestion service (src/services/discourse/) to fetch recent topics and initial posts within the digest window, handling pagination and rate limits.
- [ ] Normalize Discourse posts to the internal message structure with fields: source, forum, category, topic_id, post_id, author, content, created_at.
- [ ] Integrate normalized Discourse messages into the existing ETL pipeline with existing filters and token-budget controls.
- [ ] Modify Slack formatter and LLM prompt to include source attribution (e.g., prefix or header: [Discord: server-name] / [Discourse: forum-name] per topic).
- [ ] Add config flags (future): ENABLE_SOURCE_TAGS, DISCOURSE_CATEGORY_IDS, DISCOURSE_LOOKBACK_HOURS.
- [ ] Add unit tests for multi-source formatting and prompt context.

---

### Post-MVP Feature Suggestion: Weekend Digest Window Extension

- On Mondays (UTC), extend DIGEST_WINDOW_HOURS from 24 to 72 to cover Fri–Sun messages.
- Header/context should render a 3-day UTC window (e.g., 2025-08-22 00:00–2025-08-25 00:00 UTC).
- Config: WEEKEND_WINDOW_HOURS=72 (default), DIGEST_WINDOW_HOURS=24 (default), ENABLE_WEEKEND_EXTEND=true.
- Implementation: Add helper (getEffectiveLookbackHours(nowUtc, cfg)), reuse getUtcDailyWindowFrom(), ensure DRY_RUN unaffected.
- Unit tests for Monday/non-Monday; consider future holiday rules.
