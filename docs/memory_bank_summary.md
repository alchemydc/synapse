# Memory Bank Summary (2025-08-28)

## Project Brief
Automated TypeScript/Node.js service to crawl Discord, summarize with LLM (Google Gemini), and post daily digests to Slack. Pivoted from n8n due to license/platform constraints.

## Product Context
Solves manual monitoring inefficiency, improves communication for technical/non-technical staff, and delivers actionable daily updates.

## Active Context
- MVP pipeline now: Discord fetch → Gemini summarize → Slack Block Kit post.
- Slack digest uses Block Kit payloads with mrkdwn normalization.
- Configurable message filters (min length, exclude commands, link-only) applied before summarization.
- Gemini prompt enriched with channel name and timestamp; requests structured sections.
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
- Next: Dockerfile/deployment notes, monitor LLM prompt stability, refine Slack formatting.
