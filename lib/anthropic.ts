import Anthropic from "@anthropic-ai/sdk";

/** Model used across the app. Opus 4.8 unless overridden via env. */
export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

let client: Anthropic | null = null;

/** Lazily construct the Anthropic client; throws a clear error if unconfigured. */
export function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and add your key.",
    );
  }
  if (!client) client = new Anthropic();
  return client;
}

/** Whether AI features are available in the current environment. */
export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
