# activeContext.md

## Current Work Focus

## Blockers
- None. Production unblocked; GEMINI_MODEL CI issue resolved via repo variable and build-before-start. All scheduled runs now succeed.

## Recent Changes
- Added prestart hook to package.json to ensure dist is rebuilt before start.
- CI workflow now runs npm run build before npm start.
- Added sanitized config summary logs and Gemini model init logs.
- Updated deployment docs to clarify GEMINI_MODEL is a repo variable.
- Improved error handling and validation for model names.

## Next Steps
- Make Slack output prettier and clearer.
- Implement longer digest window on Mondays to capture weekend activity.
- Add support for pulling messages from multiple Discord servers.
- Add support for pulling messages from Discourse forums.
- Explore alternate LLM models for summarization; current "gemini-2.5-flash" returns no output, suggesting call failure.
- Scaffold utility to list available Gemini models and validate model names at runtime.
- Fix link rendering for Gemini 2.0 output; keep default model gemini-1.5-flash until resolved.

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
