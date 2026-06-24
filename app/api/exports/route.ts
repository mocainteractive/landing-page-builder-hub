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
  const projectId = new URL(req.url).searchParams.get("projectId");
  let q = getAdmin()
    .from("lpb_exports")
    .select("id,title,project_id,created_at")
    .eq("client_id", ident.clientId)
    .order("created_at", { ascending: false });
  if (projectId) q = q.eq("project_id", projectId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ exports: data ?? [] });
}

export async function POST(req: Request) {
  const ident = preflight(req);
  if (ident instanceof NextResponse) return ident;
  let body: { projectId?: string; title?: string; html?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido." }, { status: 400 });
  }
  if (!body.html)
    return NextResponse.json({ error: "Campo 'html' mancante." }, { status: 400 });
  const { data, error } = await getAdmin()
    .from("lpb_exports")
    .insert({
      client_id: ident.clientId,
      user_id: ident.userId,
      project_id: body.projectId ?? null,
      title: body.title?.trim() || "Export",
      html: body.html,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data?.id });
}
