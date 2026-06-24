"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { MocaSDK, MOCA_HUB_URL, type MocaSession } from "@/lib/moca-sdk";

interface MocaContextValue {
  sdk: MocaSDK;
  session: MocaSession | null;
}

const MocaContext = createContext<MocaContextValue | null>(null);

export function useMoca(): MocaContextValue {
  const ctx = useContext(MocaContext);
  if (!ctx) throw new Error("useMoca must be used within <MocaProvider>");
  return ctx;
}

type Phase = "loading" | "authed" | "denied";

export function MocaProvider({ children }: { children: React.ReactNode }) {
  const sdk = useMemo(() => new MocaSDK(MOCA_HUB_URL), []);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    // Local dev: authenticate with a mock session (no real keys committed —
    // the API routes fall back to the server ANTHROPIC_API_KEY locally).
    if (isLocal) {
      sdk.enableMockMode({
        client: {
          id: "mock-client",
          name: "Cliente Demo (Mock)",
          logo_url: "https://placehold.co/120x40/E52217/FFFFFF?text=CLIENTE",
        },
        user: { id: "mock-user", name: "Sviluppatore", role: "admin" },
        configurations: {},
      });
    }
    sdk.init().then((ok) => {
      if (ok) {
        setPhase("authed");
      } else {
        setError(sdk.lastError?.message ?? null);
        setPhase("denied");
      }
    });
  }, [sdk]);

  if (phase === "loading") {
    return (
      <div className="moca-splash">
        <Loader2 className="moca-spin" size={28} />
        <p>Verifica accesso Moca Hub…</p>
      </div>
    );
  }

  if (phase === "denied") {
    return (
      <div className="moca-denied">
        <ShieldAlert size={64} strokeWidth={1.5} />
        <h1>Accesso Negato</h1>
        <p>
          Questa applicazione deve essere aperta tramite <strong>Moca Hub</strong>.
          {error ? <> ({error})</> : null}
        </p>
        <a className="moca-btn moca-btn--light" href={MOCA_HUB_URL}>
          Vai a Moca Hub
        </a>
      </div>
    );
  }

  return (
    <MocaContext.Provider value={{ sdk, session: sdk.getSession() }}>
      {children}
    </MocaContext.Provider>
  );
}
