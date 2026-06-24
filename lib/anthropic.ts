import Anthropic from "@anthropic-ai/sdk";

/** Model used across the app. Opus 4.8 unless overridden via env. */
export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

export { ANTHROPIC_KEY_HEADER } from "./moca-headers";

/**
 * Resolve the Anthropic key for a request. In production the key comes from the
 * Moca Hub (per client) via header; locally it falls back to the server env.
 */
export function resolveAnthropicKey(explicit?: string | null): string | null {
  const fromHeader = explicit?.trim();
  if (fromHeader) return fromHeader;
  return process.env.ANTHROPIC_API_KEY?.trim() || null;
}

/** Construct an Anthropic client for the given key. */
export function getClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}
