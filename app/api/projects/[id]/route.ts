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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ident = preflight(req);
  if (ident instanceof NextResponse) return ident;
  const { id } = await params;
  const { data, error } = await getAdmin()
    .from("lpb_projects")
    .select("id,title,data,updated_at")
    .eq("id", id)
    .eq("client_id", ident.clientId)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ project: data });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ident = preflight(req);
  if (ident instanceof NextResponse) return ident;
  const { id } = await params;
  const { error } = await getAdmin()
    .from("lpb_projects")
    .delete()
    .eq("id", id)
    .eq("client_id", ident.clientId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
