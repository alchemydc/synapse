# Synapse

[![Tests](https://github.com/alchemydc/synapse/actions/workflows/ci.yml/badge.svg)](https://github.com/alchemydc/synapse/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/alchemydc/synapse/branch/main/graph/badge.svg)](https://codecov.io/gh/alchemydc/synapse)

Synapse is an intelligent community digest bot designed to aggregate, summarize, and distribute conversations from your community platforms. It helps teams stay on top of important discussions without getting lost in the noise.

## Features

- **Multi-Source Ingestion**: Seamlessly ingests messages from **Discord** channels and **Discourse** forums.
- **Intelligent Summarization**: Powered by the **Vercel AI SDK**, Synapse uses advanced LLMs (like Google Gemini) to generate concise, context-aware summaries of conversations.
- **Slack Destination**: Delivers beautifully formatted daily digests directly to your **Slack** workspace.
- **Extensible Design**: Built on a modular architecture, making it easily extensible to support additional sources (e.g., GitHub, Telegram) and destinations (e.g., Email, Notion).

## Architecture

Synapse operates on a linear pipeline: `Source` -> `Processor` -> `Destination`.

### Sources
Sources are responsible for fetching and normalizing messages from external platforms.
- **Discord**: Fetches recent messages from configured channels using the `discord.js` library.
- **Discourse**: Polls latest topics and posts via the Discourse API, handling pagination and filtering.

### Processor
The core intelligence layer.
- **AiSdkProcessor**: Utilizes the Vercel AI SDK to interface with LLMs. It currently supports Google's Gemini models to analyze conversation threads and produce structured summaries. It handles token limits and context management automatically.

### Destination
Where the value is delivered.
- **Slack**: Formats the summarized data into rich Slack blocks, handling rate limits and message splitting for large digests.

## Quickstart

1.  **Clone and Install**
    ```bash
    git clone <repo-url>
    cd synapse
    npm install
    ```

2.  **Configure Environment**
    Copy `.env.example` to `.env` and populate it with your credentials.
    ```bash
    cp .env.example .env
    ```

3.  **Run Locally**
    ```bash
    npm run dev
    ```

4.  **Build and Start**
    ```bash
    npm run build
    npm start
    ```

## Configuration

Synapse is configured via environment variables.

### Core
- `LOG_LEVEL`: `debug`, `info`, `warn`, `error` (default: `info`)
- `DRY_RUN`: `true` to skip posting to Slack (default: `false`)

### LLM (Gemini)
- `GEMINI_API_KEY`: Your Google Gemini API key.
- `GEMINI_MODEL`: Model to use (e.g., `gemini-2.5-flash`).
- `MAX_SUMMARY_TOKENS`: Max tokens for the summary output.

### Sources
- **Discord**: `DISCORD_TOKEN`, `DISCORD_CHANNELS` (comma-separated IDs).
- **Discourse**: `DISCOURSE_BASE_URL`, `DISCOURSE_API_KEY`, `DISCOURSE_API_USERNAME`.

### Destination
- **Slack**: `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`.

## Scripts

- `npm run dev`: Run in development mode with hot-reloading.
- `npm run build`: Compile TypeScript to JavaScript.
- `npm start`: Run the production build.
- `npm test`: Run unit tests.
- `npm run test:coverage`: Generate report-only coverage output.
- `npm run discord:debug`: Validate Discord connectivity.
- `npm run discourse:debug`: Validate Discourse connectivity.
- `npm run models:list`: List available Gemini models.

## Coverage

- Coverage is generated natively in GitHub Actions (`CI - Tests & Coverage`) in report-only mode.
- Open the latest CI run and download the `coverage-report` artifact for `lcov` and summary outputs.

## Operations

- Production runbook: [`docs/production-runbook.md`](docs/production-runbook.md)
