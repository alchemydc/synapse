# progress.md

## Current Status
- Production unblocked; GEMINI_MODEL CI issue resolved via repo variable and build-before-start.
- Daily digest running reliably with validated config and model logging.
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
- Make Slack output prettier and clearer.
- Implement longer digest window on Mondays to capture weekend activity.
- Add support for pulling messages from multiple Discord servers.
- Add support for pulling messages from Discourse forums.
- Explore alternate LLM models for summarization; current "gemini-2.5-flash" returns no output, suggesting call failure.
- Scaffold utility to list available Gemini models and validate model names at runtime.

## Known Issues
- Gemini 2.0 link formatting incorrect; links not rendered properly in summary output.
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
- Slack Block Kit adopted for digest formatting.
- Configurable filters (min length, commands, link-only) added.
- Gemini prompt enriched with channel/timestamp and structured sections.
- Zod preprocessors fixed to enable defaults.
- GitHub Actions workflow added for daily schedule.
- DRY_RUN pattern implemented.
- discord_debug tool added.
- Token-budget truncation for Gemini input.
