/**
 * Lightweight post-processing fallback to inject missing "Participants:" lines
 * when an LLM omits them from an attributed digest.
 *
 * This utility is intentionally conservative:
 * - It only adds lines for clusters that have at least one participant.
 * - It caps participant names using provided maxTopics cap.
 * - It tries to place the Participants line near matching content (signature words).
 */

import { TopicCluster } from "./topics";

/**
 * buildCompactParticipantString - produce compact list capped by max
 */
function buildCompactParticipantString(names: string[], max: number): string {
  if (!names || names.length === 0) return "";
  if (names.length <= max) return names.join(", ");
  const shown = names.slice(0, max).join(", ");
  const remaining = names.length - max;
  return `${shown} +${remaining}`;
}

/**
 * extractSignatureWords - small set of distinctive words from first message
 */
function extractSignatureWords(msgText: string): string[] {
  if (!msgText) return [];
  return msgText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 6);
}

/**
 * anyParticipantLineContains - case-insensitive check if a section's Participants lines
 * mention at least one of the participant names
 */
function anyParticipantLineContains(sectionText: string, participantNames: string[]): boolean {
  if (!participantNames || participantNames.length === 0) return false;
  const match = sectionText.match(/Participants:\s*(.+)$/im);
  if (!match) return false;
  const listed = match[1].toLowerCase();
  return participantNames.some((p) => listed.includes(p.toLowerCase()));
}

/**
 * injectMissingParticipants
 * @param summary original digest text
 * @param clusters topic clusters with participants
 * @param maxPerTopic cap for participants shown
 * @returns modified summary (or original if nothing inserted)
 */
export function injectMissingParticipants(
  summary: string,
  clusters: TopicCluster[],
  maxPerTopic = 6
): string {
  if (!summary || !clusters || clusters.length === 0) return summary;

  const sections = summary.split(/\n{2,}/).map((s) => s.trim());
  let changed = false;

  // For faster matching, prepare lowercased section text
  const sectionsLc = sections.map((s) => s.toLowerCase());

  for (const cluster of clusters) {
    if (!cluster.participants || cluster.participants.length === 0) continue;

    // If any section already lists these participants, skip
    const alreadyListed = sections.some((sec) => anyParticipantLineContains(sec, cluster.participants));
    if (alreadyListed) continue;

    // Build signature words from first message in cluster
    const firstMsg = cluster.messages && cluster.messages.length > 0 ? cluster.messages[0].content : "";
    const sigWords = extractSignatureWords(firstMsg);
    let placed = false;

    if (sigWords.length > 0) {
      // Try to find a section containing any signature word
      for (let i = 0; i < sections.length; i++) {
        const secLc = sectionsLc[i];
        if (!secLc) continue;
        const matches = sigWords.some((w) => secLc.includes(w));
        if (matches) {
          // Append Participants line to this section
          const partStr = buildCompactParticipantString(cluster.participants, maxPerTopic);
          sections[i] = sections[i] + "\nParticipants: " + partStr;
          sectionsLc[i] = sections[i].toLowerCase();
          changed = true;
          placed = true;
          break;
        }
      }
    }

    if (!placed) {
      // As fallback, append to last non-empty section
      for (let i = sections.length - 1; i >= 0; i--) {
        if (sections[i].trim().length > 0) {
          const partStr = buildCompactParticipantString(cluster.participants, maxPerTopic);
          sections[i] = sections[i] + "\nParticipants: " + partStr;
          sectionsLc[i] = sections[i].toLowerCase();
          changed = true;
          placed = true;
          break;
        }
      }
    }
  }

  if (!changed) return summary;

  // Reconstruct with double-newline separators
  return sections.join("\n\n");
}

export default injectMissingParticipants;
