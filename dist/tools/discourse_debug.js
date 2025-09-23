"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/tools/discourse_debug.ts
const dotenv_1 = __importDefault(require("dotenv"));
const node_fetch_1 = __importDefault(require("node-fetch"));
dotenv_1.default.config();
const BASE = (() => {
    const raw = process.env.DISCOURSE_BASE_URL;
    if (!raw)
        return undefined;
    return raw.replace(/\/+$/, ""); // strip trailing slash
})();
const API_KEY = process.env.DISCOURSE_API_KEY;
const API_USERNAME = process.env.DISCOURSE_API_USERNAME;
function headerVal(headers, name) {
    // node-fetch Headers.get is case-insensitive, but be defensive
    if (!headers || typeof headers.get !== "function")
        return undefined;
    return headers.get(name);
}
async function fetchJSON(path) {
    if (!BASE)
        throw new Error("DISCOURSE_BASE_URL not set");
    const url = `${BASE}${path}`;
    const headers = {
        "Api-Key": API_KEY || "",
        "Api-Username": API_USERNAME || "",
        Accept: "application/json",
        "User-Agent": "synapse-digest-bot/1.0",
    };
    let res;
    try {
        res = await (0, node_fetch_1.default)(url, { headers });
    }
    catch (err) {
        console.error(`Network error fetching ${url}:`, err);
        process.exit(1);
    }
    const rlLimit = headerVal(res.headers, "x-ratelimit-limit") || headerVal(res.headers, "X-RateLimit-Limit");
    const rlRemaining = headerVal(res.headers, "x-ratelimit-remaining") || headerVal(res.headers, "X-RateLimit-Remaining");
    const rlReset = headerVal(res.headers, "x-ratelimit-reset") || headerVal(res.headers, "X-RateLimit-Reset");
    if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
            console.error(`Auth failed (status ${res.status}). Check DISCOURSE_API_KEY and DISCOURSE_API_USERNAME permissions.`);
            process.exit(1);
        }
        if (res.status === 429) {
            console.error(`Rate limited (429). Headers: limit=${rlLimit} remaining=${rlRemaining} reset=${rlReset}`);
            process.exit(1);
        }
        const body = await res.text().catch(() => "<non-text body>");
        console.error(`Request failed ${res.status} ${res.statusText}:`, body);
        process.exit(1);
    }
    const json = await res.json().catch((err) => {
        console.error(`Failed to parse JSON from ${url}:`, err);
        process.exit(1);
    });
    return { json, rateLimit: { rlLimit, rlRemaining, rlReset }, status: res.status };
}
async function main() {
    if (!BASE || !API_KEY || !API_USERNAME) {
        console.error("Missing required env vars. Please set DISCOURSE_BASE_URL, DISCOURSE_API_KEY, and DISCOURSE_API_USERNAME (or add to .env).");
        console.error("Example:");
        console.error("DISCOURSE_BASE_URL=https://forum.example.org");
        console.error("DISCOURSE_API_KEY=your_key_here");
        console.error("DISCOURSE_API_USERNAME=system");
        process.exit(1);
    }
    console.log("Discourse debug starting for", BASE);
    console.log("Api-Username:", API_USERNAME);
    // /site.json
    const siteResp = await fetchJSON("/site.json");
    console.log("\n/site.json:");
    if (siteResp.json && siteResp.json.site) {
        console.log("  title:", siteResp.json.site.title);
        console.log("  description:", siteResp.json.site.description || "<none>");
        console.log("  contact:", siteResp.json.contact_email || "<none>");
    }
    else {
        console.log("  unexpected site.json shape - dumping keys:", Object.keys(siteResp.json || {}));
    }
    console.log("  Rate limit headers:", siteResp.rateLimit);
    // /latest.json
    const latestResp = await fetchJSON("/latest.json");
    console.log("\n/latest.json sample topics:");
    const topics = (latestResp.json && latestResp.json.topic_list && latestResp.json.topic_list.topics) ||
        latestResp.json.topics ||
        [];
    if (!Array.isArray(topics) || topics.length === 0) {
        console.log("  No topics found in /latest.json response.");
    }
    else {
        const sample = topics.slice(0, 5);
        for (const t of sample) {
            // common fields: id, title, created_at, posts_count, last_posted_at
            console.log(`  - id=${t.id} posts=${t.posts_count ?? t.post_count ?? "?"} created_at=${t.created_at ?? t.last_posted_at ?? "?"} title="${t.title}"`);
        }
    }
    console.log("  Rate limit headers:", latestResp.rateLimit);
    // /categories.json (optional)
    try {
        const catResp = await fetchJSON("/categories.json");
        const cats = catResp.json && catResp.json.category_list && catResp.json.category_list.categories;
        if (Array.isArray(cats) && cats.length > 0) {
            console.log("\n/categories.json (first 10):");
            for (const c of cats.slice(0, 10)) {
                console.log(`  - id=${c.id} name=${c.name} topic_count=${c.topic_count ?? "?"}`);
            }
            console.log("  Rate limit headers:", catResp.rateLimit);
        }
        else {
            console.log("\n/categories.json returned no categories (or unexpected shape).");
        }
    }
    catch (err) {
        // If categories not accessible, don't fail entirely
        console.warn("Skipping categories.json (not available or accessible):", err?.message || err);
    }
    console.log("\nDiscourse debug completed successfully.");
    process.exit(0);
}
main().catch((e) => {
    console.error("Discourse debug failed:", e);
    process.exit(1);
});
