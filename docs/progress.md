# progress.md

## Snapshot (2025-09-25)
This document captures the current implementation status and short-term plan for the Synapse digest pipeline.

### High-level status
- Core digest pipeline implemented and exercising both Discord and Discourse ingestion paths.
- Per-source grouping and per-group summarization implemented; prompts updated to surface a "Shared Links" section.
- Link registry and injection improved: permissive Discourse title matching and safer forum-label injection are implemented and covered by tests.
- Slack Block Kit posting now guards against oversized payloads by chunking messages and capping fallback text.
- Unit test suite passing locally (all unit tests green).

## Completed work
- Simplified clusterMessages to assume per-source, pre-sorted input.
- Implemented per-source grouping and per-group summarization (src/main.ts).
- Added per-group debug logging.
- Implemented sanitized Discourse topic index and permissive lookup (src/utils/link_registry.ts).
- Hardened forum link injection with safer lookup and debug logging (src/utils/source_link_inject.ts).
- Added link injection tests (topics, id token, sanitized title, category) (test/unit/link_and_inject.test.ts).
- Updated Gemini prompts to include a "Shared Links" instruction and adjusted prompt unit tests (src/services/llm/gemini.ts, test/unit/gemini_prompt.test.ts).
- Implemented Slack Block Kit chunking & fallback truncation to avoid exceeding Slack limits (src/services/slack/index.ts).
- Updated clustering tests to reflect new cluster behavior (test/unit/topics.test.ts).

## Current work / Next steps
- Add unit tests specifically covering Slack chunking/truncation behavior (to prevent regressions).
- Add optional runtime config knobs for grouping behavior:
  - MAX_GROUPS
  - MIN_GROUP_MESSAGES
  - HYBRID_GROUPING_ENABLED
- Create small, reviewable commits for Phase 1/Phase 2/Phase 3 changes and push when approved.
- Update memory bank and docs to reflect the recent changes (this file is being updated now).
- Add targeted tests for Discourse fuzzy lookup edge-cases and prompt/formatter edge-cases.

## Known issues / risks
- Some Slack mrkdwn edge-cases remain and should be covered by tests.
- Larger deployments may require rate-limit tuning for Discord and more aggressive chunking / batching policies.
- Monitor LLM link rendering changes if moving to newer Gemini versions (2.x).

## Decisions log (recent)
- 2025-08-29: Default model pinned to gemini-1.5-flash pending link rendering investigation.
- 2025-09-12: Adopt staged Discourse integration: debug → ingestion → normalization → attribution → formatter.
- 2025-09-23: Avoid redundant per-topic "Key Topics" heading in prompts; update tests.
- 2025-09-24: Fixed Slack link rendering & implemented permissive Discourse title matching.
- 2025-09-25: Added Slack block chunking and fallback truncation to prevent oversized posts.

## Implementation checklist
- [x] Simplify clusterMessages (remove global sort & channel switch)
- [x] Update/extend topics tests
- [x] Refactor main.ts to per-source grouping + per-group summarize
- [x] Add per-group debug logging
- [ ] (Optional) Add config keys MAX_GROUPS / MIN_GROUP_MESSAGES / HYBRID_GROUPING_ENABLED
- [ ] Commit Phase 1 changes (local commits recommended)
- [x] Implement Discourse link sanitized index
- [x] Add link injection tests (topics, id token, sanitized, category)
- [x] Refactor forum regex in source_link_inject.ts (safer lookup + debug)
- [ ] Commit Phase 2 changes
- [x] Add “Shared Links” instruction to prompts
- [x] Update gemini prompt tests (explicit assertions added)
- [x] Implement Slack block chunking & fallback truncation
- [ ] Add tests for Slack truncation/chunking
- [ ] Commit Phase 3 changes
- [ ] Update other docs & memory bank (this file updated)
