import dotenv from "dotenv";
import { summarizeDiscourseTopic } from "../services/llm/gemini";
import { NormalizedMessage, fetchDiscourseMessages } from "../services/discourse";

import { loadConfig } from "../config";

dotenv.config();
const config = loadConfig();

// Force small token limit to reproduce truncation issue
// config.MAX_SUMMARY_TOKENS = 500; // 2000 chars

// const topicId = 53548;
// const topicTitle = "Long Topic";
// const topicUrl = "http://example.com";

// const longContent = Array.from({ length: 100 }, (_, i) => `This is sentence number ${i}. The topic is about Zcash nodes and development.`).join(" ");

/*
const messages: NormalizedMessage[] = [
    {
        id: "1",
        source: "discourse",
        topicId: 123,
        topicTitle: "Long Topic",
        content: Array.from({ length: 50 }, (_, i) => `This is sentence number ${i}.`).join(" "),
        author: "User1",
        createdAt: new Date().toISOString(),
        url: "http://example.com/1"
    },
    {
        id: "2",
        source: "discourse",
        topicId: 123,
        topicTitle: "Long Topic",
        content: Array.from({ length: 50 }, (_, i) => `This is sentence number ${i + 50}.`).join(" "),
        author: "User2",
        createdAt: new Date().toISOString(),
        url: "http://example.com/2"
    }
];
*/

async function run() {
    const discourseOpts = {
        baseUrl: config.DISCOURSE_BASE_URL || "",
        apiKey: config.DISCOURSE_API_KEY || "",
        apiUser: config.DISCOURSE_API_USERNAME || "",
        windowHours: config.DIGEST_WINDOW_HOURS,
        maxTopics: config.DISCOURSE_MAX_TOPICS,
        lookbackHours: config.DISCOURSE_LOOKBACK_HOURS
    };

    if (!discourseOpts.baseUrl) {
        console.error("DISCOURSE_BASE_URL is not set.");
        return;
    }

    console.log("Fetching messages from Discourse...", { ...discourseOpts, apiKey: "REDACTED" });
    const allMessages = await fetchDiscourseMessages(discourseOpts);
    console.log(`Fetched ${allMessages.length} messages.`);

    if (allMessages.length === 0) {
        console.log("No messages found.");
        return;
    }

    // Group by topic
    const topics = new Map<number, NormalizedMessage[]>();
    for (const msg of allMessages) {
        if (msg.topicId) {
            if (!topics.has(msg.topicId)) {
                topics.set(msg.topicId, []);
            }
            topics.get(msg.topicId)?.push(msg);
        }
    }

    console.log(`Found ${topics.size} topics.`);

    console.log(`Found ${topics.size} topics.`);

    if (topics.size > 0) {
        // Summarize the first one
        const firstTopicId = topics.keys().next().value as number;
        const topicMessages = topics.get(firstTopicId)!;

        // Apply filters to match production behavior
        const { applyMessageFilters } = require("../utils/filters");
        const filteredMessages = applyMessageFilters(topicMessages, config);
        console.log(`Filtered ${topicMessages.length} messages down to ${filteredMessages.length}.`);

        if (filteredMessages.length === 0) {
            console.log("No messages left after filtering.");
            return;
        }

        const firstMsg = filteredMessages[0];
        const title = firstMsg.topicTitle || "Unknown Topic";
        const url = firstMsg.url || "";

        console.log(`Summarizing topic: ${title} (ID: ${firstMsg.topicId}, ${filteredMessages.length} messages)...`);
        const summary = await summarizeDiscourseTopic(
            filteredMessages,
            title,
            url,
            config
        );

        console.log("Summary result:");
        console.log("---------------------------------------------------");
        console.log(summary);
        console.log("---------------------------------------------------");
    }
}

run().catch(console.error);
