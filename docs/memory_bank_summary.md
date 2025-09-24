# Memory Bank Summary (2025-08-28)

## Current State (2025-09-23 -> updated 2025-09-24)
- Production unblocked; GEMINI_MODEL CI issue resolved via repo variable and build-before-start.
- Daily digest running reliably; config and model validation in place.
- Default model is gemini-1.5-flash; Gemini 2.0 link rendering was a pending fix (see Known Issues).
- Pipeline runs end-to-end; DRY_RUN output renders Discord and Discourse links correctly.
- Live Slack posts previously mis-formatted Discord channel links and Discourse forum/topic links — this has been fixed and live digests now render links correctly.
- Discourse ingestion and normalization have been implemented and integrated into the ETL pipeline; Discourse messages are normalized to the internal message model and flow through Filters → LLM → Formatter → Slack.
- Recent prompt wording change reduces redundant per-topic "Key Topics" headings in digest output (improves Slack readability).
- TypeScript build issues in Discourse ingestion normalization were fixed (unused var removed; error typing clarified).
- Priorities: continue Slack mrkdwn polish for edge cases, implement longer Monday digest window, support multiple Discord servers, explore alternate LLM models, scaffold model listing/validation utility, monitor Gemini 2.x link behavior.

## Project Brief
Automated TypeScript/Node.js service to crawl Discord (and now Discourse), summarize with LLM (Google Gemini), and post daily digests to Slack. Pivoted from n8n due to license/platform constraints.

## Product Context
Solves manual monitoring inefficiency, improves communication for technical/non-technical staff, and delivers actionable daily updates.

## Active Context
- MVP pipeline now: Discord + Discourse fetch → Filters → Gemini summarize → Slack Block Kit post.
- Slack digest uses Block Kit payloads with mrkdwn normalization; live link rendering for Discord channels and Discourse topics fixed.
- Configurable message filters (min length, exclude commands, link-only) applied before summarization.
- Gemini prompt enriched with channel name and timestamp; requests structured sections. Prompt wording adjusted to avoid redundant per-topic "Key Topics" headings.
- Zod config parsing fixed to apply defaults when envs are missing.
- GitHub Actions workflow added for daily scheduled runs.
- Idempotency deferred for MVP.

## System Patterns
- ETL pipeline: Discord + Discourse → Filters → LLM → Formatter → Slack Block Kit.
- Block Kit payloads for Slack; mrkdwn normalization.
- Zod preprocessors for robust default handling.
- Modular adapters, circuit-breaker/backoff, pure functions for formatting/filtering, orchestrated by main.ts.

## Tech Context
- TypeScript/Node.js (Node 22+), discord.js, @google/generative-ai, @slack/web-api, dotenv, zod, vitest.
- New: utils/filters.ts for message filtering.
- Environment variables: MIN_MESSAGE_LENGTH, EXCLUDE_COMMANDS, EXCLUDE_LINK_ONLY, DISCOURSE_* variables for ingestion.
- GitHub Actions workflow: .github/workflows/daily-digest.yml for daily schedule.

## Progress
- MVP operational end-to-end with Slack Block Kit digest, message filters, and prompt enrichment.
- Live Slack link rendering for Discord channels and Discourse topics fixed.
- Discourse ingestion implemented and normalized into the internal message model; integrated into the main ETL flow.
- GitHub Actions workflow added for daily scheduled runs.
- Zod config parsing fixed to apply defaults when envs are missing.
- Prompt wording updated to avoid redundant per-topic "Key Topics" headings; unit test updated to match new prompt wording.
- TypeScript build errors in the Discourse ingestion normalization were fixed.
- Next: Dockerfile/deployment notes, monitor LLM prompt stability, further Slack mrkdwn edge-case polish, support multiple Discord servers, longer Monday digest window, model-listing/validation utility.

## Notes
- The Slack and Discourse link fixes and Discourse ingestion delivery were performed in the last session and are now reflected in the memory bank. Remaining formatting edge cases should be tracked as smaller follow-ups and unit tests should be added to prevent regressions.
