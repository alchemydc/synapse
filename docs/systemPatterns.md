# systemPatterns.md

## System Architecture
- Daily scheduled run (cron/GitHub Actions/Cloud Scheduler) triggers a Node CLI/service.
- Services:
  - Discord: discovery, filtering, message retrieval with rate-limit handling.
  - Filters: configurable (min length, exclude commands, link-only) applied before summarization.
  - LLM: summarization via Gemini API with enriched prompt (channel name, timestamp, structured sections).
  - Slack: Block Kit payload construction, mrkdwn normalization, posting.
- Utilities: formatter, logger, time window and pagination helpers, filters util.
- Configuration: .env for keys; config module for defaults/overrides.
- zod-based config validation, DRY_RUN switch, token-budget truncation, Discord connectivity debug tool.

## Key Technical Decisions
- TypeScript/Node.js over workflow engine (n8n) due to license/platform constraints.
- Hosting on GCP (Cloud Run or GKE) or similar; local dev via Node and optional Docker.
- Explicit retry/backoff and partial-failure tolerance.
- Idempotency via persisted last processed IDs.

## Design Patterns
- ETL pipeline: Extract (Discord) → Filter (utils/filters.ts) → Transform (aggregate/summarize) → Load (Slack Block Kit).
- Adapter pattern for services (LLM provider, future sources).
- Circuit-breaker/backoff for external APIs.
- Pure functions for formatting and filtering to enable unit testing.
- Typed service adapters.
- Block Kit payload construction for Slack; mrkdwn normalization.
- Zod preprocessors return undefined for missing envs to enable defaults.
- Simple retry with backoff.

## Component Relationships
- main.ts orchestrates service calls.
- Discord → Aggregator → LLM → Formatter → Slack.

## Critical Paths
- Discord pagination and rate-limit handling → bounded aggregation → LLM call → Slack post.
- State read/write for idempotency.
- Slack rate-limit retry behavior.
- Failure handling and idempotent scheduling.
