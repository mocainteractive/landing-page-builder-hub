import { NextResponse } from "next/server";
import { extractBrand } from "@/lib/brand";
import { ANTHROPIC_KEY_HEADER, resolveAnthropicKey } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let url: string | undefined;
  try {
    const body = await req.json();
    url = typeof body?.url === "string" ? body.url : undefined;
  } catch {
    return NextResponse.json({ error: "Corpo JSON non valido." }, { status: 400 });
  }

  if (!url) {
    return NextResponse.json({ error: "Parametro 'url' mancante." }, { status: 400 });
  }

  // Key comes from the Moca Hub (per client) via header, with local env fallback.
  const apiKey = resolveAnthropicKey(req.headers.get(ANTHROPIC_KEY_HEADER));

  try {
    const result = await extractBrand(url, apiKey);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Estrazione fallita.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
