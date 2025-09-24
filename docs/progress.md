# progress.md

## Current Status
- Production unblocked; GEMINI_MODEL CI issue resolved via repo variable and build-before-start.
- Daily digest running reliably with validated config and model logging.
- Pipeline runs properly; DRY_RUN output renders links correctly, but live Slack posts are mis-formatting Discord channel links and Discourse forum/topic links.
- MVP operational end-to-end with Slack Block Kit digest, message filters, and prompt enrichment.
- Pivot from n8n to TypeScript/Node.js decided due to license restrictions.
- PRD for Node architecture drafted.
- GitHub Actions workflow added for daily scheduled runs.
- Zod config parsing fixed to apply defaults when envs are missing.
- Memory bank updated to reflect new approach and recent implementation changes.

## What Works
- Discord connectivity (guild/channel listing, pagination, filtering).
- Configurable message filters via env.
- Gemini summarization with truncation.
- Slack posting with Block Kit payloads and mrkdwn normalization.
- Enriched prompt with channel name and timestamp; structured sections.
- Prompt wording updated to avoid redundant per-topic "Key Topics" subheading (improves digest readability).
- DRY_RUN path for safe testing.
- Formatting and configuration strategy.
- Zod preprocessors for robust default handling.
- Discourse debug tooling operational: `src/tools/discourse_debug.ts` validates Discourse API access and prints site metadata, sample topics, and rate-limit headers.
- TypeScript build errors in the Discourse ingestion service were fixed (unused variable removed, error typing added).

## What’s Next
- Continue Slack formatting polish for edge-case mrkdwn rendering and Gemini 2.0 link behavior.
- Implement longer digest window on Mondays to capture weekend activity.
- Add support for pulling messages from multiple Discord servers.
- Flesh out Discourse integration (broken into concrete sub-tasks below).
- Explore alternate LLM models for summarization; current "gemini-2.5-flash" returns no output (investigate and stabilize).
- Scaffold utility to list available Gemini models and validate model names at runtime.
- Add unit tests for prompt injection and formatter edge-cases (pending).
- Add documentation for deployment & memory bank updates (pending confirmation).
- Explore semantic cluster refinement (topic_refine scaffold added; implementation pending).
- Consider monitoring LLM prompt stability after attribution enabled (token cost, link rendering).

## Discourse Integration (next-step breakdown)
- Implement a Discourse ingestion service (src/services/discourse/) to:
  - fetch recent topics and initial posts within the digest window,
  - handle pagination and rate limits,
  - normalize Discourse posts to the internal message model (with source metadata).
- Normalize Discourse posts to the internal message structure with fields: source, forum, category, topic_id, post_id, author, content, created_at.
- Integrate normalized Discourse messages into the existing ETL pipeline with existing filters and token-budget controls.
- Modify Slack formatter and LLM prompt to include source attribution (e.g., prefix or header: [Discord: server-name] / [Discourse: forum-name] per topic).
- Add config flags (future): ENABLE_SOURCE_TAGS, DISCOURSE_CATEGORY_IDS, DISCOURSE_LOOKBACK_HOURS.
- Add unit tests for multi-source formatting and prompt context.

## Known Issues
- Gemini 2.0 link formatting incorrect; links not rendered properly in summary output. Additionally, Slack output is not correctly formatting Discord channel links or Discourse forum/topic links; links may resolve to local Slack channels or be missing in published digests.
- n8n artifacts are deprecated; keep for reference only (do not deploy).
- Need rate-limit tuning for Discord at scale.
- Env validation diagnostics.
- Prompt stability and Slack formatting polish for edge cases.
- Slack/Discord rate-limits under higher volume.

## Decisions Log
- 2025-08-29: Default model pinned to gemini-1.5-flash pending link rendering fix for Gemini 2.0.
- 2025-08-29: GEMINI_MODEL moved to repo variable; added prestart build step and CI build-before-start.
- 2025-08-29: Added sanitized config summary logs and Gemini model init logs.
- 2025-08-29: Deployment docs updated to clarify GEMINI_MODEL is a repo variable.
- 2025-08-29: Plan to validate model names and provide a model listing utility.
- 2025-08-28: Pivot to Node due to n8n license constraints and flexibility needs.
- 2025-09-12: Added `discourse_debug` script and .env scaffolding; adopting staged integration approach (debug → ingestion → normalization → attribution → formatter/prompt).
- 2025-09-23: Adjusted Gemini prompt to avoid redundant per-topic "Key Topics" headings; updated unit test to match new prompt wording.
- 2025-09-23: Fixed TypeScript issues in Discourse ingestion normalization (unused var removed; error typing clarified).
- Slack Block Kit adopted for digest formatting.
- Configurable filters (min length, commands, link-only) added.
- Gemini prompt enriched with channel/timestamp and structured sections.
- Zod preprocessors fixed to enable defaults.
- GitHub Actions workflow added for daily schedule.
- DRY_RUN pattern implemented.
- discord_debug tool added.
- Token-budget truncation for Gemini input.
