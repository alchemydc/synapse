// utils/time.ts

// Sat + Sun: the two runs the weekend skip suppresses. Monday's window is
// extended by exactly this much so the skipped days are covered with no gap.
export const WEEKEND_EXTRA_HOURS = 48;

// Decides whether this run happens at all, and how far back it looks.
// Weekday is read in UTC: the job fires at 13:00 UTC, far from any midnight
// boundary, so no populated timezone disagrees about which day it is.
// `skipWeekend` gates the whole policy — false restores plain daily behaviour
// (weekend runs happen AND Monday gets no extension).
export function getRunSchedule(
  now: Date,
  skipWeekend: boolean
): { skip: boolean; extraHours: number } {
  if (!skipWeekend) return { skip: false, extraHours: 0 };

  const day = now.getUTCDay(); // 0 = Sun, 1 = Mon, 6 = Sat
  if (day === 0 || day === 6) return { skip: true, extraHours: 0 };

  return { skip: false, extraHours: day === 1 ? WEEKEND_EXTRA_HOURS : 0 };
}
