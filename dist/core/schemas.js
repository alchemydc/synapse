"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigestItemSchema = void 0;
// src/core/schemas.ts
const zod_1 = require("zod");
exports.DigestItemSchema = zod_1.z.object({
    headline: zod_1.z.string().describe("The channel name or topic title, exactly as given in the prompt CONTEXT line"),
    url: zod_1.z.string().describe("The URL to the source context, exactly as given in the prompt URL line"),
    summary: zod_1.z.string().describe("Concise markdown bullets covering the key discussion points, decisions, and action items, attributing statements to participants by name"),
});
