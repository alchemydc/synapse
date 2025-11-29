"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
// utils/logger.ts
const levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
const currentLevel = (process.env.LOG_LEVEL || "info").toLowerCase();
const currentLevelScore = levels[currentLevel] ?? levels.info;
exports.logger = {
    info: (...args) => {
        if (levels.info >= currentLevelScore)
            console.log("[INFO]", ...args);
    },
    error: (...args) => {
        if (levels.error >= currentLevelScore)
            console.error("[ERROR]", ...args);
    },
    warn: (...args) => {
        if (levels.warn >= currentLevelScore)
            console.warn("[WARN]", ...args);
    },
    debug: (...args) => {
        if (levels.debug >= currentLevelScore)
            console.debug("[DEBUG]", ...args);
    },
};
