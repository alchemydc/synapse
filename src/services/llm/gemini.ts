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
    "Sections: Decisions, Action Items, Links. For each topic, start with a single title line and then concise bullets; do not add a separate 'Key Topics' heading.",
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
  parts.push("For each topic, produce concise bullets. If there are Decisions, Action Items, or Links, label those sections accordingly. Start each topic with a single title line; do not include an extra 'Key Topics' heading.");
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

/**
 * truncateClusters - reduce messages across clusters to fit a global character budget.
 * Returns new clusters with messages trimmed in chronological order until budget exhausted.
 * Participants are preserved from original cluster (TODO: recompute from truncated messages).
 */
function truncateClusters(clusters: TopicCluster[], maxChars: number): TopicCluster[] {
  if (!clusters || clusters.length === 0) return [];
  let total = 0;
  const result: TopicCluster[] = [];

  outer: for (const c of clusters) {
    const keptMessages: MessageDTO[] = [];
    for (const m of c.messages) {
      const len = m.content ? m.content.length : 0;
      if (total + len > maxChars) {
        if (keptMessages.length === 0) {
          // No room for any message in this cluster; stop processing further clusters.
          break outer;
        } else {
          // Partial cluster preserved; stop after this cluster.
          result.push({ ...c, messages: keptMessages, participants: c.participants });
          break outer;
        }
      }
      keptMessages.push(m);
      total += len;
    }
    if (keptMessages.length > 0) {
      result.push({ ...c, messages: keptMessages, participants: c.participants });
    }
    if (total >= maxChars) break;
  }

  return result;
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

  // Build prompt from clusters and truncate to token budget.
  const maxChars = config.MAX_SUMMARY_TOKENS * 4;
  const truncatedClusters = truncateClusters(clusters, maxChars);
  let prompt = buildAttributedPrompt(truncatedClusters, config);

  // If truncation occurred, append a short note so the LLM knows input was truncated.
  const truncatedOccurred =
    truncatedClusters.length !== clusters.length ||
    truncatedClusters.some((tc, idx) => (clusters[idx] ? tc.messages.length !== clusters[idx].messages.length : true));
  if (truncatedOccurred) {
    prompt += "\n\n[Note: input truncated to fit token budget]";
  }

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
