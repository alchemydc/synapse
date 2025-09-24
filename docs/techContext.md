# techContext.md

## Technologies Used
- TypeScript, Node.js (Node 22+)
- discord.js v14, @google/generative-ai, @slack/web-api, dotenv, zod, date-fns/luxon, ts-node-dev, vitest
- New: utils/filters.ts for message filtering.
- Optional: pino/winston (logging), Docker for containerization; GCP Cloud Run/GKE for hosting

## Development Setup
- Local: Node 22+, `npm install`, `.env` with API keys.
- Scripts: dev, build, start, test, test:watch, lint, discord:debug
- Strict tsconfig; .env keys list.
- Optional Dockerfile for parity with deployment.
- GitHub Actions workflow: .github/workflows/daily-digest.yml for daily schedule.

## Source Attribution & Labels
- Topic headings are prefixed with bracketed source labels for clarity in mixed-source digests:
  - Discord: `[Discord #channel-name]`
  - Forum/Discourse: `[Forum category:X]` (category id when category name unavailable) or `[Forum hostname]` fallback
- This prefix is injected into `channelId` before clustering so the LLM sees it verbatim.
- Gemini prompt builders include an explicit instruction to preserve these bracketed source labels in generated topic headings.

## Technical Constraints
- Budget target: <$10/month LLM spend for MVP.
- Respect Discord/Slack API terms and rate limits.
- Secure handling of credentials; minimal data retention.
- Zod preprocessors return undefined for missing envs to enable defaults.

## Dependencies
- discord.js, @google/generative-ai, @slack/web-api, dotenv, zod, date-fns/luxon, ts-node-dev, vitest, p-retry
- Environment variables: DISCORD_TOKEN, DISCORD_CHANNELS, GEMINI_API_KEY, GEMINI_MODEL, MAX_SUMMARY_TOKENS, SLACK_BOT_TOKEN, SLACK_CHANNEL_ID, DIGEST_WINDOW_HOURS, DRY_RUN, LOG_LEVEL, MIN_MESSAGE_LENGTH, EXCLUDE_COMMANDS, EXCLUDE_LINK_ONLY
