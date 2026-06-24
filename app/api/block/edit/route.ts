import { NextResponse } from "next/server";
import { editBlock } from "@/lib/edit";
import { ANTHROPIC_KEY_HEADER, resolveAnthropicKey } from "@/lib/anthropic";
import { withDefaults } from "@/lib/tokens";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const apiKey = resolveAnthropicKey(req.headers.get(ANTHROPIC_KEY_HEADER));
  if (!apiKey) {
    return NextResponse.json(
      { error: "Nessuna chiave Anthropic disponibile (configurala su Moca Hub)." },
      { status: 503 },
    );
  }

  let body: {
    blockType?: string;
    currentHtml?: string;
    comment?: string;
    tokens?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo JSON non valido." }, { status: 400 });
  }

  const { blockType, currentHtml, comment } = body;
  if (!currentHtml || !comment) {
    return NextResponse.json(
      { error: "Parametri 'currentHtml' o 'comment' mancanti." },
      { status: 400 },
    );
  }

  try {
    const result = await editBlock({
      blockType: blockType || "section",
      currentHtml,
      comment,
      tokens: withDefaults(body.tokens as never),
      apiKey,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Modifica fallita.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
