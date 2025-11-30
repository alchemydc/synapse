"use strict";
// src/services/discourse/utils.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripHtml = stripHtml;
/**
 * Strip minimal HTML to recover readable plain text.
 * Not perfect, but sufficient for digest input.
 */
function stripHtml(html) {
    if (!html)
        return "";
    // remove script/style blocks first
    return html
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
        // remove discourse quotes to avoid misattribution
        .replace(/<aside[^>]+class=["']quote["'][\s\S]*?<\/aside>/gi, "")
        .replace(/<\/?[^>]+(>|$)/g, "")
        .replace(/\s+/g, " ")
        .trim();
}
