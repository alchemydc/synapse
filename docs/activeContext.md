# activeContext.md

## Current Work Focus
- MVP pipeline implemented and operational: Discord fetch → Gemini summarize → Slack post.
- Replace remaining n8n references and artifacts in documentation.

## Recent Changes
- Pivoted away from n8n due to license restrictions and platform constraints.
- PRD authored for Node architecture (services for Discord, LLM, Slack; utilities for formatting/logging).
- Fixed TypeScript build issues, import/path corrections, env validation.
- Successful end-to-end run: Discord messages fetched, summarized, posted to Slack.

## Next Steps
- Productionization backlog:
  - Add configurable message filters (min length, exclude commands, link-only).
  - Include channel names and timestamps in prompt; structured digest sections (Highlights, Decisions, Action Items, Links).
  - Improve Slack mrkdwn formatting with header and date range.
  - Persist last processed message IDs per channel in `.state/last_run.json` for idempotency.
  - Add GitHub Actions daily workflow and use secrets.
  - Strengthen config validation/diagnostics (fail fast with helpful messages).
  - Add unit tests for filters and state.
  - Provide Dockerfile and deployment notes.

## Active Decisions & Considerations
- Pure Node architecture for flexibility and license clarity.
- Daily cadence with configurable time window (default 24h).
- Strict error handling, retries with backoff, and request budgeting.
- Structured digest sections.
- Idempotent processing via state.

## Patterns & Preferences
- Modular services, functional utilities, and typed interfaces.
- Twelve-Factor-style configuration via environment variables.
- Minimal data retention; log PII-safe metadata only.

## Learnings & Insights
- Direct API integration offers better control than workflow platforms.
- Cost control requires careful prompt design and content windowing.
