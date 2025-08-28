// utils/time.ts
export function getDigestWindow(hours: number): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  return { start, end };
}

// Returns UTC daily window (midnight to midnight) for a given UTC date
export function getUtcDailyWindowFrom(candidateUtc: Date): { start: Date; end: Date; dateTitle: string } {
  const y = candidateUtc.getUTCFullYear();
  const m = candidateUtc.getUTCMonth();
  const d = candidateUtc.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const dateTitle = start.toISOString().slice(0, 10);
  return { start, end, dateTitle };
}
