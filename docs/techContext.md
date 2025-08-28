# techContext.md

## Technologies Used
- TypeScript, Node.js (Node 20+)
- discord.js v14, @google/generative-ai, @slack/web-api, dotenv, zod, date-fns/luxon, ts-node-dev, vitest
- Optional: pino/winston (logging), Docker for containerization; GCP Cloud Run/GKE for hosting

## Development Setup
- Local: Node 20+, `npm install`, `.env` with API keys.
- Scripts: dev, build, start, test, test:watch, lint, discord:debug
- Strict tsconfig; .env keys list.
- Optional Dockerfile for parity with deployment.

## Technical Constraints
- Budget target: <$10/month LLM spend for MVP.
- Respect Discord/Slack API terms and rate limits.
- Secure handling of credentials; minimal data retention.

## Dependencies
- discord.js, @google/generative-ai, @slack/web-api, dotenv, zod, date-fns/luxon, ts-node-dev, vitest, p-retry
- Environment variables: DISCORD_TOKEN, DISCORD_CHANNELS, GEMINI_API_KEY, GEMINI_MODEL, MAX_SUMMARY_TOKENS, SLACK_BOT_TOKEN, SLACK_CHANNEL_ID, DIGEST_WINDOW_HOURS, DRY_RUN, LOG_LEVEL

## Tool Usage Patterns
- Scheduled execution via cron/Cloud Scheduler/GitHub Actions.
- Modular services with typed interfaces; unit tests on utilities.
- Centralized error handling and structured logging.
- discord_debug connectivity tool; simple rate-limit retry; DRY_RUN path skips external calls.
