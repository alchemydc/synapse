# productContext.md

## Why this project exists
Project Synapse addresses information overload by automating the monitoring and summarization of community channels (starting with Discord) and delivering concise digests to Slack.

## Problems it solves
- Manual monitoring is inefficient and unsustainable.
- Non-technical staff struggle to surface technical issues quickly.
- Delays and inconsistencies in internal and partner communications.

## How it should work
- A TypeScript/Node.js service crawls target channels.
- An LLM (initially Google Gemini API) summarizes key topics.
- A daily digest is posted to Slack for team consumption.
- This flow is already implemented for Discord → Slack.

## Reliability expectations
- Digest includes date range and structured sections (Highlights, Decisions, Action Items, Links).
- Idempotent runs; safe when no new messages.

## User experience goals
- Actionable, concise updates for internal teams.
- Clarity for non-technical users without reading raw feeds.
- Leadership visibility into ecosystem health.
- Partners benefit from improved timeliness and consistency.
