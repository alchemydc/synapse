// src/core/schemas.ts
import { z } from "zod";

export const DigestItemSchema = z.object({
    headline: z.string().describe("The channel name or topic title, exactly as given in the prompt CONTEXT line"),
    url: z.string().describe("The URL to the source context, exactly as given in the prompt URL line"),
    summary: z.string().describe("Concise markdown bullets covering the key discussion points, decisions, and action items, attributing statements to participants by name"),
});

export type DigestItem = z.infer<typeof DigestItemSchema>;
