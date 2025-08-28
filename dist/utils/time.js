"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDigestWindow = getDigestWindow;
// utils/time.ts
function getDigestWindow(hours) {
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
    return { start, end };
}
