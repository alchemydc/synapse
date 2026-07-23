// src/core/schemas.ts
import { z } from "zod";

export const ImportanceSchema = z.enum(["high", "medium", "low"]);

export type Importance = z.infer<typeof ImportanceSchema>;

// Shape requested from the LLM. URLs are never requested from the model;
// per-conversation links are resolved from firstMessageIndex by the processor.
export const LlmSummarySchema = z.object({
    headline: z.string().describe("The channel name or topic title, exactly as given in the prompt CONTEXT line"),
    importance: ImportanceSchema.describe("Overall importance of this conversation group per the IMPORTANCE RATING rubric in the prompt"),
    topics: z.array(z.object({
        title: z.string().describe("Short label for this distinct conversation, max ~8 words"),
        firstMessageIndex: z.number().int().describe("The [i] number of the message where this conversation started"),
        summary: z.string().describe("1-3 one-sentence markdown bullets covering the key points, decisions, and action items, attributing statements to participants by name"),
    })).describe("Distinct conversations found in the messages, most important first"),
});

export type LlmSummary = z.infer<typeof LlmSummarySchema>;

// Downstream contract consumed by the pipeline and formatters.
export const DigestItemSchema = z.object({
    headline: z.string().describe("The channel name or topic title, exactly as given in the prompt CONTEXT line"),
    url: z.string().describe("The URL to the source context, exactly as given in the prompt URL line"),
    summary: z.string().describe("Concise markdown bullets covering the key discussion points, decisions, and action items, attributing statements to participants by name"),
    importance: ImportanceSchema.optional(),
});

export type DigestItem = z.infer<typeof DigestItemSchema>;
