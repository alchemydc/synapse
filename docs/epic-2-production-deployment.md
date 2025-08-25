## Epic 2: Production Deployment of Discord Pipeline

**Goal:** Deploy the n8n platform to GKE and automate the validated Discord-only workflow.

### Story 2.1: Deploy n8n to GKE

**As a Developer,** I want to deploy the self-hosted n8n instance to Google Kubernetes Engine, so that we have a stable and scalable production platform.

**Acceptance Criteria:**
1.  A production-ready n8n deployment is running on GKE.
2.  The instance is configured with a persistent volume and secure networking.
3.  The production n8n web UI is accessible via a secure HTTPS endpoint.

### Story 2.2: Deploy and Automate Production Workflow

**As a System,** I want the validated Discord workflow to be deployed and automated in the production GKE instance, so that the daily digest is delivered reliably.

**Acceptance Criteria:**
1.  The "Discord Digest" workflow is imported into the production n8n instance.
2.  Separate, secure production credentials for all services are configured.
3.  The `Cron` trigger is enabled to run the workflow automatically every 24 hours.
