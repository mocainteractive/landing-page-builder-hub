// TypeScript port of the official Moca Hub SDK (docs/moca-sdk/moca-sdk.js).
// Same network contract as the JS SDK so apps stay interchangeable:
//   1. reads ?moca_token from the URL
//   2. validates it against the Hub (POST /api/validate-launch-token)
//   3. stores client context + per-client API keys in sessionStorage (8h)
//   4. exposes config/client/user accessors

export interface MocaClient {
  id: string;
  name: string;
  email?: string;
  logo_url?: string;
}
export interface MocaUser {
  id: string;
  name: string;
  email?: string;
  role: string;
  level?: number;
  job_title?: string;
}
export interface MocaApplication {
  id: string;
  name: string;
  description?: string;
}
export type MocaConfigurations = Record<string, string>;

export interface MocaSession {
  client: MocaClient;
  user: MocaUser;
  application: MocaApplication;
  configurations: MocaConfigurations;
  timestamp: number;
}

export interface MockConfig {
  client?: Partial<MocaClient>;
  user?: Partial<MocaUser>;
  configurations?: MocaConfigurations;
}

const SESSION_KEY = "moca_session";
const MAX_AGE_MS = 8 * 60 * 60 * 1000;

export class MocaSDK {
  private hubUrl: string;
  private session: MocaSession | null = null;
  private mockConfig: MockConfig | null = null;
  lastError: { message: string; code?: string } | null = null;

  constructor(hubUrl: string) {
    this.hubUrl = hubUrl.replace(/\/$/, "");
  }

  async init(): Promise<boolean> {
    const existing = this.loadSession();
    if (existing) {
      this.session = existing;
      return true;
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get("moca_token");
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (!token && isLocal && this.mockConfig) {
      this.session = {
        client:
          (this.mockConfig.client as MocaClient) ?? {
            id: "mock-client",
            name: "Cliente Demo (Mock)",
            logo_url: "https://placehold.co/100/E52217/FFFFFF?text=DEMO",
          },
        user:
          (this.mockConfig.user as MocaUser) ?? {
            id: "mock-user",
            name: "Sviluppatore",
            role: "super_admin",
          },
        application: { id: "mock-app", name: "Landing Page Builder" },
        configurations: this.mockConfig.configurations ?? {},
        timestamp: Date.now(),
      };
      this.saveSession();
      return true;
    }

    if (!token) return false;

    try {
      const res = await fetch(`${this.hubUrl}/api/validate-launch-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        this.lastError = { message: data.error || "Token non valido", code: data.code };
        return false;
      }
      this.session = {
        client: data.client,
        user: data.user,
        application: data.application,
        configurations: data.configurations ?? {},
        timestamp: Date.now(),
      };
      this.saveSession();
      this.cleanUrl();
      return true;
    } catch {
      this.lastError = { message: "Errore di connessione con Moca Hub" };
      return false;
    }
  }

  enableMockMode(config: MockConfig = {}): void {
    this.mockConfig = config;
  }

  isAuthenticated(): boolean {
    return this.session !== null;
  }
  getConfig(key: string): string | null {
    return this.session?.configurations?.[key] ?? null;
  }
  getAllConfigs(): MocaConfigurations {
    return { ...(this.session?.configurations ?? {}) };
  }
  getClient(): MocaClient | null {
    return this.session?.client ?? null;
  }
  getUser(): MocaUser | null {
    return this.session?.user ?? null;
  }
  getApplication(): MocaApplication | null {
    return this.session?.application ?? null;
  }
  logout(): void {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    this.session = null;
  }

  private loadSession(): MocaSession | null {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (!stored) return null;
      const session = JSON.parse(stored) as MocaSession;
      if (Date.now() - session.timestamp > MAX_AGE_MS) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }
  private saveSession(): void {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
    } catch {
      /* ignore */
    }
  }
  private cleanUrl(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete("moca_token");
    window.history.replaceState({}, document.title, url.toString());
  }
}
