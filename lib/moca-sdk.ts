// TypeScript port of the official Moca Hub SDK (docs/moca-sdk/moca-sdk.js).
// Handles the secure launch-token flow:
//   1. reads ?moca_token from the URL
//   2. validates it against the Hub (/api/validate-launch-token)
//   3. stores client context + per-client API keys in sessionStorage (8h)
//   4. exposes config/client/user accessors
// Behaviour is kept identical to the JS SDK so apps stay interchangeable.

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
export interface MocaSession {
  client: MocaClient;
  user: MocaUser;
  application: MocaApplication;
  configurations: Record<string, string>;
  timestamp: number;
}

export interface MockConfig {
  client?: Partial<MocaClient>;
  user?: Partial<MocaUser>;
  configurations?: Record<string, string>;
}

const SESSION_KEY = "moca_session";
const MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours

export class MocaSDK {
  private hubUrl: string;
  private session: MocaSession | null = null;
  private mockConfig: MockConfig | null = null;
  /** Populated when validation fails, so the UI can show why. */
  lastError: { message: string; code?: string } | null = null;

  constructor(hubUrl: string) {
    this.hubUrl = hubUrl.replace(/\/$/, "");
  }

  /** Validate the launch token (or load an existing session). */
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

    // Local dev: use the mock config if provided.
    if (!token && isLocal && this.mockConfig) {
      this.session = {
        client:
          (this.mockConfig.client as MocaClient) ?? {
            id: "mock-client",
            name: "Cliente Demo (Mock)",
            logo_url: "https://placehold.co/100/E52217/FFFFFF?text=M",
          },
        user:
          (this.mockConfig.user as MocaUser) ?? {
            id: "mock-user",
            name: "Sviluppatore (Mock)",
            role: "admin",
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
  getAllConfigs(): Record<string, string> {
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
  getSession(): MocaSession | null {
    return this.session;
  }

  logout(): void {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    this.session = null;
  }

  // --- private ---
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

/** The Moca Hub base URL (configurable, defaults to production). */
export const MOCA_HUB_URL =
  process.env.NEXT_PUBLIC_MOCA_HUB_URL || "https://moca-central-hub.netlify.app";
