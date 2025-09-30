# Active Context — Recent Changes (summary)

## Summary (2025-09-30 - Critical Bug Fix)

### CRITICAL: Fixed Slack 50-Block Limit Error
- **Problem:** Block Kit was creating one section per bullet point, causing 50+ block payloads that exceeded Slack's limit
- **Solution:** Refactored `buildDigestBlocks()` to group all content under each topic header into single section blocks
- **Impact:** Reduced block count by ~40-60% (e.g., 10 topics: 63 blocks → 33 blocks)
- **Result:** Slack posting now works reliably for multi-topic digests

## Summary (2025-09-30 - Morning Session)
- **Visual Hierarchy Improvements**
  - Updated Gemini prompts to use markdown H2 headers (`##`) for topic titles
  - Added emoji-based priority indicators:
    - 🔴 Security, 💰 Funding, 🏛️ Governance, 💬 Customer Feedback, 📈 Adoption, 🚀 Growth
  - Enhanced Block Kit formatting with dividers between topic sections for better visual separation
  - Headers are converted to bold in Slack mrkdwn (Slack doesn't support markdown headers natively)

- **DM Chatter Filtering**
  - Added `isDMChatter()` filter in `src/utils/filters.ts` to exclude noisy DM-related messages
  - Filters out phrases like "check your DMs", "DM me", "sent you a DM", etc.
  - Always applied (no config flag needed)

- **Enhanced LLM Sanitization**
  - Expanded `src/utils/llm_sanitize.ts` with additional patterns:
    - "Please provide", "Here is/are", "Okay, I understand"
    - Removes "disc-topic-N" artifacts from output
  - Prevents meta-commentary leakage into digests

- **Topic Prioritization**
  - Created `src/utils/topic_priority.ts` for post-processing topic sorting
  - Parses topics by headers, detects emoji prefixes, sorts by priority
  - Priority topics appear first in digest (Security > Funding > Governance > etc.)
  - Integrated into `src/main.ts` after sanitization/deduplication

- **Tests**
  - All existing tests pass (53/53)
  - Changes maintain backward compatibility

## Rationale
- Addresses user feedback for better visual segmentation and topic prioritization
- Reduces noise from DM-related chatter in digests
- Improves Slack readability with clearer topic boundaries and visual hierarchy
- Priority topics (security, funding, governance) now surface prominently

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
