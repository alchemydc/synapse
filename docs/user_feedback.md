# feedback from gustavo 30 sept 2025

## ✅ visual segmentation between digest topics isn't good
**STATUS: ADDRESSED (2025-09-30)**
- Updated Gemini prompts to use markdown H2 headers (`##`) for topics
- Added Block Kit dividers between topic sections
- Headers converted to bold in Slack (Slack doesn't support markdown headers natively)
- Implementation: `src/services/llm/gemini.ts`, `src/utils/format.ts`

## ✅ DM chat messages are noisy
**STATUS: ADDRESSED (2025-09-30)**
- Added `isDMChatter()` filter to detect and exclude DM-related messages
- Filters phrases like "check your DMs", "DM me", "sent you a DM", etc.
- Always applied (no config flag needed)
- Implementation: `src/utils/filters.ts`

## ✅ disc-topic output in forum digests is not useful
**STATUS: ADDRESSED (2025-09-30)**
- Enhanced `sanitizeLLMOutput()` to remove "disc-topic-N" artifacts
- Applied as final pass in sanitization pipeline
- Implementation: `src/utils/llm_sanitize.ts`

## ✅ catch edge cases of LLM reasoning
**STATUS: ADDRESSED (2025-09-30)**
- Expanded sanitization patterns to catch:
  - "Okay, I understand"
  - "Please provide"
  - "Here is/are"
  - Other meta-commentary patterns
- Implementation: `src/utils/llm_sanitize.ts`

## ✅ no weight for important topics
**STATUS: ADDRESSED (2025-09-30)**
- Added emoji-based priority system:
  - 🔴 Security (priority 1)
  - 💰 Funding (priority 2)
  - 🏛️ Governance (priority 3)
  - 💬 Customer Feedback (priority 4)
  - 📈 Adoption (priority 5)
  - 🚀 Growth (priority 6)
- LLM detects priority topics and prepends emoji to headers
- Post-processing sorts topics by priority (priority topics appear first)
- Implementation: `src/services/llm/gemini.ts`, `src/utils/topic_priority.ts`, `src/main.ts`

---

## Testing
- All unit tests pass (53/53)
- Changes maintain backward compatibility
- Ready for DRY_RUN validation with real data
