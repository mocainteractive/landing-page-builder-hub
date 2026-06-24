import { NextResponse } from "next/server";
import { getAdmin, isSupabaseConfigured, readIdentity } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function preflight(req: Request) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "Supabase non configurato." }, { status: 503 });
  const ident = readIdentity(req);
  if (!ident)
    return NextResponse.json({ error: "Identità Moca mancante." }, { status: 401 });
  return ident;
}

export async function GET(req: Request) {
  const ident = preflight(req);
  if (ident instanceof NextResponse) return ident;
  const { data, error } = await getAdmin()
    .from("lpb_brands")
    .select("id,name,tokens,created_at")
    .eq("client_id", ident.clientId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ brands: data ?? [] });
}

export async function POST(req: Request) {
  const ident = preflight(req);
  if (ident instanceof NextResponse) return ident;
  let body: { name?: string; tokens?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido." }, { status: 400 });
  }
  if (!body.tokens)
    return NextResponse.json({ error: "Campo 'tokens' mancante." }, { status: 400 });
  const { data, error } = await getAdmin()
    .from("lpb_brands")
    .insert({
      client_id: ident.clientId,
      user_id: ident.userId,
      name: body.name?.trim() || "Brand",
      tokens: body.tokens,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data?.id });
}
