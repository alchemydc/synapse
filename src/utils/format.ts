import { logger } from "./logger";

// utils/format.ts

// Normalize generic markdown to Slack mrkdwn
const DEBUG_SLICE = 1200;
export function normalizeToSlackMrkdwn(md: string): string {
  // Protect fenced code blocks
  const fences: string[] = [];
  md = md.replace(/```([\s\S]*?)```/g, (_m, p1) => {
    fences.push(p1);
    return `__FENCE_${fences.length - 1}__`;
  });
  // Protect inline code
  const inlines: string[] = [];
  md = md.replace(/`([^`]+)`/g, (_m, p1) => {
    inlines.push(p1);
    return `__INL_${inlines.length - 1}__`;
  });

  let out = md
    // headings -> bold lines
    .replace(/^#{1,6}\s+(.*)$/gm, "*$1*")
    // bold: **text** and __text__ -> *text*
    .replace(/\*\*([^*]+)\*\*/g, "*$1*")
    .replace(/__([^_]+)__/g, "*$1*")
    // ensure label lines like **Key Topics:** -> *Key Topics:*
    .replace(/^\*([^*]+:)\*$/gm, "*$1*")
    // links [text](url) -> <url|text>
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "<$2|$1>")
    // lists normalization...
    .replace(/^\s*\d+\.\s+/gm, "- ")
    .replace(/^\s*[•*]\s+/gm, "- ")
    .replace(/^\s{1,}-(\s+)/gm, "-$1")
    .replace(/([^\n])\n(-\s)/g, "$1\n\n$2")
    .replace(/\n{3,}/g, "\n\n")
    // Normalize label emphasis around colon-terminated labels to single *
    .replace(/(^|\n)-\s+\*{1,2}([^*\n]+:)\*{1,2}(?=\s|$)/g, "$1- *$2*")
    .replace(/(^|\n)\*{2}([^*\n]+:)\*{1,2}(?=\s|$)/g, "$1*$2*")
    .replace(/(^|\n)\*{1,2}([^*\n]+:)\*{2}(?=\s|$)/g, "$1*$2*")
    .replace(/\*\*([^*\n]+:)\*\*/g, "*$1*");

  // Restore code blocks and inline code
  out = out.replace(/__FENCE_(\d+)__/g, (_m, i) => "```" + fences[+i] + "```");
  out = out.replace(/__INL_(\d+)__/g, (_m, i) => "`" + inlines[+i] + "`");
  return out;
}

export function truncateSection(text: string, max = 2800): string {
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

export function stripLeadingDigestTitle(s: string): string {
  // Remove a leading "Community Digest" line (with optional markdown, date, etc.)
  return s.replace(
    /^\s*(?:[#*]+\s*)?Community\s+Digest(?:\s*-\s*\d{4}-\d{2}-\d{2})?\s*:?\s*\n?/i,
    ""
  ).replace(/^\*\s*\n/, "").trimStart();
}

export function buildDigestBlocks(params: {
  summary: string;
  start: Date; // UTC
  end: Date;   // UTC
  dateTitle: string; // YYYY-MM-DD (UTC)
}): any[] {
  const cleaned = stripLeadingDigestTitle(params.summary);
  if (process.env.LOG_LEVEL && process.env.LOG_LEVEL.toLowerCase() === "debug") {
    logger.debug("[DEBUG] buildDigestBlocks.cleaned", cleaned.slice(0, DEBUG_SLICE));
  }
  const mrkdwn = normalizeToSlackMrkdwn(cleaned);
  if (process.env.LOG_LEVEL && process.env.LOG_LEVEL.toLowerCase() === "debug") {
    logger.debug("[DEBUG] buildDigestBlocks.mrkdwn", mrkdwn.slice(0, DEBUG_SLICE));
  }
  const range = `Time window: ${params.dateTitle} 00:00–${params.end.toISOString().slice(0,10)} 00:00 UTC`;

  const blocks: any[] = [
    { type: "header", text: { type: "plain_text", text: `Community Digest — ${params.dateTitle} (UTC)` } },
    { type: "context", elements: [{ type: "mrkdwn", text: range }] },
    { type: "divider" },
  ];

  // If the digest doesn't include explicit sectioning, preserve legacy behavior:
  // single Summary section with the full content under "*Summary*"
  if (!/^\s*\*?Summary\*?/im.test(mrkdwn)) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: `*Summary*\n${truncateSection(mrkdwn)}` } });
    return blocks;
  }

  // Split digest into logical sections by two-or-more newlines.
  // Each section may end with a "Participants: ..." line which we render as a separate context block.
  const sections = mrkdwn.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);

  for (const sec of sections) {
    // Try to extract a trailing Participants line
    const lines = sec.split("\n").map(l => l.trim()).filter(Boolean);
    let participantsLine: string | null = null;
    // check last line for a Participants: prefix (case-insensitive)
    const last = lines[lines.length - 1] || "";
    const match = last.match(/^\s*Participants:\s*(.+)$/i);
    if (match) {
      participantsLine = match[1].trim();
      // remove the last line from the section text
      lines.pop();
    }

    const sectionText = truncateSection(lines.join("\n\n"));

    if (sectionText) {
      blocks.push({ type: "section", text: { type: "mrkdwn", text: sectionText } });
    }

    if (participantsLine) {
      // render participants in a smaller context block
      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: `*Participants:* ${participantsLine}` }],
      });
    }
  }

  return blocks;
}

// Legacy fallback
export function formatDigest(summary: string): string {
  return `*Community Digest*\n${summary}`;
}
