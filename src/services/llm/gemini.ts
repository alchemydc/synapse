// services/llm/gemini.ts
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { Config } from "../../config";
import { MessageDTO } from "../discord";
import { logger } from "../../utils/logger";
import { TopicCluster, formatParticipantList } from "../../utils/topics";

function formatMessageLine(msg: MessageDTO): string {
  const date = new Date(msg.createdAt);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const dateStr = date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  });
  return `[${msg.channelId} @ ${dateStr} ${tz}] ${msg.content}`;
}

function buildPrompt(messages: MessageDTO[]): string {
  return [
    "Community Digest:",
    "Summarize the following Discord messages. For each section, produce concise bullets.",
    "Sections: Key Topics, Decisions, Action Items, Links.",
    "",
    ...messages.map((m, i) => `[${i + 1}] ${formatMessageLine(m)}`),
    "",
    "Digest:",
  ].join("\n");
}

/**
 * Build a prompt that includes per-topic clusters and participant lists.
 * @param clusters TopicCluster[]
 * @param config Config (for token budgeting notes)
 */
function buildAttributedPrompt(clusters: TopicCluster[], config: Config): string {
  const parts: string[] = [];

  parts.push("Community Digest (Attributed):");
  parts.push("Summarize the following topic clusters derived from Discord messages.");
  parts.push("For each topic, produce concise bullets under the sections: Key Topics, Decisions, Action Items, Links.");
  parts.push("For any bullet derived from a topic, include a trailing 'Participants: name1, name2' line listing the participants involved in that topic.");
  parts.push("Do not invent participants not listed below. Use the exact participant names provided.");
  parts.push("");
  parts.push("Input topics (chronological):");
  parts.push("");

  for (const c of clusters) {
    const participants = formatParticipantList(c.participants, config.MAX_TOPIC_PARTICIPANTS);
    parts.push(`Topic ${c.id}:`);
    parts.push(`Channel: ${c.channelId}`);
    parts.push(`Participants: ${participants || "none"}`);
    parts.push("Messages:");
    for (let i = 0; i < c.messages.length; i++) {
      parts.push(`[${i + 1}] ${formatMessageLine(c.messages[i])}`);
    }
    parts.push(""); // spacer between topics
  }

  parts.push("Digest:");
  parts.push("");
  parts.push(`Notes: Limit output to concise bullets. If a topic contains no substantive content, omit it. Max summary token budget: ${config.MAX_SUMMARY_TOKENS}.`);

  return parts.join("\n");
}

function truncateMessages(messages: MessageDTO[], maxChars: number): MessageDTO[] {
  let total = 0;
  const out: MessageDTO[] = [];
  for (const m of messages) {
    if (total + m.content.length > maxChars) break;
    out.push(m);
    total += m.content.length;
  }
  return out;
}

export async function summarize(messages: MessageDTO[], config: Config): Promise<string> {
  if (!config.GEMINI_MODEL || config.GEMINI_MODEL.trim() === "") {
    logger.error("GEMINI_MODEL is empty; check CI env or repository Variables export.");
    throw new Error("GEMINI_MODEL is required");
  }
  logger.info("Gemini init", { model: config.GEMINI_MODEL, maxTokens: config.MAX_SUMMARY_TOKENS });

  const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  const model: GenerativeModel = genAI.getGenerativeModel({ model: config.GEMINI_MODEL });

  // Truncate to fit token budget (roughly 4 chars per token)
  const maxChars = config.MAX_SUMMARY_TOKENS * 4;
  const truncated = truncateMessages(messages, maxChars);

  const prompt = buildPrompt(truncated);

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: config.MAX_SUMMARY_TOKENS,
      temperature: 0.2,
    },
  });

  return result.response.text();
}

/**
 * summarizeAttributed - accepts topic clusters (with participants) and asks the LLM
 * to include Participants lines per topic-derived bullet.
 */
export async function summarizeAttributed(clusters: TopicCluster[], config: Config): Promise<string> {
  if (!config.GEMINI_MODEL || config.GEMINI_MODEL.trim() === "") {
    logger.error("GEMINI_MODEL is empty; check CI env or repository Variables export.");
    throw new Error("GEMINI_MODEL is required");
  }
  logger.info("Gemini attributed init", { model: config.GEMINI_MODEL, maxTokens: config.MAX_SUMMARY_TOKENS });

  const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  const model: GenerativeModel = genAI.getGenerativeModel({ model: config.GEMINI_MODEL });

  // Build prompt from clusters. To control tokens, we will cap messages per cluster if necessary.
  const maxChars = config.MAX_SUMMARY_TOKENS * 4;
  // Flatten messages to estimate length; simple approach: keep clusters but truncate long clusters' messages
  const prompt = buildAttributedPrompt(clusters, config);

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: config.MAX_SUMMARY_TOKENS,
      temperature: 0.2,
    },
  });

  return result.response.text();
}

// For testing
export { buildPrompt, truncateMessages, formatMessageLine, buildAttributedPrompt };
