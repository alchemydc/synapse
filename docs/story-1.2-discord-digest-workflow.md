## Story 1.2: Build and Validate Discord-to-Slack Workflow

**As a Developer,** I want to build a robust Discord digest workflow in my local n8n instance, so that I can reliably gather, summarize, and deliver Discord channel insights to Slack.

### Acceptance Criteria
1. The workflow is named "Discord Digest" and is visible in the n8n UI.
2. Discord credentials are securely stored in n8n and referenced by the workflow.
3. Gemini API credentials are securely stored and used for summarization.
4. Slack credentials are securely stored and used for posting digests.
5. The workflow retrieves a list of all channels from the specified Discord server.
6. The workflow filters the channels to include only those specified for monitoring (configurable).
7. For each monitored channel, the workflow fetches messages from the past 24 hours.
8. All fetched messages are aggregated into a single text block.
9. The aggregated text is sent to the Gemini API for summarization.
10. The summary is posted to a designated Slack channel with a timestamp and source reference.
11. The workflow can be manually triggered and runs successfully end-to-end.
12. All credential references and channel IDs are managed via n8n variables or environment settings.
13. The workflow is exported and versioned for future deployment.

### Tasks
- [x] Create "Discord Digest" workflow in n8n UI
- [x] Store Discord credentials in n8n
- [x] Use Discord node to get all channels from the server
- [ ] Filter channels to monitor (based on config/environment variable)
- [ ] Loop through monitored channels
    - [ ] For each channel, calculate timestamp for 24 hours ago
    - [ ] Use Discord node to fetch messages from each channel for the past 24 hours
- [ ] Aggregate text content from all channels
- [ ] Create Gemini API credentials in n8n (after Discord part works)
- [ ] Create Slack credentials in n8n (after Discord part works)
- [ ] Send aggregated text to Gemini API for summarization
- [ ] Post summary to Slack channel with timestamp and source reference
- [ ] Validate workflow by manual trigger and confirm output in Slack
- [ ] Export workflow for version control

### Inputs
- Discord server ID and channel list (configurable)
- Gemini API key (secure credential)
- Slack channel ID (configurable)
- n8n environment variables for all secrets

### Outputs
- Slack message containing daily Discord summary
- Workflow export file for versioning

### Dev Agent Record
- File List: n8n workflow export file, .env
- Status: Draft
