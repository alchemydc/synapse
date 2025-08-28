# progress.md

## Current Status
- MVP operational end-to-end.
- Pivot from n8n to TypeScript/Node.js decided due to license restrictions.
- PRD for Node architecture drafted.
- Memory bank updated to reflect new approach.

## What Works
- Discord connectivity (guild/channel listing, pagination, filtering).
- Gemini summarization with truncation.
- Slack posting with mrkdwn and retry.
- DRY_RUN path for safe testing.
- Formatting and configuration strategy.

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
- Prompt stability.
- Slack/Discord rate-limits under higher volume.

## Decisions Log
- 2025-08-28: Pivot to Node due to n8n license constraints and flexibility needs.
- zod config validation adopted.
- DRY_RUN pattern implemented.
- discord_debug tool added.
- Token-budget truncation for Gemini input.
