"use strict";
/**
 * src/utils/llm_sanitize.ts
 *
 * Utilities to sanitize LLM-generated digest text:
 * - remove leading meta/preamble lines the model sometimes emits (e.g., "Okay, I understand...")
 * - preserve valid bracketed source labels and digest content
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeLLMOutput = sanitizeLLMOutput;
const PREAMBLE_PATTERNS = [
    /^\s*okay[\.,]?\s*/i,
    /^\s*i\s+(understand|will|will summarize|will wait|will now)/i,
    /^\s*sure[\.,]?\s*/i,
    /^\s*since the input/i,
    /i will wait for the full input/i,
    /i will summarize/i,
    /^\s*here'?s the summary/i,
    /^\s*please\s+provide/i,
    /^\s*here\s+(is|are)\s+(the\s+)?/i,
    /\bdisc-topic-\d+\b/gi, // Remove disc-topic artifacts
];
/**
 * sanitizeLLMOutput - remove common LLM meta preambles and leading acknowledgements.
 * Strategy:
 *  - If the summary begins with a short paragraph (<6 lines) containing any of the
 *    PREAMBLE_PATTERNS, strip that paragraph.
 *  - Also strip stray single-line acknowledgements anywhere at the start that match patterns.
 */
function sanitizeLLMOutput(text) {
    if (!text || typeof text !== "string")
        return text || "";
    const lines = text.split("\n");
    // Fast path: if first non-empty line looks like a bracketed source or a header, assume no preamble.
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i].trim();
        if (l === "")
            continue;
        if (l.startsWith("[") || l.match(/^\*{1,2}Community\s+Digest/i) || l.match(/^[A-Z].*:/)) {
            return text.trim();
        }
        break;
    }
    // Identify first paragraph (block of contiguous non-empty lines)
    let idx = 0;
    while (idx < lines.length && lines[idx].trim() === "")
        idx++;
    let paraStart = idx;
    while (idx < lines.length && lines[idx].trim() !== "")
        idx++;
    const paraEnd = idx; // exclusive
    const paraLines = lines.slice(paraStart, paraEnd);
    const paraText = paraLines.join(" ").slice(0, 800); // examine first ~800 chars
    // If paragraph matches any preamble pattern, remove it.
    const matchesPreamble = PREAMBLE_PATTERNS.some((pat) => pat.test(paraText));
    if (matchesPreamble) {
        // drop the paragraph
        const remaining = lines.slice(paraEnd).join("\n").trim();
        return remaining;
    }
    // Additionally, remove single leading lines that match known acknowledgement phrases
    let i = 0;
    while (i < lines.length) {
        const l = lines[i].trim();
        if (l === "") {
            i++;
            continue;
        }
        // if this single line matches a preamble token, skip it and continue
        if (PREAMBLE_PATTERNS.some((pat) => pat.test(l))) {
            i++;
            continue;
        }
        break;
    }
    if (i > 0) {
        text = lines.slice(i).join("\n").trim();
    }
    // Final pass: remove disc-topic-N artifacts and legacy --- separators
    text = text.replace(/\bdisc-topic-\d+\b/g, "");
    // Remove legacy '--- ##' patterns that appear when LLM mixes old and new formats
    // Match --- with optional spaces before and after, followed by ##
    text = text.replace(/\s+---\s+##\s+/g, "\n\n## ");
    // Match standalone --- separators (not part of --- ##)
    text = text.replace(/\s+---\s+/g, "\n\n");
    text = text.replace(/\s+---$/gm, ""); // --- at end of line
    text = text.replace(/^---\s+/gm, ""); // --- at start of line
    // Clean up excessive whitespace
    text = text.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n");
    return text.trim();
}
exports.default = sanitizeLLMOutput;
