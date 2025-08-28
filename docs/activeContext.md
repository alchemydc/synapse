# activeContext.md

## Current Work Focus
- MVP pipeline operational: Discord fetch → Gemini summarize → Slack Block Kit post.
- Slack digest now uses Block Kit payloads with mrkdwn normalization.
- Configurable message filters (min length, exclude commands, link-only) applied before summarization.
- Gemini prompt enriched with channel name and timestamp; requests structured sections.
- Zod config parsing fixed to apply defaults when envs are missing.
- GitHub Actions workflow added for daily scheduled runs.
- Replace remaining n8n references and artifacts in documentation.

## Recent Changes
- Pivoted away from n8n due to license restrictions and platform constraints.
- PRD authored for Node architecture (services for Discord, LLM, Slack; utilities for formatting/logging).
- Fixed TypeScript build issues, import/path corrections, env validation.
- Successful end-to-end run: Discord messages fetched, summarized, posted to Slack.

## Next Steps
- Idempotency and state persistence deferred for MVP (daily schedule sufficient).
- Dockerfile and deployment notes pending.
- Refine Slack sectioning and formatting as needed.
- Monitor LLM prompt stability and Slack formatting edge cases.

## Active Decisions & Considerations
- Pure Node architecture for flexibility and license clarity.
- Daily cadence with no persisted state for MVP (scheduled via GitHub Actions).
- Strict error handling, retries with backoff, and request budgeting.
- Structured digest sections.
- Block Kit sections with mrkdwn-safe formatting.
- Filters applied before summarization.
- Zod preprocessors return undefined for missing envs to enable defaults.

## Patterns & Preferences
- Modular services, functional utilities, and typed interfaces.
- Twelve-Factor-style configuration via environment variables.
- Minimal data retention; log PII-safe metadata only.
- ETL pipeline: Discord → Filters → LLM → Formatter → Slack Block Kit.
- Block Kit payloads for Slack; mrkdwn normalization.

## Learnings & Insights
- Direct API integration offers better control than workflow platforms.
- Cost control requires careful prompt design and content windowing.
