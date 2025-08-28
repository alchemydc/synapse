"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
// utils/logger.ts
exports.logger = {
    info: (...args) => console.log("[INFO]", ...args),
    error: (...args) => console.error("[ERROR]", ...args),
    warn: (...args) => console.warn("[WARN]", ...args),
    debug: (...args) => console.debug("[DEBUG]", ...args),
};
