# progress.md

## Current Status
- MVP operational end-to-end with Slack Block Kit digest, message filters, and prompt enrichment.
- Pivot from n8n to TypeScript/Node.js decided due to license restrictions.
- PRD for Node architecture drafted.
- GitHub Actions workflow added for daily scheduled runs.
- Zod config parsing fixed to apply defaults when envs are missing.
- Memory bank updated to reflect new approach.

## What Works
- Discord connectivity (guild/channel listing, pagination, filtering).
- Configurable message filters via env.
- Gemini summarization with truncation.
- Slack posting with Block Kit payloads and mrkdwn normalization.
- Enriched prompt with channel name and timestamp; structured sections.
- DRY_RUN path for safe testing.
- Formatting and configuration strategy.
- Zod preprocessors for robust default handling.

## What’s Next
- Productionization items:
  - Add configurable message filters (min length, exclude commands, link-only).
  - Include channel/timestamps in prompt; structured output.
  - Improve Slack mrkdwn formatting with header/date range.
  - Persist last processed IDs in .state/last_run.json.
  - Add GitHub Actions daily workflow with secrets.
  - Strengthen config validation and diagnostics.
  - Add unit tests for filters and state.
  - Provide Dockerfile and deployment notes.

## Known Issues
- n8n artifacts are deprecated; keep for reference only (do not deploy).
- Need rate-limit tuning for Discord at scale.
- Env validation diagnostics.
- Prompt stability and Slack formatting polish for edge cases.
- Slack/Discord rate-limits under higher volume.

## Decisions Log
- 2025-08-28: Pivot to Node due to n8n license constraints and flexibility needs.
- Slack Block Kit adopted for digest formatting.
- Configurable filters (min length, commands, link-only) added.
- Gemini prompt enriched with channel/timestamp and structured sections.
- Zod preprocessors fixed to enable defaults.
- GitHub Actions workflow added for daily schedule.
- DRY_RUN pattern implemented.
- discord_debug tool added.
- Token-budget truncation for Gemini input.
