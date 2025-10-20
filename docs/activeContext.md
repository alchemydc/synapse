# Active Context — Recent Changes (summary)



## Recent update (2025-10-20)
- Removed unused config flag `ATTRIBUTION_FALLBACK_ENABLED` from `src/config/index.ts` to avoid confusion; the flag was not referenced elsewhere in code.
- Added debug instrumentation (enabled when `LOG_LEVEL=debug`):
  - Fetched/normalized messages are logged per-channel/topic in a sanitized preview form: `{ id, author, createdAt, content: content.slice(0,500) }`.
  - The full LLM prompt is logged at debug level to allow reproduction of model behavior.
  - A preview of the LLM response is logged (debug-only, preview truncated to 5k chars) while the function still returns the full unmodified LLM text.
- Policy: debug logs intentionally avoid printing secrets (API keys/tokens) and truncate long message content; this is a temporary diagnostics measure while we attempt to reproduce an `INL_*` attribution issue.
- Current strategy: continue running occasional DRY_RUNs with `LOG_LEVEL=debug` to capture prompts and responses; only introduce a sanitizer if/when the `INL_` pattern is observed in LLM outputs or inserted by the pipeline.


