## Project Synapse: Community Digest AI Bot - Project Brief v3.0

### Executive Summary
The Community Digest AI Bot combats information overload for a 501(c)(3) by automatically collecting discussions from community channels (starting with Discord), summarizing them with an LLM, and posting concise digests to Slack. We have pivoted from an n8n-based workflow to a pure TypeScript/Node.js service due to n8n license restrictions and platform constraints. The new approach increases flexibility, avoids license issues, and better supports future extensibility.

**MVP pipeline is now implemented as a Node/TypeScript service with real Discord, Gemini, and Slack integrations.**

### Problem Statement
Employees currently spend significant time manually monitoring multiple community channels, causing inefficiency, delays, and inconsistent information flow. Non-technical staff struggle to identify technically significant issues quickly, creating a bottleneck for engineering. As the community grows, the manual approach is unsustainable.

### Proposed Solution
Build a modular TypeScript/Node.js application that:
- Crawls selected Discord channels and other sources (future).
- Aggregates and cleans recent messages.
- Summarizes content via an LLM (initially Google Gemini API).
- Publishes a daily digest to Slack.

This replaces the manual workflow with an automated, extensible, license-unencumbered system.

### Target Users
- Primary: Comms-Ops, Engineering/Technical PM, Leadership.
- Secondary: Ecosystem partners benefiting from timely, consistent updates.

### Goals & Success Metrics
- Increase operational efficiency and accelerate information flow.
- Improve communication quality to partners.
- KPI: ~90% reduction in manual monitoring time within one month of launch.

### MVP Scope
- Discord crawler for selected public channels.
- Core LLM summarization (Google Gemini API initially).
- Slack integration for posting digests to one channel.
- Daily schedule (e.g., cron, scheduler, or hosted platform’s timer).
- Configuration via environment variables and app config.

**Status: Operational (daily digest flow verified)**

### Out of Scope for MVP
- Forum (Discourse) integration; Signal integration; multiple servers/platforms; interactive Slack features; advanced analytics (sentiment, tagging); variable cadences.

### Post-MVP Vision
Evolve into a “Community Insights Engine” with additional sources, trend/anomaly detection, and on-demand reporting. The Node architecture serves as a foundation for a future web UI if needed.

### Technical Considerations (Revised)
- Core Platform: TypeScript/Node.js application (no n8n).
- Hosting: GCP (Cloud Run or GKE) or similar managed environment; local dev via Node and optional Docker.
- Scheduling: Platform scheduler (e.g., Cloud Scheduler), GitHub Actions, or cron.
- LLM: Google Gemini API (cost-effective model within <$10/month target).
- Architecture: Modular services (Discord, LLM, Slack), utilities, robust error handling and rate-limit backoff.
- DRY_RUN switch for safe testing.
- zod-based config validation.
- Discord connectivity debug tool.
- Token-budget-aware truncation for LLM input.

### Constraints & Assumptions
- Budget-conscious; prefer efficient LLM usage.
- APIs are available and permitted for our use.
- Security of API keys and minimal data retention.

### Risks & Open Questions
- API policy/permission changes; rate limiting across providers.
- LLM summary accuracy; need for human oversight.
- Cost drift if traffic or scope expands; consider caching and tighter prompts.
- Future multi-source scaling and data normalization needs.
- LLM prompt drift; add unit tests and structured output to stabilize.
