# AGENTS.md

This file provides guidance to coding agents (Claude Code, and others via the AGENTS.md convention) when working with code in this repository.

## What this is

Synapse is a **batch, run-to-completion** community digest bot: it fetches a day's messages from Discord + Discourse, summarizes each conversation group with an LLM (Google Gemini via the Vercel AI SDK), and posts a formatted digest to Slack. It is not a long-running service — `main.ts` runs the pipeline once and exits (`process.exit(1)` on failure).

## Commands

```bash
npm run build          # tsc -> dist/  (also runs automatically via prestart before npm start)
npm start              # run the compiled build (production entrypoint)
npm run dev            # run from source with ts-node-dev + hot reload
npm test               # vitest run (all unit + integration tests)
npm run test:watch     # vitest watch mode
npx vitest run test/unit/config.test.ts        # run a single test file
npx vitest run -t "empty-string"               # run tests matching a name

# Live-connectivity debug tools (hit real APIs; need creds in .env):
npm run discord:debug      # verify Discord token + channel access
npm run discourse:debug    # verify Discourse API access
npm run models:list        # list available Gemini models
```

- Node is pinned to **24** (`.nvmrc` + `engines: ">=24 <25"`); CI reads `.nvmrc`. `@types/node` is deliberately held at `^24` to match — Dependabot is configured to ignore its major bumps.
- `npm run lint` is a **stub** (`echo TODO && exit 0`) — there is no linter yet.
- Tests are Vitest; `test/unit/**` are pure, `test/integration/**` mock the external clients. No live network in the suite.

## Architecture

The core is a **linear pipeline with pluggable stages**, defined by three interfaces in `src/core/interfaces.ts`:

```
Source[] ──fetch──> group by channel/topic ──filter──> Processor ──> sort ──> format ──> Destination[]
```

- **`DigestPipeline.run()`** (`src/DigestPipeline.ts`) orchestrates everything and holds the ordering/formatting logic. `main.ts` is just wiring: it constructs the concrete `DiscordSource`, `DiscourseSource`, `SlackDestination`, and `AiSdkProcessor` and registers them. To add a source/destination, implement the interface and register it in `main.ts` — nothing else in the pipeline needs to change.
- Stages self-gate via `isEnabled()` (driven by whether their credentials/flags are present), so a missing integration is skipped, not fatal. Per-group processing errors are caught and logged; one bad group does not abort the run.
- Messages from all sources are normalized to `NormalizedMessage` (`src/core/types.ts`) and grouped by `channelId`/`topicId` before summarization.

### The two-schema LLM contract (important)

`src/core/schemas.ts` defines **two** schemas, and the distinction matters:
- **`LlmSummarySchema`** — the shape *requested from the model* (`generateObject`). The model returns per-conversation `topics` with a `firstMessageIndex`, **never URLs**.
- **`DigestItem`** — the *downstream contract* consumed by the pipeline/formatters.

`AiSdkProcessor` bridges them: it resolves each topic's link from `firstMessageIndex` into the (post-truncation) message array — the model is never trusted to produce URLs. All model-controlled text rendered into Slack links/bold is run through `sanitizeLinkText()` to neutralize mrkdwn/link-structure injection.

Other `AiSdkProcessor` behaviors worth knowing before editing it:
- **Token budget:** Gemini 3.x reasoning tokens count against `maxOutputTokens` (`MAX_SUMMARY_TOKENS`), so the budget must leave headroom above the visible text or generation fails mid-JSON.
- **Retry:** `p-retry` retries transient failures (429/5xx/network/parse) but `AbortError`s out of permanent `APICallError`s (auth/bad-request) so it doesn't burn retries.
- **Truncation** (`truncateMessages`) keeps the **newest** messages when a group exceeds `MAX_INPUT_CHARS_PER_GROUP`, dropping the oldest.
- The prompt's **importance rubric** (high/medium/low) is defined inline in `pushSharedRules()`.

### Importance ranking

`sortDigestEntries()` (in `DigestPipeline.ts`) orders groups deterministically: importance (high→medium→low, plain strings last), then message count, then key. This ordering is applied **once** and both the Slack blocks (`buildDigestBlocks`) and the plain-text fallback derive from it, so they must stay in agreement. Low-importance items collapse into a single "Also active" links line rather than full sections, in both renderers.

### Slack rendering

`buildDigestBlocks` (`src/utils/format.ts`) converts markdown to Slack mrkdwn and splits into multiple messages to respect Slack's 50-block cap (budgets at 45). `SlackDestination` posts with `unfurl_links/unfurl_media: false` (no link previews) and retries on `ratelimited`. `DRY_RUN=true` logs the digest instead of posting.

## Configuration

All config flows through `loadConfig()` in `src/config/index.ts` (Zod schema over `process.env`; `.env` locally, GitHub Secrets/Variables in prod). See `.env.example` and `docs/production-runbook.md` for the full variable list.

**Non-obvious config gotcha:** in production every value is injected via `${{ vars.X }}`/`${{ secrets.X }}`. GitHub Actions renders an *unset* variable as an **empty string**, not undefined — and Zod's `.default()` only fires on `undefined`. So defaults are placed **inside** the `preprocess` (`z.preprocess(toNum, z.number().default(N))`) and `toNum`/`toBool`/`toStr` normalize `""` → `undefined` first. If you add a defaulted config field, follow that pattern or an unset repo variable will crash the run. Repo Variables always win over code defaults in prod.

## Production

Runs as a **GitHub Actions** workflow (`.github/workflows/daily-digest.yml`), **not** a hosted service. Key facts for debugging "why didn't my change take effect":
- The digest job gates on `if: github.ref == 'refs/heads/main'` — **only `main` runs in production.** A change merged elsewhere won't appear in the digest until it reaches `main`.
- The trigger is `workflow_dispatch` only (no in-workflow cron); a **GCP Cloud Scheduler** job calls the dispatch API daily (`scripts/setup_cloud_scheduler_dispatch.sh`). Feature branches PR directly into `main`.
- Operational procedures (incident playbook, required secrets/variables, recovery) live in `docs/production-runbook.md`.
