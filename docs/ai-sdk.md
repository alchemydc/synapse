# ai-sdk Integration Plan

## 1. Objectives
- Provider-agnostic LLM layer (start: Google via ai-sdk).
- Decouple summarization logic from current Gemini SDK.
- Enable future providers (OpenAI, Anthropic) with minimal change.
- Preserve rollback path (legacy Gemini implementation).
- Prepare for optional structured + streaming output.

## 2. Current State Summary
- `src/services/llm/gemini.ts` contains:
  - Prompt assembly (plain + attributed).
  - Truncation utilities.
  - Direct Gemini SDK invocation.
- `src/main.ts` branches on `ATTRIBUTION_ENABLED` and calls `summarize` or `summarizeAttributed`.
- Tests import prompt builders directly.
- Config uses Gemini-centric names (`GEMINI_MODEL`, `GEMINI_API_KEY`).

## 3. Target Architecture

Directory layout (new files/modules):
```
src/services/llm/
  providers/
    google.ts
    openai.ts        # stub for future
    anthropic.ts     # stub for future
  prompts/
    digestPrompt.ts
    attributedDigestPrompt.ts
  summarizer/
    Summarizer.ts
    AiSdkSummarizer.ts
    LegacyGeminiSummarizer.ts
  truncation.ts
  schemas.ts         # Phase 2 structured output
  index.ts           # factory + registry
```

Interfaces:
```
interface Summarizer {
  summarizeMessages(messages: MessageDTO[]): Promise<string | StructuredDigest>;
  summarizeClusters(clusters: TopicCluster[]): Promise<string | StructuredDigest>;
}
```

Factory:
- `getSummarizer(config)` returns either `LegacyGeminiSummarizer` or `AiSdkSummarizer` depending on flags.

## 4. Prompt Handling
- Move `buildPrompt` → `prompts/digestPrompt.ts`.
- Move `buildAttributedPrompt` → `prompts/attributedDigestPrompt.ts`.
- Phase 1: keep textual prompt format (parity).
- Phase 2: optionally instruct model to return strict JSON matching a zod schema:
  ```
  {
    "keyTopics": [],
    "decisions": [],
    "actionItems": [],
    "links": [],
    "meta": { "attributionApplied": true }
  }
  ```
- Formatter adapts to accept either raw string or structured object.

## 5. Config Changes & Backwards Compatibility
New config keys:
- `LLM_PROVIDER` (default: "google")
- `LLM_MODEL` (alias `GEMINI_MODEL` if set)
- `USE_LEGACY_LLM` (boolean, default: false)
- `LLM_MAX_OUTPUT_TOKENS` (alias `MAX_SUMMARY_TOKENS`)

Compatibility mapping (implementation detail):
- If `GEMINI_MODEL` present and `LLM_MODEL` absent, set `LLM_MODEL = GEMINI_MODEL`.
- If `MAX_SUMMARY_TOKENS` present and `LLM_MAX_OUTPUT_TOKENS` absent, map value.
- Log a single deprecation notice for legacy names.

## 6. Phased Migration Plan

Phase 0 — Prep
- Add deps: `ai`, `@ai-sdk/google`.
- Extend config schema with mappings for legacy env names.

Phase 1 — Parity (target: minimal risk)
1. Extract prompts and truncation into `prompts/` and `truncation.ts`.
2. Implement `LegacyGeminiSummarizer` that wraps existing `gemini.ts` functions (no behavior change).
3. Implement `AiSdkSummarizer` using `ai` + provider factory (`providers/google.ts`) to call `generateText`/equivalent.
4. Create factory `src/services/llm/index.ts` to select summarizer by config.
5. Update `main.ts` to use the summarizer facade:
   - `const summarizer = getSummarizer(config);`
   - `summary = summarizer.summarizeMessages(...)` or `summarizeClusters(...)`.
