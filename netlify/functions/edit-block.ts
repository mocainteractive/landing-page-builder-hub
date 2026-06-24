import type { Handler } from "@netlify/functions";
import { editBlock } from "./utils/edit";
import { ANTHROPIC_KEY_HEADER, resolveKey } from "./utils/anthropic";
import { withDefaults } from "../../src/lib/tokens";

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

  const apiKey = resolveKey(event.headers[ANTHROPIC_KEY_HEADER]);
  if (!apiKey) {
    return json(503, {
      error: "Nessuna chiave Anthropic disponibile (configurala su Moca Hub).",
    });
  }

  let body: {
    blockType?: string;
    currentHtml?: string;
    comment?: string;
    tokens?: unknown;
  };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Corpo JSON non valido." });
  }

  if (!body.currentHtml || !body.comment) {
    return json(400, { error: "Parametri 'currentHtml' o 'comment' mancanti." });
  }

  try {
    const result = await editBlock({
      blockType: body.blockType || "section",
      currentHtml: body.currentHtml,
      comment: body.comment,
      tokens: withDefaults(body.tokens as never),
      apiKey,
    });
    return json(200, result);
  } catch (e) {
    return json(502, { error: e instanceof Error ? e.message : "Modifica fallita." });
  }
};
