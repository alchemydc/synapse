# Memory Bank Summary (2025-08-28)

## Current State (2025-09-23)
- Production unblocked; GEMINI_MODEL CI issue resolved via repo variable and build-before-start.
- Daily digest running reliably; config and model validation in place.
- Default model is gemini-1.5-flash; Gemini 2.0 link rendering is a pending fix.
- Pipeline runs end-to-end; DRY_RUN output renders Discord and Discourse links correctly, but live Slack posts are mis-formatting Discord channel links and Discourse forum/topic links. Active debugging of the link-generation issue has been postponed per user request.
- Recent prompt wording change reduces redundant per-topic "Key Topics" headings in digest output (improves Slack readability).
- TypeScript build issues in Discourse ingestion normalization were fixed (unused var removed; error typing clarified).
- Priorities: continue Slack mrkdwn polish, implement longer Monday digest window, support multiple Discord servers, add Discourse forum ingestion, explore alternate LLM models, scaffold model listing/validation utility, fix Gemini 2.0 link formatting.

## Project Brief
Automated TypeScript/Node.js service to crawl Discord, summarize with LLM (Google Gemini), and post daily digests to Slack. Pivoted from n8n due to license/platform constraints.

## Product Context
Solves manual monitoring inefficiency, improves communication for technical/non-technical staff, and delivers actionable daily updates.

## Active Context
- MVP pipeline now: Discord fetch → Gemini summarize → Slack Block Kit post.
- Slack digest uses Block Kit payloads with mrkdwn normalization.
- Configurable message filters (min length, exclude commands, link-only) applied before summarization.
- Gemini prompt enriched with channel name and timestamp; requests structured sections. Prompt wording adjusted to avoid redundant per-topic "Key Topics" headings.
- Zod config parsing fixed to apply defaults when envs are missing.
- GitHub Actions workflow added for daily scheduled runs.
- Idempotency deferred for MVP.

## System Patterns
- ETL pipeline: Discord → Filters → LLM → Formatter → Slack Block Kit.
- Block Kit payloads for Slack; mrkdwn normalization.
- Zod preprocessors for robust default handling.
- Modular adapters, circuit-breaker/backoff, pure functions for formatting/filtering, orchestrated by main.ts.

## Tech Context
- TypeScript/Node.js (Node 22+), discord.js, @google/generative-ai, @slack/web-api, dotenv, zod, vitest.
- New: utils/filters.ts for message filtering.
- Environment variables: MIN_MESSAGE_LENGTH, EXCLUDE_COMMANDS, EXCLUDE_LINK_ONLY.
- GitHub Actions workflow: .github/workflows/daily-digest.yml for daily schedule.

## Progress
- MVP operational end-to-end with Slack Block Kit digest, message filters, and prompt enrichment.
- GitHub Actions workflow added for daily scheduled runs.
- Zod config parsing fixed to apply defaults when envs are missing.
- Prompt wording updated to avoid redundant per-topic "Key Topics" headings; unit test updated to match new prompt wording.
- TypeScript build errors in the Discourse ingestion normalization were fixed.
- Next: Dockerfile/deployment notes, monitor LLM prompt stability, further Slack formatting polish.
- Note: Slack output currently mis-formats Discord channel and Discourse links in live posts (DRY_RUN looks correct). Debugging and fix implementation deferred until user approval.
