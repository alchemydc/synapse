// utils/format.ts

// Normalize generic markdown to Slack mrkdwn
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
  const mrkdwn = normalizeToSlackMrkdwn(cleaned);
  const range = `Time window: ${params.dateTitle} 00:00–${params.end.toISOString().slice(0,10)} 00:00 UTC`;
  return [
    { type: "header", text: { type: "plain_text", text: `Community Digest — ${params.dateTitle} (UTC)` } },
    { type: "context", elements: [{ type: "mrkdwn", text: range }] },
    { type: "divider" },
    { type: "section", text: { type: "mrkdwn", text: `*Summary*\n${truncateSection(mrkdwn)}` } }
  ];
}

// Legacy fallback
export function formatDigest(summary: string): string {
  return `*Community Digest*\n${summary}`;
}
