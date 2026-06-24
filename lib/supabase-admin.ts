import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { MOCA_CLIENT_HEADER, MOCA_USER_HEADER } from "./moca-headers";

// Server-side Supabase client using the service role key (same env names as the
// Moca Hub functions). Reuses the Hub's Supabase project; our tables are
// prefixed `lpb_` and scoped by the Moca client/user from the validated session.

let admin: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getAdmin(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase non configurato (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  if (!admin) {
    admin = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return admin;
}

export interface MocaIdentity {
  clientId: string;
  userId: string | null;
}

/**
 * Read the Moca identity (client/user) from request headers. The browser sets
 * these from the validated Moca session. `clientId` is required to scope data.
 */
export function readIdentity(req: Request): MocaIdentity | null {
  const clientId = req.headers.get(MOCA_CLIENT_HEADER);
  if (!clientId) return null;
  return { clientId, userId: req.headers.get(MOCA_USER_HEADER) };
}
