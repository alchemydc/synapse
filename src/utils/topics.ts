/**
 * src/utils/topics.ts
 *
 * Utilities to cluster Discord messages into lightweight "topic" windows
 * and extract participants for per-topic attribution in digests.
 */

import { MessageDTO } from "../services/discord";

const UNKNOWN_AUTHOR = "unknown";

export interface TopicCluster {
  id: number;
  channelId: string;
  start: string; // ISO timestamp
  end: string; // ISO timestamp
  messages: MessageDTO[];
  participants: string[]; // unique author display names in chronological order
}

/**
 * clusterMessages - group messages into topic windows by channel + time gap
 * @param messages unsorted array of MessageDTO
 * @param gapMinutes break cluster when gap (minutes) exceeded
 */
export function clusterMessages(messages: MessageDTO[], gapMinutes = 20): TopicCluster[] {
  if (!messages || messages.length === 0) return [];

  // Sort by timestamp ascending to produce globally chronological clusters.
  // This interleaves channels (Discord + Discourse) so the LLM sees time-ordered topics
  // and prevents one source from consuming the token budget before others.
  const sorted = [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const clusters: TopicCluster[] = [];
  let current: TopicCluster | null = null;
  let id = 1;
  const gapMs = gapMinutes * 60 * 1000;

  for (const msg of sorted) {
    const ts = new Date(msg.createdAt).getTime();

    if (!current) {
      current = {
        id: id++,
        channelId: msg.channelId,
        start: msg.createdAt,
        end: msg.createdAt,
        messages: [msg],
        participants: [],
      };
      continue;
    }

    const lastMsg = current.messages[current.messages.length - 1];
    const lastTs = new Date(lastMsg.createdAt).getTime();

    const channelChanged = msg.channelId !== current.channelId;
    const gapExceeded = ts - lastTs > gapMs;

    if (channelChanged || gapExceeded) {
      // finalize participants
      current.participants = extractParticipants(current);
      clusters.push(current);
      current = {
        id: id++,
        channelId: msg.channelId,
        start: msg.createdAt,
        end: msg.createdAt,
        messages: [msg],
        participants: [],
      };
    } else {
      current.messages.push(msg);
      current.end = msg.createdAt;
    }
  }

  if (current) {
    current.participants = extractParticipants(current);
    clusters.push(current);
  }

  return clusters;
}

/**
 * extractParticipants - return unique author names in chronological order
 */
export function extractParticipants(cluster: TopicCluster): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of cluster.messages) {
    const name = m.author || UNKNOWN_AUTHOR;
    if (!seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

/**
 * formatParticipantList - produce a compact comma-separated list capped by max
 * returns e.g. "alice, bob, carol +2"
 */
export function formatParticipantList(list: string[], max = 6): string {
  if (!list || list.length === 0) return "";
  if (list.length <= max) return list.join(", ");
  const shown = list.slice(0, max).join(", ");
  const remaining = list.length - max;
  return `${shown} +${remaining}`;
}
