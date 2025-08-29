// services/llm/gemini.ts
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { Config } from "../../config";
import { MessageDTO } from "../discord";
import { logger } from "../../utils/logger";

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
    "Digest:"
  ].join("\n");
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

// For testing
export { buildPrompt, truncateMessages, formatMessageLine };
