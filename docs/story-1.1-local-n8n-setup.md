## Story 1.1: Local n8n Setup with Docker Compose

**As a Developer,** I want to run n8n locally using a single Docker Compose command, so that I have a consistent environment for building the workflow.

### Acceptance Criteria
1.  A `docker-compose.yml` file exists in the project repository.
2.  Running `docker-compose up` successfully starts a local n8n instance.
3.  The instance is configured to use an `.env` file for local secrets and settings.

### Tasks
- [x] Create or verify existence of docker-compose.yml
- [x] Configure docker-compose.yml to use .env for secrets/settings
- [x] Test local n8n startup with docker-compose up
- [x] Document setup steps

### Dev Agent Record
- File List: docker-compose.yml, .env
- Status: Ready for Review
