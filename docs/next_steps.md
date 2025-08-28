# Next Steps for Project Synapse (2025-08-28)

## Implementation Roadmap

- [ ] Scaffold Node.js/TypeScript project structure
- [ ] Set up baseline scripts (lint, test, build, run)
- [ ] Implement Discord service (channel/message retrieval, filters, rate limits)
- [ ] Implement LLM service (Google Gemini API integration, prompt template, token controls)
- [ ] Implement Slack service (mrkdwn formatting, posting)
- [ ] Add scheduling (cron/Cloud Scheduler/GitHub Actions)
- [ ] Configure environment variables (.env) and config module
- [ ] Write unit tests for formatter and message filtering utilities
- [ ] Add centralized error handling and logging
- [ ] Monitor and tune rate limits for Discord API
- [ ] Document architecture and usage

---

### Post-MVP Feature Suggestion: Weekend Digest Window Extension

- On Mondays (UTC), extend DIGEST_WINDOW_HOURS from 24 to 72 to cover Fri–Sun messages.
- Header/context should render a 3-day UTC window (e.g., 2025-08-22 00:00–2025-08-25 00:00 UTC).
- Config: WEEKEND_WINDOW_HOURS=72 (default), DIGEST_WINDOW_HOURS=24 (default), ENABLE_WEEKEND_EXTEND=true.
- Implementation: Add helper (getEffectiveLookbackHours(nowUtc, cfg)), reuse getUtcDailyWindowFrom(), ensure DRY_RUN unaffected.
- Unit tests for Monday/non-Monday; consider future holiday rules.
