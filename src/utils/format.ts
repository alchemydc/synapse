import { logger } from "./logger";

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
    // links [text](url) -> <url|text>
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "<$2|$1>")
    // lists normalization
    .replace(/^\s*\d+\.\s+/gm, "- ")
    .replace(/^\s*[•*]\s+/gm, "- ")
    .replace(/^\s{1,}-(\s+)/gm, "-$1")
    .replace(/([^\n])\n(-\s)/g, "$1\n\n$2")
    .replace(/\n{3,}/g, "\n\n");

  // Restore code blocks and inline code
  out = out.replace(/__FENCE_(\d+)__/g, (_m, i) => "```" + fences[+i] + "```");
  out = out.replace(/__INL_(\d+)__/g, (_m, i) => "`" + inlines[+i] + "`");
  
  return out;
}

export function truncateSection(text: string, max = 2800): string {
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

export function buildDigestBlocks(params: {
  summary: string;
  start: Date;
  end: Date;
  dateTitle: string;
}): any[][] {
  // Slack limit: 50 blocks per message. Use 45 as safe budget (5 block safety margin)
  const MAX_BLOCKS_PER_MESSAGE = 45;
  const MAX_SECTION_CHARS = Number(process.env.SECTION_CHAR_LIMIT) || 2800;

  let mrkdwn = normalizeToSlackMrkdwn(params.summary);
  
  if (process.env.LOG_LEVEL && process.env.LOG_LEVEL.toLowerCase() === "debug") {
    logger.debug("[DEBUG] buildDigestBlocks.mrkdwn.length", mrkdwn.length);
  }

  const range = `Time window: ${params.dateTitle} 00:00–${params.end.toISOString().slice(0,10)} 00:00 UTC`;

  // Start with header blocks
  const headerBlocks: any[] = [
    { type: "header", text: { type: "plain_text", text: `Community Digest — ${params.dateTitle} (UTC)` } },
    { type: "context", elements: [{ type: "mrkdwn", text: range }] },
    { type: "divider" },
  ];

  // Parse topics by detecting bold headers (converted from H2 markdown)
  // Pattern matches lines like: *[#channel-name](url)* or *Topic Title*
  const topicPattern = /^\*([^*\n]+)\*$/gm;
  const topics: Array<{ start: number; header: string }> = [];

  let match;
  while ((match = topicPattern.exec(mrkdwn)) !== null) {
    topics.push({ start: match.index, header: match[1] });
  }

  if (topics.length === 0) {
    // No topics found, treat entire content as single section
    const sectionText = truncateSection(mrkdwn, MAX_SECTION_CHARS);
    if (sectionText) {
      const blocks = [
        ...headerBlocks,
        { type: "section", text: { type: "mrkdwn", text: sectionText } },
      ];
      return [blocks];
    }
    return [headerBlocks];
  }

  // Build blocks for each topic, splitting into multiple messages when needed
  const HEADER_BLOCK_COUNT = headerBlocks.length;
  const availableBlockBudget = MAX_BLOCKS_PER_MESSAGE - HEADER_BLOCK_COUNT;
  
  const allBlockSets: any[][] = [];
  let currentBlocks = [...headerBlocks];
  
  for (let i = 0; i < topics.length; i++) {
    const start = topics[i].start;
    const end = i < topics.length - 1 ? topics[i + 1].start : mrkdwn.length;
    const topicContent = mrkdwn.slice(start, end).trim();
    
    // Create section block for this topic (truncate if needed)
    const sectionText = truncateSection(topicContent, MAX_SECTION_CHARS);
    
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
    if (i < topics.length - 1) {
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
