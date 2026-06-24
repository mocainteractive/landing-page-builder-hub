import Anthropic from "@anthropic-ai/sdk";

/** Model used by the AI functions. Opus 4.8 unless overridden via env. */
export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

/** Header carrying the per-client Anthropic key forwarded from the Moca Hub. */
export const ANTHROPIC_KEY_HEADER = "x-moca-anthropic-key";

/**
 * Resolve the Anthropic key: per-client key from the Hub (header) first, then a
 * local env fallback for development.
 */
export function resolveKey(headerValue?: string | null): string | null {
  const fromHeader = headerValue?.trim();
  if (fromHeader) return fromHeader;
  return process.env.ANTHROPIC_API_KEY?.trim() || null;
}

export function getClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}
