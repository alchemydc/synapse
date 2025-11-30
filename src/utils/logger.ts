// utils/logger.ts
const levels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = (process.env.LOG_LEVEL || "info").toLowerCase() as keyof typeof levels;
const currentLevelScore = levels[currentLevel] ?? levels.info;

export const logger = {
  info: (...args: any[]) => {
    if (levels.info >= currentLevelScore) console.log("[INFO]", ...args);
  },
  error: (...args: any[]) => {
    if (levels.error >= currentLevelScore) console.error("[ERROR]", ...args);
  },
  warn: (...args: any[]) => {
    if (levels.warn >= currentLevelScore) console.warn("[WARN]", ...args);
  },
  debug: (...args: any[]) => {
    if (levels.debug >= currentLevelScore) console.debug("[DEBUG]", ...args);
  },
};
