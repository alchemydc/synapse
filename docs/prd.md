## **Project Synapse: Product Requirements Document (PRD) - Final Approved Version**

### **Goals and Background Context**

#### **Goals**
* Increase operational efficiency by drastically reducing time spent on manual channel monitoring
* Improve the internal flow of information from the community to the correct teams
* Enhance ecosystem partner relations through more timely and consistent communication

#### **Background Context**
Project Synapse aims to solve the significant productivity loss and information delays caused by the manual monitoring of community channels like Discord and forums. This project will introduce an AI-powered workflow to automate the gathering, summarization, and delivery of community insights, ensuring the team is well-informed and can communicate more effectively with ecosystem partners.

#### **Change Log**
| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2025-08-20 | 1.0 | Initial PRD draft based on Project Brief. | John, PM |
| 2025-08-20 | 2.0 | Major revision to reflect implementation on the n8n platform. | Winston, Architect |
| 2025-08-20 | 2.2 | Refined epics to follow a developer-centric, vertical-slice approach (local-first, Discord-only MVP). | Winston, Architect |

---
### **Requirements**

#### **Functional**
* **FR1:** The system must be able to connect to a specified Discord server and crawl new messages from designated public channels.
* **FR2:** The system must be able to connect to a specified web forum and crawl new posts from designated sections.
* **FR3:** The system must use the Google Gemini API to generate a concise summary from the text content gathered from all sources.
* **FR4:** The system must post the generated summary as a single message to a specified Slack channel.
* **FR5:** The entire process (crawl, summarize, post) must be configured to run automatically once per day.
* **FR6:** All system settings (e.g., channel names, forum URL, webhook) must be managed through the n8n interface for the MVP.

#### **Non-Functional**
* **NFR1:** The implementation will be built on the **n8n workflow automation platform**.
* **NFR2:** The n8n application must be containerized using Docker and be runnable for local development via Docker Compose.
* **NFR3:** The production deployment target for the n8n instance is Google Kubernetes Engine (GKE) on the Google Cloud Platform.
* **NFR4:** The monthly cost for Google Gemini API usage must not exceed $10.
* **NFR5:** The system must respect and gracefully handle API rate limits from all external services, configured within the n8n workflow.
* **NFR6:** The initial research phase has been **completed**, and the decision has been made to adapt a FOSS solution (n8n).

---
### **Technical Assumptions**

* **Repository Structure:** The project repository will contain the **configuration and infrastructure-as-code files** needed to deploy and manage our self-hosted n8n instance.
* **Service Architecture:** The architecture is a **Workflow-based Architecture**. The core logic will be encapsulated within one or more workflows on the n8n platform.
* **Testing requirements:** Testing will focus on **end-to-end workflow validation**, which involves manually triggering the workflow with test data and verifying the output.
* **Core Technology Stack:**
    * **Orchestration Platform:** n8n (self-hosted)
    * **Local Environment:** Docker and Docker Compose 
    * **Cloud Provider:** Google Cloud Platform (GCP) 
    * **Production Host:** Google Kubernetes Engine (GKE) 
    * **LLM Provider:** Google Gemini API 

---
### **Epics**

#### **Epic 1: Local Foundation & Discord MVP Pipeline**
**Goal:** Establish the local development environment and build a complete, end-to-end pipeline that can crawl **Discord**, summarize the content, and deliver a digest to Slack.

* **Story 1.1: Local n8n Setup with Docker Compose**
    * **As a Developer,** I want to run n8n locally using a single Docker Compose command, so that I have a consistent environment for building the workflow.
    * **Acceptance Criteria:**
        1.  A `docker-compose.yml` file exists in the project repository.
        2.  Running `docker-compose up` successfully starts a local n8n instance.
        3.  The instance is configured to use an `.env` file for local secrets and settings.

* **Story 1.2: Build and Validate Discord-to-Slack Workflow**
    * **As a Developer,** I want to build the complete Discord digest workflow in my local n8n instance, so that I can test and verify all integrations and logic before deploying.
    * **Acceptance Criteria:**
        1.  A "Discord Digest" workflow is created in the local n8n instance.
        2.  Credentials for Discord, Gemini, and Slack are securely stored.
        3.  When manually triggered, the workflow successfully crawls the specified Discord channel.
        4.  The workflow successfully calls the Gemini API with the Discord text and receives a summary.
        5.  The final summary is correctly posted to a designated test Slack channel.

---
#### **Epic 2: Production Deployment of Discord Pipeline**
**Goal:** Deploy the n8n platform to GKE and automate the validated Discord-only workflow.

* **Story 2.1: Deploy n8n to GKE**
    * **As a Developer,** I want to deploy the self-hosted n8n instance to Google Kubernetes Engine, so that we have a stable and scalable production platform.
    * **Acceptance Criteria:**
        1.  A production-ready n8n deployment is running on GKE.
        2.  The instance is configured with a persistent volume and secure networking.
        3.  The production n8n web UI is accessible via a secure HTTPS endpoint.

* **Story 2.2: Deploy and Automate Production Workflow**
    * **As a System,** I want the validated Discord workflow to be deployed and automated in the production GKE instance, so that the daily digest is delivered reliably.
    * **Acceptance Criteria:**
        1.  The "Discord Digest" workflow is imported into the production n8n instance.
        2.  Separate, secure production credentials for all services are configured.
        3.  The `Cron` trigger is enabled to run the workflow automatically every 24 hours.

---
#### **Epic 3: Forum Integration**
**Goal:** Expand the bot's capabilities to include crawling web forums, making the daily digest more comprehensive.

* **Story 3.1: Add Forum Crawler to Workflow**
    * **As a Developer,** I want to add a Forum crawling step to the existing n8n workflow, so that content from the Zcash Community Forum is included in the daily digest.
    * **Acceptance Criteria:**
        1.  The existing workflow is updated to include a new step that crawls the forum's JSON endpoints.
        2.  The text from both the Discord and Forum crawlers is aggregated *before* being sent to the Gemini API.
        3.  The final Slack message is updated to indicate that it now includes both sources.
        4.  The updated workflow is validated in the local environment before being deployed to production.