6. Update tests to import prompt modules instead of the old file and add parity tests.
7. Validate behavior with representative fixtures and snapshot/containment checks.

Phase 2 — Structured Output (optional)
1. Add `schemas.ts` with zod schemas for the structured digest.
2. Update prompts to ask for strict JSON.
3. Parse output; on parse failure, fallback to raw string and log a warning.
4. Update Slack formatter to accept structured input.

Phase 3 — Multi-provider readiness
- Add provider modules for OpenAI/Anthropic as stubs; document how to enable.

Phase 4 — Enhancements (deferred)
- Streaming support.
- Model listing & validation utility improvements.
- Cost/caching telemetry.

## 7. Testing Strategy
- Move existing prompt tests to `prompts/` tests (parity).
- Add `truncation.test.ts`.
- Add `summarizer_parity.test.ts` to ensure ai-sdk path returns non-empty results and contains expected section headers.
- Phase 2: add structured parsing tests and malformed-output fallback test.
- Add provider selection matrix tests for env combos.

## 8. Risks & Mitigations
- Output drift: mitigate with parity tests and sample snapshot comparisons.
- Config confusion: log migration/deprecation notices and document changes in `deployment.md`.
- Rate-limits / transient errors: wrap ai-sdk calls with existing retry/backoff (reuse `p-retry`).
- Structured parse failures: graceful fallback to raw text and warnings.

## 9. Rollback Plan
- `USE_LEGACY_LLM=true` toggles back to current gemini implementation immediately.
- Keep `services/llm/gemini.ts` unchanged until Phase 2 stable.
- Revert commits if needed; make changes in isolated commits.

## 10. Implementation Checklist
- [ ] Add dependencies + update package.json
- [ ] Extend config schema & mapping logic
- [ ] Extract prompts + truncation modules
- [ ] Add LegacyGeminiSummarizer + facade
- [ ] Implement AiSdkSummarizer (Google)
- [ ] Wire main.ts to use summarizer facade
- [ ] Update & add tests (parity + truncation)
- [ ] Flip default to ai-sdk after green CI
- [ ] (Optional) Structured output phase
- [ ] Docs update: `deployment.md`, memory bank entries

## 11. Effort Estimate
- Phase 1 (parity): 2–3 hours
- Phase 2 (structured output): +2 hours
- Later phases incremental

## 12. Open Questions
- Should structured output be introduced in Phase 1 or deferred to Phase 2? (Recommendation: defer)
- Streaming required soon? (Recommendation: no)
- Long-term: retire GEMINI_* naming or keep as aliases? (Recommendation: keep aliases and deprecate later)

## 13. Example AiSdkSummarizer (sketch)
```ts
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export class AiSdkSummarizer implements Summarizer {
  constructor(private cfg: Config) {}
  private model() {
    const google = createGoogleGenerativeAI({ apiKey: this.cfg.GEMINI_API_KEY });
    return google(this.cfg.LLM_MODEL);
  }
  async summarizeMessages(messages: MessageDTO[]) {
    const prompt = buildDigestPrompt(messages, this.cfg);
    const res = await generateText({
      model: this.model(),
      input: prompt,
      maxOutputTokens: this.cfg.LLM_MAX_OUTPUT_TOKENS,
      temperature: 0.2,
    });
    return res.output[0]?.content[0]?.text ?? "";
  }
  async summarizeClusters(clusters: TopicCluster[]) {
    const prompt = buildAttributedDigestPrompt(clusters, this.cfg);
    const res = await generateText({
      model: this.model(),
      input: prompt,
      maxOutputTokens: this.cfg.LLM_MAX_OUTPUT_TOKENS,
      temperature: 0.2,
    });
    return res.output[0]?.content[0]?.text ?? "";
  }
}
```

## 14. Documentation Updates
- Update `docs/deployment.md` with new env vars and alias mappings.
- Update memory bank (`docs/activeContext.md`, `docs/progress.md`) once implemented.

---


