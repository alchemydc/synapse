Done. Here is the revised Project Brief (Version 2.0), updated to reflect our new technical direction of using a self-hosted n8n instance for the MVP.

***

## **Project Synapse: Community Digest AI Bot - Project Brief v2.0**

### **Executive Summary**

The Community Digest AI Bot is an automated workflow designed to address information overload for a $501(c)(3)$ non-profit. By leveraging the **n8n workflow automation platform**, the system will crawl, analyze, and summarize discussions from key community channels (Discord and forums). It will then deliver concise digests to a designated Slack channel, significantly increasing team productivity and ensuring all staff and ecosystem partners remain informed of critical updates and community sentiment.

---

### **Problem Statement**

Currently, employees across the entire organization dedicate significant and duplicative daily effort to manually monitor a variety of community channels. This inefficient process leads to productivity loss, information delays, and inconsistent communication with ecosystem partners. Non-technical team members, who bear much of the monitoring responsibility, struggle to surface technically significant issues in a timely manner, creating a bottleneck for the engineering team. As the community grows, this manual approach is unsustainable.

---

### **Proposed Solution**

The proposed solution is an AI-powered workflow, built on the **n8n platform**, that automates the process of monitoring and synthesizing community conversations. This approach was chosen after a market analysis phase, prioritizing a Free and Open-Source Software (FOSS) solution that could be self-hosted to meet the project's core requirements efficiently.

The system will operate in three main stages:
* **Crawl:** The n8n workflow will connect to specified public sources, including a Discord server and a web forum, to gather new messages and posts.
* **Summarize:** Using the Google Gemini API, the collected data will be analyzed to identify key topics and emerging issues, which will be compiled into a concise, human-readable digest.
* **Deliver:** The final digest will be automatically posted to a designated Slack channel each morning.

This solution directly replaces the current inefficient manual process with an automated, scalable, and intelligent system.

---

### **Target Users**

The target users of the generated digest remain unchanged.
* **Primary User Segment: Internal Team Members**
    * **Comms-Ops Team:** Non-technical users who need to quickly understand community sentiment and identify major topics without reading raw-text source channels.
    * **Engineering & Technical PM:** Technical users who need to efficiently flag relevant conversations, bug reports, or protocol feedback.
    * **Leadership:** Require a high-level overview to stay informed on the ecosystem's health and activity.
* **Secondary User Segment: Ecosystem Partners**
    * While not direct users, this group benefits from the internal team being empowered to provide more timely, accurate, and consistent communication.

---

### **Goals & Success Metrics**

The project's goals are independent of the implementation and remain the same.
* **Increase Operational Efficiency:** Drastically reduce the cumulative time employees spend manually monitoring community channels.
* **Improve Information Flow:** Accelerate the speed at which critical information moves from the community to the relevant internal teams.
* **Enhance Ecosystem Partner Relations:** Improve the timeliness and consistency of communication to key ecosystem partners.
* **Time Saved (KPI):** Target a 90% reduction in person-hours spent on manual channel monitoring within one month of launch.

---

### **MVP Scope**

The initial version will focus on a single, end-to-end pipeline to prove the concept and deliver immediate value.
* **Crawler for one Discord Server:** Configuration of an n8n workflow to read messages from specified public channels within the Zcash Foundation Discord server.
* **Crawler for one Web Forum:** Configuration of an n8n workflow to read new posts from the Zcash Community Forum.
* **Core AI Summarization:** A summarization step in the workflow that uses the Google Gemini API to create a coherent digest.
* **Slack Integration:** The ability to post the generated digest as a message to a single, specified Slack channel.
* **Daily Digest Cadence:** The workflow will be configured to run automatically once every 24 hours.
* **Configuration:** All settings will be managed within the n8n workflow UI and its credential manager.

---

### **Out of Scope for MVP**

* Signal Integration 
* Support for Multiple Servers/Forums 
* **A Custom Web UI for Configuration:** The n8n interface will serve this purpose for the MVP.
* Advanced AI Analysis (e.g., sentiment analysis, automated tagging) 
* Variable Cadence (weekly, monthly digests) 
* Interactive Slack Digests 

---

### **Post-MVP Vision**

The long-term vision is to evolve the bot into a comprehensive "Community Insights Engine". Future phases could include expanded source support, trend and anomaly detection, and on-demand reporting.

**Note on Technical Strategy:** The post-MVP vision, particularly the development of a custom web UI for non-technical users, may require migrating from the n8n platform to a custom-built software solution if platform limitations are reached. The n8n workflow will serve as a proven, operational blueprint for that potential future development.

---

### **Technical Considerations (Revised)**

* **Core Platform:** **n8n (self-hosted)**. The entire MVP will be built as a workflow on the n8n platform.
* **Local Development:** The project will be containerized using Docker, with developers running a local n8n instance via Docker Compose.
* **Production Hosting:** The n8n application will be deployed to the **Google Cloud Platform (GCP)**, specifically using **Google Kubernetes Engine (GKE)** for the MVP.
* **AI Summarization Model:** The summarization will be powered by the **Google Gemini API**, using the most cost-effective model that delivers acceptable quality to stay within the <$10/month budget.
* **Architecture:** The architecture is a **scheduled workflow** running within the n8n platform, which integrates with third-party APIs (Discord, Slack, Gemini) via pre-built or HTTP nodes.

---

### **Constraints & Assumptions**

* **Budget:** The project remains budget-conscious, with the n8n FOSS solution selected to maximize resource efficiency.
* **Technical Stack:** The MVP will adhere to the specified technology stack: **n8n platform**, Docker for containerization, deployment on GCP/GKE, and the Google Gemini API for summarization.
* **Assumptions:** We continue to assume that the necessary APIs will be available and that the target sources are public and crawlable without aggressive anti-scraping measures.

---

### **Risks & Open Questions**

* **Platform Rate Limiting:** The n8n workflow must be designed to gracefully handle API rate limits from all external services.
* **Inaccurate Summaries:** The LLM may occasionally provide inaccurate digests, requiring human oversight.
* **Platform Limitations (New Risk):** The long-term vision for a custom UI and advanced analytics may be constrained by the capabilities of the n8n platform, potentially requiring a future migration to a custom software solution.

---
