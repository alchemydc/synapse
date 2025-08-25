## Epic 3: Forum Integration

**Goal:** Expand the bot's capabilities to include crawling web forums, making the daily digest more comprehensive.

### Story 3.1: Add Forum Crawler to Workflow

**As a Developer,** I want to add a Forum crawling step to the existing n8n workflow, so that content from the Zcash Community Forum is included in the daily digest.

**Acceptance Criteria:**
1.  The existing workflow is updated to include a new step that crawls the forum's JSON endpoints.
2.  The text from both the Discord and Forum crawlers is aggregated *before* being sent to the Gemini API.
3.  The final Slack message is updated to indicate that it now includes both sources.
4.  The updated workflow is validated in the local environment before being deployed to production.
