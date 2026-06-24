import { z } from "zod";
import type { BrandTokens } from "../../../src/lib/types";
import { getClient, MODEL } from "./anthropic";
import { extractJson, textOf } from "./llm";

const EditSchema = z.object({
  html: z.string(),
  note: z.string().optional(),
});

export interface EditBlockInput {
  blockType: string;
  currentHtml: string;
  comment: string;
  tokens: BrandTokens;
  apiKey: string;
}

function systemPrompt(tokens: BrandTokens): string {
  return `You edit ONE section (a "block") of a landing page in isolation. You receive the section's current HTML and an instruction, and return updated HTML for that section only.

Hard constraints:
- Return HTML for this single section only. Never output <html>, <head>, <body>, <script>, <link>, or <style> tags, and never reference external CSS.
- Stay on brand: reuse the existing utility classes (those starting with "lpb-") and CSS custom properties (var(--color-primary), var(--color-surface), var(--font-heading), var(--radius-md), etc.). Do not hardcode brand colors as raw hex — use the variables.
- Keep the section self-contained and valid. Preserve the general layout unless the instruction asks to change it.
- Apply the brand tone of voice to any copy you write or rewrite.

Brand tone of voice: ${tokens.toneOfVoice.summary} (${tokens.toneOfVoice.adjectives.join(", ")}).
Brand name: ${tokens.name ?? "the brand"}.

Output ONLY a single JSON object, with no prose and no markdown fences, of this exact shape:
{ "html": "<the updated section HTML>", "note": "<one short sentence describing what changed>" }`;
}

export async function editBlock(
  input: EditBlockInput,
): Promise<{ html: string; note: string }> {
  const client = getClient(input.apiKey);
  const userContent = `Section type: ${input.blockType}

Current HTML:
\`\`\`html
${input.currentHtml}
\`\`\`

Instruction: ${input.comment}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: systemPrompt(input.tokens),
    messages: [{ role: "user", content: userContent }],
  });

  const parsed = EditSchema.parse(extractJson(textOf(response)));
  if (!parsed.html) throw new Error("Il modello non ha restituito l'HTML aggiornato.");
  return { html: parsed.html, note: parsed.note ?? "Aggiornato." };
}
