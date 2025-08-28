# Memory Bank Summary (2025-08-28)

## Project Brief
Automated TypeScript/Node.js service to crawl Discord, summarize with LLM (Google Gemini), and post daily digests to Slack. Pivoted from n8n due to license/platform constraints.

## Product Context
Solves manual monitoring inefficiency, improves communication for technical/non-technical staff, and delivers actionable daily updates.

## Active Context
Current focus: MVP implementation (Discord → LLM → Slack), Node scaffolding, service modularity, error handling, and unit tests. Recent pivot away from n8n. Next: implement services, scheduling, and tests.

## System Patterns
ETL pipeline (Extract Discord, Transform via LLM, Load to Slack), modular adapters, circuit-breaker/backoff, pure functions for formatting/filtering, orchestrated by main.ts.

## Tech Context
TypeScript/Node.js, discord.js, @google/generative-ai, @slack/web-api, dotenv, pino/winston, jest/vitest, Docker optional. Budget-conscious, secure API handling, scheduled execution, modular services, centralized error handling.

## Progress
Pivot to Node complete, PRD drafted, memory bank updated. Next: scaffold Node project, implement Discord/LLM/Slack path, add scheduling/logging, write unit tests. n8n artifacts deprecated.
