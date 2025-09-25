/**
 * src/utils/participants_dedupe.ts
 *
 * Collapse multiple 'Participants:' lines that may appear inside a single topic section
 * produced by the LLM. Keeps the first Participants line and removes subsequent ones
 * within the same section. Sections are determined by blank-line separators.
 */

export function collapseDuplicateParticipants(summary: string): string {
  if (!summary || typeof summary !== "string") return summary || "";

  // Split into sections by two-or-more newlines (preserves legacy grouping)
  const sections = summary.split(/\n{2,}/).map((s) => s.trim());

  const normalized = sections.map((sec) => {
    if (!sec) return sec;
    const lines = sec.split("\n").map((l) => l.trim());
    const participantIndices: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (/^Participants:\s*/i.test(lines[i])) {
        participantIndices.push(i);
      }
    }
    if (participantIndices.length <= 1) return sec;
    // Keep first Participants line, remove the rest
    const keepIndex = participantIndices[0];
    const filtered = lines.filter((_, idx) => {
      if (idx === keepIndex) return true;
      if (participantIndices.includes(idx)) return false;
      return true;
    });
    return filtered.join("\n");
  });

  // Reconstruct using double-newline separators
  return normalized.filter(Boolean).join("\n\n");
}

export default collapseDuplicateParticipants;
