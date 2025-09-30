// src/utils/topic_priority.ts

/**
 * Parse and sort digest topics by priority based on emoji prefixes.
 * This post-processing step runs after all per-source LLM calls are combined.
 */

export interface ParsedTopic {
  header: string;      // Full header line with emoji (e.g., "🔴 Security Alert")
  content: string;     // Full topic content including header
  emoji: string | null; // Extracted emoji or null
  priority: number;    // Lower = higher priority (1 is highest)
}

const EMOJI_PRIORITY: Record<string, number> = {
  '🔴': 1,  // Security
  '💰': 2,  // Funding
  '🏛️': 3,  // Governance
  '💬': 4,  // Customer Feedback
  '📈': 5,  // Adoption
  '🚀': 6,  // Growth
};

/**
 * Parse topics from combined summary text.
 * Assumes topics are separated by markdown headers (converted to bold in mrkdwn).
 */
export function parseTopicsFromSummary(summary: string): ParsedTopic[] {
  if (!summary) return [];

  const topics: ParsedTopic[] = [];
  
  // Split by bold headers that start a line (pattern: *text*)
  // This matches the output after normalizeToSlackMrkdwn converts ## headers to *text*
  const headerPattern = /^\*([^*\n]+)\*$/gm;
  
  const matches: Array<{ header: string; index: number }> = [];
  let match;
  while ((match = headerPattern.exec(summary)) !== null) {
    matches.push({ header: match[1], index: match.index });
  }

  if (matches.length === 0) {
    // No headers found, treat entire summary as one topic
    return [{
      header: "Summary",
      content: summary,
      emoji: null,
      priority: 99,
    }];
  }

  // Extract topics between headers
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i < matches.length - 1 ? matches[i + 1].index : summary.length;
    const content = summary.slice(start, end).trim();
    
    const header = matches[i].header;
    const emoji = extractEmoji(header);
    const priority = emoji ? (EMOJI_PRIORITY[emoji] || 10) : 99;

    topics.push({
      header,
      content,
      emoji,
      priority,
    });
  }

  return topics;
}

/**
 * Extract emoji from the start of a string.
 */
function extractEmoji(text: string): string | null {
  const emojiPattern = /^(🔴|💰|🏛️|💬|📈|🚀)/;
  const match = text.match(emojiPattern);
  return match ? match[1] : null;
}

/**
 * Sort topics by priority (lower number = higher priority).
 */
export function sortTopicsByPriority(topics: ParsedTopic[]): ParsedTopic[] {
  return [...topics].sort((a, b) => a.priority - b.priority);
}

/**
 * Reconstruct summary from sorted topics.
 */
export function reconstructSummary(topics: ParsedTopic[]): string {
  return topics.map(t => t.content).join("\n\n");
}

/**
 * Convenience function: parse, sort, and reconstruct in one call.
 */
export function sortAndReconstructSummary(summary: string): string {
  const topics = parseTopicsFromSummary(summary);
  const sorted = sortTopicsByPriority(topics);
  return reconstructSummary(sorted);
}
