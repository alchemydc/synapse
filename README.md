# Synapse Digest AI Bot

Automates monitoring of community sources (Discord + Discourse), summarizes with an LLM, and posts daily digests to Slack.

## Quickstart

1. Clone the repo and run `npm install`
2. Copy `.env.example` to `.env` and fill in your API keys and config
3. Run in dev mode: `npm run dev`
4. Build: `npm run build`
5. Start: `npm start`
6. Run tests: `npm test`
7. For local Discourse verification: `npm run discourse:debug` (validates Discourse API access)

Notes:
- Use `DRY_RUN=true` to exercise the pipeline without posting to Slack.
- Live Slack link-rendering for Discord channels and Discourse topics has been fixed.

## Scripts

- `dev`: ts-node-dev --respawn --transpile-only src/main.ts
- `build`: tsc -p tsconfig.json
- `start`: node dist/main.js
- `test`: vitest run
- `test:watch`: vitest
- `lint`: TODO: add eslint
- `discourse:debug`: script to validate Discourse API access (see `src/tools/discourse_debug.ts`)

## Project Structure

- src/main.ts: CLI entry
- src/config: config loader (zod-based validation)
- src/services: discord, discourse, llm, slack service adapters
- src/utils: logger, formatter, time helpers, filters
- test/unit: vitest unit tests

## Dependencies

See package.json for runtime and dev dependencies.

## Message Filtering

The bot supports configurable message filters via environment variables:

- `MIN_MESSAGE_LENGTH` (default: 20): Minimum message length to include.
- `EXCLUDE_COMMANDS` (default: true): Exclude messages starting with `!` or `/` (commands).
- `EXCLUDE_LINK_ONLY` (default: true): Exclude messages that are only a link.

Set these in your `.env` file to control which messages are summarized. See `.env.example` for details.

## Discourse ingestion

The project now ingests recent Discourse topics/posts and normalizes them into the internal message model. Discourse messages flow through the same ETL: Filters → LLM → Formatter → Slack.

Relevant environment variables (see `.env.example`):
- `DISCOURSE_BASE_URL`
- `DISCOURSE_API_KEY`
- `DISCOURSE_API_USERNAME`
- `DISCOURSE_CATEGORY_IDS` (optional)
- `DISCOURSE_LOOKBACK_HOURS` (optional)

## Attribution (per-topic participants)

Optional per-topic participant attribution (disabled by default).

Environment variables:
- `ATTRIBUTION_ENABLED` (boolean, default: false)
- `TOPIC_GAP_MINUTES` (integer, default: 20)
- `MAX_TOPIC_PARTICIPANTS` (integer, default: 6)
- `ATTRIBUTION_FALLBACK_ENABLED` (boolean, default: true)

Notes and limitations:
- Attribution uses a simple time-gap clustering heuristic (no semantic clustering yet).
- Enabling attribution may increase prompt length and LLM token usage; tune `MAX_SUMMARY_TOKENS` accordingly.

## Operational Notes

- Daily scheduling is provided via the GitHub Actions workflow (`.github/workflows/daily-digest.yml`) by default.
- The app favors minimal data retention and secure handling of API keys.
- Monitor Slack/Discord rate limits and tune retry/backoff as needed.
- Add unit tests for Slack/formatter edge cases to prevent regressions; this is recommended after the recent fixes.
