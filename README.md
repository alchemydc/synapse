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
