import dotenv from "dotenv";
dotenv.config();

import fetch from "node-fetch";

const API_KEY = process.env.GEMINI_API_KEY;
const ENDPOINT = "https://generativelanguage.googleapis.com/v1/models";

async function listModels() {
  if (!API_KEY) {
    console.error("GEMINI_API_KEY not set. Set it in your .env or run: GEMINI_API_KEY=*** npm run models:list");
    process.exit(1);
  }
  const url = `${ENDPOINT}?key=${API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Failed to fetch models:", res.status, await res.text());
      process.exit(1);
    }
    const data = await res.json() as { models?: Array<{ name: string; description?: string }> };
    if (!data.models || !Array.isArray(data.models)) {
      console.error("No models found in response.");
      process.exit(1);
    }
    console.log("Available Gemini models:");
    for (const model of data.models) {
      console.log(`- ${model.name} (${model.description || "no description"})`);
    }
  } catch (err) {
    console.error("Error fetching models:", err);
    process.exit(1);
  }
}

listModels();
