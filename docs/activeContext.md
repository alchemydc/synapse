# Active Context — Recent Changes (summary)

## Recent update (2025-10-20)
- Removed unused config flag `ATTRIBUTION_FALLBACK_ENABLED` from `src/config/index.ts` to avoid confusion; the flag was not referenced elsewhere in code.
- Added debug instrumentation (enabled when `LOG_LEVEL=debug`):
  - Fetched/normalized messages are logged per-channel/topic in a sanitized preview form: `{ id, author, createdAt, content: content.slice(0,500) }`.
  - The full LLM prompt is logged at debug level to allow reproduction of model behavior.
  - A preview of the LLM response is logged (debug-only, preview truncated to 5k chars) while the function still returns the full unmodified LLM text.
- Policy: debug logs intentionally avoid printing secrets (API keys/tokens) and truncate long message content; this is a temporary diagnostics measure while we attempt to reproduce an `INL_*` attribution issue.
- Current strategy: continue running occasional DRY_RUNs with `LOG_LEVEL=debug` to capture prompts and responses; only introduce a sanitizer if/when the `INL_` pattern is observed in LLM outputs or inserted by the pipeline.

## Recent update (2025-10-21)
- Replaced the placeholder-based Markdown→Slack conversion in `src/utils/format.ts` with a conservative, non-destructive converter to avoid `__INL__`/`__FENCE__` placeholder collisions that surfaced as visible `INL_*` tokens in digests.
  - The new converter:
    - Converts Markdown links to Slack link format (`<url|text>`).
    - Converts headings to bold (`*Heading*`) because Slack doesn't support header levels.
    - Converts `**bold**` to Slack `*bold*` and normalizes lists to `-` bullets.
    - Avoids unsafe transforms that can collide with literal underscores.
  - Updated unit tests (`test/unit/format.test.ts`) to reflect the new behavior; full test suite passes locally.
  - Next: run DRY_RUNs in staging (DRY_RUN=true LOG_LEVEL=debug) to verify Slack rendering and confirm the INL_* issue is resolved.
