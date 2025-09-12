/**
 * src/utils/topic_refine.ts
 *
 * Scaffold for future semantic clustering / refinement of topic clusters.
 * Currently provides a no-op API and documentation for planned behavior.
 */

import { TopicCluster } from "./topics";

/**
 * refineClusters - placeholder for future semantic merging of adjacent clusters.
 * Current implementation returns clusters unchanged.
 *
 * Planned heuristic (not yet implemented):
 * - For each pair of adjacent clusters in the same channel compute Jaccard overlap
 *   over token sets of their messages (stopwords removed).
 * - Merge clusters if overlap >= 0.4 or share >= 3 uncommon tokens.
 * - Aim for linear scan merging to preserve chronology.
 */
export function refineClusters(clusters: TopicCluster[]): TopicCluster[] {
  // TODO: implement semantic merging using bag-of-words or embeddings.
  return clusters;
}
