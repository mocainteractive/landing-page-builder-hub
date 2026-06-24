/**
 * MocaProvider — context React per l'integrazione con Moca Hub.
 * Esegue moca.init() una sola volta e fornisce client/user/configurazioni
 * a tutti i componenti tramite useMoca().
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ShieldAlert } from "lucide-react";
import {
  MocaSDK,
  type MocaClient,
  type MocaUser,
  type MocaApplication,
  type MocaConfigurations,
} from "./moca-sdk";

const HUB_URL =
  import.meta.env.VITE_MOCA_HUB_URL ?? "https://moca-central-hub.netlify.app";

interface MocaContextValue {
  client: MocaClient;
  user: MocaUser;
  application: MocaApplication | null;
  configs: MocaConfigurations;
  getConfig: (key: string) => string | null;
  logout: () => void;
}

const MocaContext = createContext<MocaContextValue | null>(null);

export function useMoca(): MocaContextValue {
  const ctx = useContext(MocaContext);
  if (!ctx) throw new Error("useMoca deve essere usato dentro <MocaProvider>");
  return ctx;
}

export function MocaProvider({ children }: { children: ReactNode }) {
  const [sdk] = useState(() => new MocaSDK(HUB_URL));
  const [status, setStatus] = useState<"loading" | "ok" | "denied">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // MOCK MODE — solo sviluppo locale. NON committare chiavi reali.
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
      sdk.enableMockMode({
        client: {
          name: "Cliente Demo",
          logo_url: "https://placehold.co/120x40/E52217/FFFFFF?text=DEMO",
        },
        user: { name: "Sviluppatore", role: "super_admin" },
        configurations: {
          ANTHROPIC_API_KEY: import.meta.env.VITE_DEV_ANTHROPIC_API_KEY ?? "",
        },
      });
    }
    sdk.init().then((ok) => {
      if (ok) setStatus("ok");
      else {
        setError(sdk.lastError?.message ?? null);
        setStatus("denied");
      }
    });
  }, [sdk]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-moca-bg">
        <div className="animate-spin h-8 w-8 border-2 border-moca-red border-t-transparent rounded-full" />
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-moca-black text-center px-4">
        <div className="bg-white rounded-xl shadow-sm p-10 max-w-md">
          <ShieldAlert size={56} className="text-moca-red mx-auto mb-3" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold text-moca-black mb-2">Accesso Negato</h1>
          <p className="text-moca-gray mb-6">
            Questa applicazione deve essere aperta tramite <strong>Moca Hub</strong>.
            {error ? <span className="block mt-1 text-sm">({error})</span> : null}
          </p>
          <a
            href={HUB_URL}
            className="inline-block px-6 py-3 bg-moca-red text-white rounded-md font-semibold hover:bg-moca-red-dark transition-colors"
          >
            Vai a Moca Hub
          </a>
        </div>
      </div>
    );
  }

  const value: MocaContextValue = {
    client: sdk.getClient()!,
    user: sdk.getUser()!,
    application: sdk.getApplication(),
    configs: sdk.getAllConfigs(),
    getConfig: (key) => sdk.getConfig(key),
    logout: () => sdk.logout(),
  };

  return <MocaContext.Provider value={value}>{children}</MocaContext.Provider>;
}
