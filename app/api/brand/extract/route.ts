import { NextResponse } from "next/server";
import { extractBrand } from "@/lib/brand";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let url: string | undefined;
  try {
    const body = await req.json();
    url = typeof body?.url === "string" ? body.url : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!url) {
    return NextResponse.json({ error: "Missing 'url'." }, { status: 400 });
  }

  try {
    const result = await extractBrand(url);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
