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
    .from("lpb_projects")
    .select("id,title,updated_at")
    .eq("client_id", ident.clientId)
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(req: Request) {
  const ident = preflight(req);
  if (ident instanceof NextResponse) return ident;

  let body: { id?: string; title?: string; data?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido." }, { status: 400 });
  }
  if (!body.data)
    return NextResponse.json({ error: "Campo 'data' mancante." }, { status: 400 });

  const admin = getAdmin();
  const title = body.title?.trim() || "Senza titolo";

  if (body.id) {
    const { data, error } = await admin
      .from("lpb_projects")
      .update({ title, data: body.data })
      .eq("id", body.id)
      .eq("client_id", ident.clientId)
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data?.id });
  }

  const { data, error } = await admin
    .from("lpb_projects")
    .insert({
      client_id: ident.clientId,
      user_id: ident.userId,
      title,
      data: body.data,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data?.id });
}
