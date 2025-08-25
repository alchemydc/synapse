## Epic 1: Local Foundation & Discord MVP Pipeline

**Goal:** Establish the local development environment and build a complete, end-to-end pipeline that can crawl Discord, summarize the content, and deliver a digest to Slack.

### Story 1.1: Local n8n Setup with Docker Compose

**As a Developer,** I want to run n8n locally using a single Docker Compose command, so that I have a consistent environment for building the workflow.

**Acceptance Criteria:**
1.  A `docker-compose.yml` file exists in the project repository.
2.  Running `docker-compose up` successfully starts a local n8n instance.
3.  The instance is configured to use an `.env` file for local secrets and settings.

### Story 1.2: Build and Validate Discord-to-Slack Workflow

**As a Developer,** I want to build the complete Discord digest workflow in my local n8n instance, so that I can test and verify all integrations and logic before deploying.

**Acceptance Criteria:**
1.  A "Discord Digest" workflow is created in the local n8n instance.
2.  Credentials for Discord, Gemini, and Slack are securely stored.
3.  When manually triggered, the workflow successfully crawls the specified Discord channel.
4.  The workflow successfully calls the Gemini API with the Discord text and receives a summary.
5.  The final summary is correctly posted to a designated test Slack channel.
