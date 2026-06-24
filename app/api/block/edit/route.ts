import { NextResponse } from "next/server";
import { editBlock } from "@/lib/edit";
import { hasApiKey } from "@/lib/anthropic";
import { withDefaults } from "@/lib/tokens";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
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
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { blockType, currentHtml, comment } = body;
  if (!currentHtml || !comment) {
    return NextResponse.json(
      { error: "Missing 'currentHtml' or 'comment'." },
      { status: 400 },
    );
  }

  try {
    const result = await editBlock({
      blockType: blockType || "section",
      currentHtml,
      comment,
      tokens: withDefaults(body.tokens as never),
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Edit failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
