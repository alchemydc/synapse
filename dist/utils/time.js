"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDigestWindow = getDigestWindow;
exports.getUtcDailyWindowFrom = getUtcDailyWindowFrom;
// utils/time.ts
function getDigestWindow(hours) {
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
    return { start, end };
}
// Returns UTC daily window (midnight to midnight) for a given UTC date
function getUtcDailyWindowFrom(candidateUtc) {
    const y = candidateUtc.getUTCFullYear();
    const m = candidateUtc.getUTCMonth();
    const d = candidateUtc.getUTCDate();
    const start = new Date(Date.UTC(y, m, d, 0, 0, 0));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const dateTitle = start.toISOString().slice(0, 10);
    return { start, end, dateTitle };
}
