import { supabase } from "./supabase";
import type { BrandTokens, PageDoc } from "./types";

const ANTHROPIC_HEADER = "x-moca-anthropic-key";

function aiHeaders(apiKey: string | null): Record<string, string> {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (apiKey) h[ANTHROPIC_HEADER] = apiKey;
  return h;
}

// ── AI proxy (Netlify Functions) ─────────────────────────────────────────────

export async function aiExtractBrand(
  url: string,
  apiKey: string | null,
): Promise<{ tokens: BrandTokens; usedAi: boolean }> {
  const res = await fetch("/api/extract-brand", {
    method: "POST",
    headers: aiHeaders(apiKey),
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Estrazione fallita");
  return data;
}

export async function aiEditBlock(
  payload: {
    blockType: string;
    currentHtml: string;
    comment: string;
    tokens: BrandTokens;
  },
  apiKey: string | null,
): Promise<{ html: string; note: string }> {
  const res = await fetch("/api/edit-block", {
    method: "POST",
    headers: aiHeaders(apiKey),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Modifica fallita");
  return data;
}

// ── Persistence (Supabase, anon key + RLS) ───────────────────────────────────
// All queries are scoped by client_id; Row Level Security (policies on
// user_clients + auth.uid()) enforces tenant isolation at the database level.

export interface ProjectRow {
  id: string;
  title: string;
  updated_at: string;
}

function requireDb() {
  if (!supabase)
    throw new Error("Supabase non configurato: salvataggio non disponibile.");
  return supabase;
}

export async function listProjects(clientId: string): Promise<ProjectRow[]> {
  const db = requireDb();
  const { data, error } = await db
    .from("lpb_projects")
    .select("id,title,updated_at")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ProjectRow[]) ?? [];
}

export async function saveProject(args: {
  id: string | null;
  clientId: string;
  title: string;
  data: PageDoc;
}): Promise<string> {
  const db = requireDb();
  if (args.id) {
    const { data, error } = await db
      .from("lpb_projects")
      .update({ title: args.title, data: args.data })
      .eq("id", args.id)
      .eq("client_id", args.clientId)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return (data as { id: string }).id;
  }
  const { data, error } = await db
    .from("lpb_projects")
    .insert({ client_id: args.clientId, title: args.title, data: args.data })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function getProject(id: string, clientId: string): Promise<PageDoc> {
  const db = requireDb();
  const { data, error } = await db
    .from("lpb_projects")
    .select("data")
    .eq("id", id)
    .eq("client_id", clientId)
    .single();
  if (error) throw new Error(error.message);
  return (data as { data: PageDoc }).data;
}

export async function saveBrand(
  clientId: string,
  name: string,
  tokens: BrandTokens,
): Promise<void> {
  const db = requireDb();
  const { error } = await db
    .from("lpb_brands")
    .insert({ client_id: clientId, name, tokens });
  if (error) throw new Error(error.message);
}

export async function saveExport(args: {
  clientId: string;
  projectId: string | null;
  title: string;
  html: string;
}): Promise<void> {
  const db = requireDb();
  const { error } = await db.from("lpb_exports").insert({
    client_id: args.clientId,
    project_id: args.projectId,
    title: args.title,
    html: args.html,
  });
  if (error) throw new Error(error.message);
}
