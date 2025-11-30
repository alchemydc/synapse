import { logger } from "./logger";

// Normalize generic markdown to Slack mrkdwn
export function normalizeToSlackMrkdwn(md: string): string {
  // Convert common Markdown into Slack mrkdwn in a conservative, non-destructive way.
  // We intentionally avoid placeholder collisions and aggressive transforms.
  let out = String(md)
    // Links: [text](https://...) -> <https://...|text>
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "<$2|$1>")
    // Headings: convert to bold since Slack doesn't support header levels
    .replace(/^#{1,6}\s+(.*)$/gm, "*$1*")
    // Bold: **text** -> *text*
    .replace(/\*\*([^*]+)\*\*/g, "*$1*")
    // Note: avoid transforming __text__ to prevent collisions with any literal underscores
    // Lists normalization
    .replace(/^\s*\d+\.\s+/gm, "- ")
    .replace(/^\s*[•*]\s+/gm, "- ")
    .replace(/^\s{1,}-(\s+)/gm, "-$1")
    .replace(/([^\n])\n(-\s)/g, "$1\n\n$2")
    // Collapse excessive blank lines
    .replace(/\n{3,}/g, "\n\n");

  return out;
}

export function truncateSection(text: string, max = 2800): string {
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

import { DigestItem } from "../core/schemas";

// ... imports

export function buildDigestBlocks(params: {
  items: (string | DigestItem)[];
  start: Date;
  end: Date;
  dateTitle: string;
}): any[][] {
  // Slack limit: 50 blocks per message. Use 45 as safe budget (5 block safety margin)
  const MAX_BLOCKS_PER_MESSAGE = 45;
  const MAX_SECTION_CHARS = Number(process.env.SECTION_CHAR_LIMIT) || 2800;

  if (process.env.LOG_LEVEL && process.env.LOG_LEVEL.toLowerCase() === "debug") {
    logger.debug("[DEBUG] buildDigestBlocks items count:", params.items.length);
  }

  const range = `Time window: ${params.dateTitle} 00:00–${params.end.toISOString().slice(0, 10)} 00:00 UTC`;

  // Start with header blocks
  const headerBlocks: any[] = [
    { type: "header", text: { type: "plain_text", text: `Community Digest — ${params.dateTitle} (UTC)` } },
    { type: "context", elements: [{ type: "mrkdwn", text: range }] },
    { type: "divider" },
  ];

  const HEADER_BLOCK_COUNT = headerBlocks.length;
  const availableBlockBudget = MAX_BLOCKS_PER_MESSAGE - HEADER_BLOCK_COUNT;

  const allBlockSets: any[][] = [];
  let currentBlocks = [...headerBlocks];

  for (let i = 0; i < params.items.length; i++) {
    const item = params.items[i];
    let sectionContent = "";

    if (typeof item === 'string') {
      sectionContent = normalizeToSlackMrkdwn(item);
    } else {
      const header = `*<${item.url}|${item.headline}>*`;
      const body = normalizeToSlackMrkdwn(item.summary);
      sectionContent = `${header}\n\n${body}`;
    }

    // Create section block for this topic (truncate if needed)
    const sectionText = truncateSection(sectionContent, MAX_SECTION_CHARS);

    if (!sectionText) continue;

    const topicBlock = { type: "section", text: { type: "mrkdwn", text: sectionText } };

    // Check if adding this topic would exceed the budget
    const wouldExceedBudget = (currentBlocks.length - HEADER_BLOCK_COUNT) + 1 > availableBlockBudget;

    if (wouldExceedBudget && currentBlocks.length > HEADER_BLOCK_COUNT) {
      // Save current block set and start a new one
      allBlockSets.push(currentBlocks);
      currentBlocks = [
        { type: "header", text: { type: "plain_text", text: `Community Digest — ${params.dateTitle} (UTC) [continued]` } },
        { type: "context", elements: [{ type: "mrkdwn", text: range }] },
        { type: "divider" },
      ];
    }

    // Add topic block and divider
    currentBlocks.push(topicBlock);

    // Add divider between topics (but not after the last one in a set)
    if (i < params.items.length - 1) {
      currentBlocks.push({ type: "divider" });
    }
  }

  // Add final block set
  if (currentBlocks.length > HEADER_BLOCK_COUNT) {
    allBlockSets.push(currentBlocks);
  }

  return allBlockSets.length > 0 ? allBlockSets : [headerBlocks];
}

// Legacy fallback for plain text
export function formatDigest(summary: string): string {
  return `*Community Digest*\n${summary}`;
}
