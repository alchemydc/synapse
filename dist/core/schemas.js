"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigestItemSchema = void 0;
// src/core/schemas.ts
const zod_1 = require("zod");
exports.DigestItemSchema = zod_1.z.object({
    headline: zod_1.z.string().describe("The channel name or topic title"),
    url: zod_1.z.string().describe("The URL to the source context"),
    summary: zod_1.z.string().describe("The digest content in markdown format"),
});
