import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Shared Moca Hub Supabase instance — ANON key only (RLS enforces isolation).
// The service_role key must NEVER be used in the frontend.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

// Null when not configured so the app degrades gracefully to localStorage.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;
