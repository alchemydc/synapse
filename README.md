# Synapse Digest AI Bot

Automates monitoring of Discord channels, summarizes with LLM, and posts daily digests to Slack.

## Quickstart

1. Clone the repo and run `npm install`
2. Copy `.env.example` to `.env` and fill in your API keys and config
3. Run in dev mode: `npm run dev`
4. Build: `npm run build`
5. Start: `npm start`
6. Run tests: `npm test`

## Scripts

- `dev`: ts-node-dev --respawn --transpile-only src/main.ts
- `build`: tsc -p tsconfig.json
- `start`: node dist/main.js
- `test`: vitest run
- `test:watch`: vitest
- `lint`: TODO: add eslint

## Project Structure

- src/main.ts: CLI entry
- src/config: config loader
- src/services: discord, llm, slack service stubs
- src/utils: logger, formatter, time helpers
- test/unit: vitest unit tests

## Dependencies

See package.json for runtime and dev dependencies.

## Message Filtering

The bot supports configurable message filters via environment variables:

- `MIN_MESSAGE_LENGTH` (default: 20): Minimum message length to include.
- `EXCLUDE_COMMANDS` (default: true): Exclude messages starting with `!` or `/` (commands).
- `EXCLUDE_LINK_ONLY` (default: true): Exclude messages that are only a link.

Set these in your `.env` file to control which Discord messages are summarized. See `.env.example` for details.

## Attribution (per-topic participants)

The bot can optionally include which users participated in each topic that appears in the digest. This is disabled by default.

Environment variables (new):
- `ATTRIBUTION_ENABLED` (boolean, default: false) — when true, messages are clustered into topic windows and the digest will include a "Participants:" line for each topic.
- `TOPIC_GAP_MINUTES` (integer, default: 20) — the inactivity gap (in minutes) that separates messages into distinct topic clusters within the same channel.
- `MAX_TOPIC_PARTICIPANTS` (integer, default: 6) — maximum number of participant names shown per topic; additional participants are shown as `+N`.
- `ATTRIBUTION_FALLBACK_ENABLED` (boolean, default: true) — when true, the service will attempt a lightweight post-processing pass to inject missing Participants lines if the LLM omits them.

Notes and limitations:
- Attribution uses a simple time-gap clustering heuristic (no semantic clustering yet). It lists usernames exactly as they appear in the source messages and does not invent or infer participants.
- Enabling attribution may increase the prompt length and LLM token usage; keep `MAX_SUMMARY_TOKENS` and `MAX_TOPIC_PARTICIPANTS` tuned to control cost.
- To enable attribution, set `ATTRIBUTION_ENABLED=true` in your `.env` and run the bot as usual. Use `DRY_RUN=true` for testing without posting to Slack.
