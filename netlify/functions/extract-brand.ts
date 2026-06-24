import type { Handler } from "@netlify/functions";
import { extractBrand } from "./utils/brand";
import { ANTHROPIC_KEY_HEADER, resolveKey } from "./utils/anthropic";

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, body: "" };
  if (event.httpMethod !== "POST") return json(405, { error: "Metodo non consentito." });

  let url: unknown;
  try {
    url = JSON.parse(event.body || "{}").url;
  } catch {
    return json(400, { error: "Corpo JSON non valido." });
  }
  if (!url || typeof url !== "string") {
    return json(400, { error: "Parametro 'url' mancante." });
  }

  // Per-client key from the Hub (header), with local env fallback.
  const apiKey = resolveKey(event.headers[ANTHROPIC_KEY_HEADER]);

  try {
    const result = await extractBrand(url, apiKey);
    return json(200, result);
  } catch (e) {
    return json(502, { error: e instanceof Error ? e.message : "Estrazione fallita." });
  }
};
