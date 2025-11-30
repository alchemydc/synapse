// src/services/discourse/utils.ts

/**
 * Strip minimal HTML to recover readable plain text.
 * Not perfect, but sufficient for digest input.
 */
export function stripHtml(html: string | undefined): string {
    if (!html) return "";
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
