// src/core/schemas.ts
import { z } from "zod";

export const DigestItemSchema = z.object({
    headline: z.string().describe("The channel name or topic title"),
    url: z.string().describe("The URL to the source context"),
    summary: z.string().describe("The digest content in markdown format"),
});

export type DigestItem = z.infer<typeof DigestItemSchema>;
