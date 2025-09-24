# progress.md

## Current Status
- Production unblocked; GEMINI_MODEL CI issue resolved via repo variable and build-before-start.
- Daily digest running reliably with validated config and model logging.
- Pipeline runs properly; DRY_RUN output renders links correctly, and live Slack posts now render Discord channel links and Discourse forum/topic links correctly (link-rendering bug fixed).
- MVP operational end-to-end with Slack Block Kit digest, message filters, and prompt enrichment.
- Pivot from n8n to TypeScript/Node.js decided due to license restrictions.
- PRD for Node architecture drafted.
- GitHub Actions workflow added for daily scheduled runs.
- Zod config parsing fixed to apply defaults when envs are missing.
- Memory bank updated to reflect recent implementation changes.

## What Works
- Discord connectivity (guild/channel listing, pagination, filtering).
- Discourse ingestion and normalization integrated into the ETL pipeline.
- Configurable message filters via env.
- Gemini summarization with truncation.
- Slack posting with Block Kit payloads and mrkdwn normalization.
- Enriched prompt with channel name and timestamp; structured sections.
- Prompt wording updated to avoid redundant per-topic "Key Topics" subheading (improves digest readability).
- DRY_RUN path for safe testing.
- Formatting and configuration strategy.
- Zod preprocessors for robust default handling.
- Discourse debug tooling operational: `src/tools/discourse_debug.ts` validates Discourse API access and prints site metadata, sample topics, and rate-limit headers.
- TypeScript build errors in the Discourse ingestion service were fixed.

## What’s Next
- Modify summaries so that participants are noted per topic, not per key point bullet.
- Ensure that links shared in discord messages and in forum posts are included in summaries (for high signal topics)
- Continue Slack formatting polish for edge-case mrkdwn rendering and monitor Gemini 2.x link behavior.
- Add support for pulling messages from multiple Discord servers.
- Add unit tests for prompt injection and formatter edge-cases to prevent regressions.
- Add documentation for deployment & memory bank updates (pending confirmation).
- Explore semantic cluster refinement (topic_refine scaffold added; implementation pending).
- Consider monitoring LLM prompt stability after attribution enabled (token cost, link rendering).
- Scaffold model listing/validation utility and investigate alternate LLM models (e.g., gemini-2.x stabilization).

## Discourse Integration (status)
- Discourse ingestion service implemented in `src/services/discourse/`:
  - Fetches recent topics and initial posts within the digest window.
  - Handles pagination and rate limits.
  - Normalizes Discourse posts to the internal message model with fields: source, forum, category, topic_id, post_id, author, content, created_at.
- Normalized Discourse messages are integrated into the main ETL flow and subject to existing filters and token-budget controls.
- Formatter and LLM prompts include source attribution when available.

## Known Issues
- Remaining Slack mrkdwn edge-case formatting should be monitored and covered by unit tests.
- Need rate-limit tuning for Discord at scale.
- Env validation diagnostics and additional deployment docs pending.
- Monitor Gemini 2.x link behavior for regressions.

## Decisions Log (recent)
- 2025-08-29: Default model pinned to gemini-1.5-flash pending link rendering fix for Gemini 2.0.
- 2025-08-29: GEMINI_MODEL moved to repo variable; added prestart build step and CI build-before-start.
- 2025-08-29: Added sanitized config summary logs and Gemini model init logs.
- 2025-08-29: Deployment docs updated to clarify GEMINI_MODEL is a repo variable.
- 2025-08-29: Plan to validate model names and provide a model listing utility.
- 2025-08-28: Pivot to Node due to n8n license constraints and flexibility needs.
- 2025-09-12: Added `discourse_debug` script and .env scaffolding; adopting staged integration approach (debug → ingestion → normalization → attribution → formatter/prompt).
- 2025-09-23: Adjusted Gemini prompt to avoid redundant per-topic "Key Topics" headings; updated unit test to match new prompt wording.
- 2025-09-23: Fixed TypeScript issues in Discourse ingestion normalization (unused var removed; error typing clarified).
- 2025-09-24: Slack link rendering bug fixed; Discourse ingestion implemented and integrated into ETL pipeline.
