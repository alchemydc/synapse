// services/llm/gemini.ts
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { Config } from "../../config";

function buildPrompt(messages: string[]): string {
  return [
    "Community Digest:",
    "Summarize the following Discord messages for key topics, decisions, and action items.",
    "",
    ...messages.map((m, i) => `[${i + 1}] ${m}`),
    "",
    "Digest:"
  ].join("\n");
}

function truncateMessages(messages: string[], maxChars: number): string[] {
  let total = 0;
  const out: string[] = [];
  for (const m of messages) {
    if (total + m.length > maxChars) break;
    out.push(m);
    total += m.length;
  }
  return out;
}

export async function summarize(messages: string[], config: Config): Promise<string> {
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
export { buildPrompt, truncateMessages };
