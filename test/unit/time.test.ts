import { describe, it, expect } from "vitest";
import { getRunSchedule, WEEKEND_EXTRA_HOURS } from "../../src/utils/time";

// Fixed UTC dates at 13:00 — the hour Cloud Scheduler fires.
const AT = (isoDate: string) => new Date(`${isoDate}T13:00:00Z`);

const SUNDAY = AT("2026-08-09");
const MONDAY = AT("2026-08-10");
const TUESDAY = AT("2026-08-11");
const WEDNESDAY = AT("2026-08-12");
const THURSDAY = AT("2026-08-13");
const FRIDAY = AT("2026-08-14");
const SATURDAY = AT("2026-08-15");

describe("getRunSchedule", () => {
  describe("with SKIP_WEEKEND enabled", () => {
    it("skips Saturday", () => {
      expect(getRunSchedule(SATURDAY, true)).toEqual({ skip: true, extraHours: 0 });
    });

    it("skips Sunday", () => {
      expect(getRunSchedule(SUNDAY, true)).toEqual({ skip: true, extraHours: 0 });
    });

    it("extends Monday by the two skipped days", () => {
      expect(getRunSchedule(MONDAY, true)).toEqual({
        skip: false,
        extraHours: WEEKEND_EXTRA_HOURS,
      });
      expect(WEEKEND_EXTRA_HOURS).toBe(48);
    });

    it.each([
      ["Tuesday", TUESDAY],
      ["Wednesday", WEDNESDAY],
      ["Thursday", THURSDAY],
      ["Friday", FRIDAY],
    ])("runs %s with no extension", (_name, day) => {
      expect(getRunSchedule(day, true)).toEqual({ skip: false, extraHours: 0 });
    });

    it("uses UTC, not local time, to decide the weekday", () => {
      // 23:30 UTC Friday is already Saturday in UTC+2, but must still run.
      expect(getRunSchedule(new Date("2026-08-14T23:30:00Z"), true).skip).toBe(false);
      // 00:30 UTC Saturday is still Friday in UTC-5, but must still skip.
      expect(getRunSchedule(new Date("2026-08-15T00:30:00Z"), true).skip).toBe(true);
    });
  });

  describe("with SKIP_WEEKEND disabled", () => {
    it.each([
      ["Sunday", SUNDAY],
      ["Monday", MONDAY],
      ["Tuesday", TUESDAY],
      ["Wednesday", WEDNESDAY],
      ["Thursday", THURSDAY],
      ["Friday", FRIDAY],
      ["Saturday", SATURDAY],
    ])("restores plain daily behaviour on %s", (_name, day) => {
      expect(getRunSchedule(day, false)).toEqual({ skip: false, extraHours: 0 });
    });

    it("drops the Monday extension too, not just the weekend skip", () => {
      expect(getRunSchedule(MONDAY, false).extraHours).toBe(0);
    });
  });
});
