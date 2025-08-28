## Synapse: Community Digest: TypeScript/Node.js App Design

This document outlines the design for a TypeScript/Node.js application that replicates the functionality of the provided n8n workflow. The goal is to create a script that fetches recent messages from specific community platforms, starting with Discord, summarizes them using the Google Gemini API, and posts the summary to a designated Slack channel.

### 1. Core Functionality

The application will perform the following steps in sequence:

1. Fetch Channels: Retrieve a list of all channels from the Discord server of interest.
2. Filter Channels: Select a predefined list of "interesting" channels to monitor.
3. Fetch Messages: For each selected channel, retrieve the most recent messages.
4. Filter Messages: Keep only non-empty messages created within the time period of interest (default 24 hours).
5. Aggregate Content: Combine the author and content of the filtered messages into a format appropriate for summarization via LLM.
6. Summarize: Send the aggregated text to an LLM (initially Google Gemini via API) for summarization.
7. Format for Slack: Convert the Markdown summary from Gemini into Slack's mrkdwn format.
8. Post to Slack: Send the formatted summary to a specified Slack channel.

### 2. Project Structure

```text
synapse/
├── src/
│   ├── main.ts             # Main application entry point
│   ├── services/
│   │   ├── discord.ts      # Discord API interactions
│   │   ├── gemini.ts       # Google Gemini API interactions
│   │   ├── slack.ts        # Slack API interactions
│   └── utils/
│       ├── formatter.ts    # Markdown to mrkdwn conversion
│       └── logger.ts       # Logging utility
├── .env                    # Environment variables (API keys, IDs)
├── package.json            # Project dependencies and scripts
└── tsconfig.json           # TypeScript compiler configuration
```

### 3. Key Dependencies

We'll use the following npm packages to interact with the required services and manage the application:

- discord.js: The official Node.js library for the Discord API.
- @google/generative-ai: The official SDK for the Google Gemini API.
- @slack/web-api: The official library for the Slack Web API.
- dotenv: To load environment variables from the .env file.
- typescript: The TypeScript compiler.
- ts-node: To run TypeScript files directly without pre-compilation.

### 4. Component Design & Logic

#### src/main.ts (Entry Point)

This file will orchestrate the entire workflow.

1. Initialization:
   - Load environment variables using dotenv.
   - Initialize the Discord, Gemini, and Slack clients.
2. Execution Flow:
   - Call the `discord.ts` service to get all channels from the specified guild.
   - Filter these channels against a hardcoded list of "interesting" channel IDs.
   - Loop through the filtered channels and call `discord.ts` to fetch recent messages.
   - Filter the messages based on timestamp (last 365 days) and content (not empty).
   - Aggregate the message content into a single string, formatted as `author: <username>, message: <content>`.
   - Pass the aggregated string to the `gemini.ts` service to get a summary.
   - Use the `formatter.ts` utility to convert the summary to Slack's mrkdwn.
   - Call the `slack.ts` service to post the final summary.
3. Error Handling:
   - Implement a global try...catch block to handle any exceptions during the process and log them using the logger.

#### src/services/discord.ts

This module will handle all communication with the Discord API.

- DiscordService class:
  - Constructor: Initializes the discord.js client with the bot token from environment variables.
  - `getChannels(guildId: string)`: Fetches and returns all channels for a given guild ID.
  - `getRecentMessages(channelId: string, limit: number)`: Fetches the last `limit` messages from a specific channel.

#### src/services/gemini.ts

This module will manage interactions with the Google Gemini API.

- GeminiService class:
  - Constructor: Initializes the Gemini client with the API key.
  - `summarizeMessages(messages: string)`:
    - Takes the aggregated message string as input.
    - Constructs a prompt, e.g., “Provide a succinct summary of the following Discord messages...”.
    - Sends the request to the `gemini-1.5-flash` model.
    - Returns the generated summary text.

#### src/services/slack.ts

This module will be responsible for sending messages to Slack.

- SlackService class:
  - Constructor: Initializes the Slack `WebClient` with the bot token.
  - `sendMessage(channel: string, text: string)`: Posts the provided text to the specified Slack channel.

#### src/utils/formatter.ts

This utility module will contain the logic for text formatting.

- `markdownToMrkdwn(text: string)` function:
  - Converts Markdown headings (`#`) to bold (`*text*`).
  - Converts Markdown bold (`**text**`) to Slack bold (`*text*`).
  - Converts Markdown italics (`*text*`) to Slack italics (`_text_`).
  - Converts Markdown list items (`*` or `-`) to Slack bullet points (`•`).
  - Returns the formatted string.

### 5. Configuration (.env)

Sensitive information and configuration details will be stored in a `.env` file to keep them out of the source code.

```env
# Discord Bot Token
DISCORD_BOT_TOKEN=your_discord_bot_token_here

# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Slack Bot Token
SLACK_BOT_TOKEN=your_slack_bot_token_here

# Discord Server (Guild) ID
DISCORD_GUILD_ID=978714252934258779

# Slack Channel to post the digest
SLACK_CHANNEL_ID=synapse-testing
```

### 6. Getting Started & Execution

1. Installation:
   ```bash
   npm install
   ```
2. Configuration: Create a `.env` file and populate it with the necessary API keys and IDs.
3. Execution:
   ```bash
   npx ts-node src/main.ts
   ```
4. Scheduling: For automated execution, schedule the script via cron or a scheduled task service.

This design provides a robust and scalable foundation for building the Discord Digest application, mirroring the logic of your n8n workflow in a maintainable and customizable TypeScript/Node.js environment.
