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
- Add per-topic participant attribution (config-gated): implemented
  - Config: ATTRIBUTION_ENABLED, TOPIC_GAP_MINUTES, MAX_TOPIC_PARTICIPANTS, ATTRIBUTION_FALLBACK_ENABLED
  - Behavior: time-gap clustering by channel, participants listed per-topic in digest, conservative fallback injects missing Participants lines when LLM omits them.
  - Files added/changed: src/utils/topics.ts, src/utils/participants_fallback.ts, src/services/llm/gemini.ts (summarizeAttributed), src/utils/format.ts (participants rendering), src/main.ts (integration), test/unit/topics.test.ts, src/utils/topic_refine.ts (semantic scaffold), README.md (docs).
- Add unit tests for prompt injection and formatter edge-cases (pending).
- Add documentation for deployment & memory bank updates (pending confirmation).
- Explore semantic cluster refinement (topic_refine scaffold added; implementation pending).
- Consider monitoring LLM prompt stability after attribution enabled (token cost, link rendering).

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
