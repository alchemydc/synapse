# progress.md

## Snapshot (2025-09-25)
This document captures the current implementation status and short-term plan for the Synapse digest pipeline.

### High-level status
- Core digest pipeline implemented and exercising both Discord and Discourse ingestion paths.
- Per-source grouping and per-group summarization implemented; prompts updated to surface a "Shared Links" section.
- Link registry and injection improved: permissive Discourse title matching and safer forum-label injection implemented and covered by tests.
- Slack Block Kit posting now guards against oversized payloads by chunking messages and capping fallback text.
- Unit test suite passing locally (all unit tests green).

## Completed work (new entries)
- Implemented safer Block Kit section splitting in `src/utils/format.ts` to avoid the legacy single-section 2800-char truncation that caused Discourse summaries to be lost in Slack posts.
  - Splitting strategy: split on legacy '---' groups, then by paragraphs, then soft-split very large blobs at paragraph boundaries.
  - Preserves a leading "*Summary*" label on the first section and renders trailing "Participants" as context blocks.
  - Introduced environment knob `SECTION_CHAR_LIMIT` (default 2800) to tune per-section safety.
- Added targeted unit tests: `test/unit/format_block_split.test.ts` covering:
  - Legacy '---' group splitting and Summary label preservation.
  - Soft-splitting very large blobs so per-section content remains under SECTION_CHAR_LIMIT.
  - Paragraph-splitting and preservation of trailing Participants context blocks.
- Fixed TypeScript issues surfaced during refactor and validated changes.
- All unit tests pass locally: 53/53.

## Current work / Next steps
- Monitor Slack rendering in staging runs (DRY_RUN preview then live) to confirm link rendering and multi-part posting behavior in real Slack channels.
- Add optional runtime knobs and documentation for SECTION_CHAR_LIMIT (docs/README and deployment docs).
- Consider adding a brief CI smoke test that runs a DRY_RUN with a large synthetic digest to catch regressions in formatting.
- Continue Slack mrkdwn edge-case polishing and add tests for specific mrkdwn edge cases uncovered by staging.

## Known issues / risks
- Excessive numbers of topics could still generate many blocks; `postDigestBlocks` will chunk messages into multiple Slack posts (already implemented) but watch for rate limits or Block Kit size limits in extreme cases.
- LLM output shape changes could reduce the effectiveness of the heuristics; keep prompt/formatter tests in sync.

## Implementation checklist (updated)
- [x] Simplify clusterMessages (remove global sort & channel switch)
- [x] Update/extend topics tests
- [x] Refactor main.ts to per-source grouping + per-group summarize
- [x] Add per-group debug logging
- [x] Add block-splitting logic to buildDigestBlocks (src/utils/format.ts)
- [x] Add targeted tests for block splitting/truncation (test/unit/format_block_split.test.ts)
- [x] Fix TypeScript and test failures from refactor
- [x] Run full unit test suite (local verification)
- [ ] Add SECTION_CHAR_LIMIT doc & CI smoke test
- [ ] Monitor staging DRY_RUN & live run results
- [ ] Update deployment notes / Dockerfile as needed
- [ ] Consider CI gating for formatting regressions
