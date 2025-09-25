# Active Context — Recent Changes (summary)

## Summary
- LLM prompt improvements
  - Added strict output rules to Gemini prompts to prevent meta commentary and enforce a single "Participants:" line per topic.
- LLM output sanitation
  - Added `src/utils/llm_sanitize.ts` to strip common preamble/acknowledgement lines the model sometimes emits.
- Participant dedupe
  - Added `src/utils/participants_dedupe.ts` to collapse duplicate `Participants:` lines inside a topic block as a defensive post-process.
- Pipeline wiring
  - Applied sanitizer + dedupe before formatting in `src/main.ts` so Slack output is cleaned prior to Block Kit construction.
- Forum source labels & linking
  - Source labels now render as `[Forum Title]` (no "topic" token in label) via `src/utils/source_labels.ts`.
  - Link injection (`src/utils/source_link_inject.ts`) converts those labels to Slack-friendly links where registry metadata exists; only the Title is hyperlinked in Slack output.
- Tests
  - Updated/added unit tests (notably `test/unit/link_and_inject.test.ts`) to reflect the new link format and prompt behavior.
  - Ran full test suite locally: all tests pass (53/53).

## Rationale
- Prevents LLM instruction leakage into produced digests.
- Ensures a single, predictable `Participants:` line per topic for downstream consumers.
- Improves Slack UX by hyperlinking only the human-visible forum title.

---

Suggested commit message (imperative style)
```
llm(gemini): enforce strict output + sanitize LLM output; fix forum labeling & link injection

- Add strict output rules to Gemini prompts to avoid meta commentary and enforce exactly one Participants line per topic.
- Add sanitizeLLMOutput to drop LLM preambles and acknowledgements.
- Add collapseDuplicateParticipants to remove duplicate Participants lines produced by models.
- Wire sanitizer + dedupe into pipeline before formatting.
- Change forum source label format to "[Forum Title]" and update source_link_inject to hyperlink only the Title.
- Update unit tests to reflect new link format and prompt behavior; all tests pass locally.

Refs: update docs/activeContext.md and unit tests.
```

If you want, I can:
- create a separate commit-message file or run the `git commit` command (you must approve running git).
- update `docs/progress.md` or `docs/project brief.md` with the same summary.
