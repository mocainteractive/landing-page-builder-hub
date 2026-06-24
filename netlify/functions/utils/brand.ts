import * as cheerio from "cheerio";
import { z } from "zod";
import type { BrandTokens } from "../../../src/lib/types";
import { getClient, MODEL } from "./anthropic";
import { withDefaults } from "../../../src/lib/tokens";
import { extractJson, textOf } from "./llm";

export interface SiteSignals {
  url: string;
  name: string;
  logo?: string;
  themeColor?: string;
  colors: string[];
  fonts: string[];
  textSample: string;
}

const FETCH_TIMEOUT_MS = 12000;
const MAX_CSS_BYTES = 600_000;

// Route outbound requests through the egress proxy when configured (Moca Hub /
// sandboxes). Node's global fetch ignores HTTP(S)_PROXY, so wire undici.
let proxyDispatcher: unknown;
let proxyResolved = false;
async function getDispatcher(): Promise<unknown> {
  if (proxyResolved) return proxyDispatcher;
  proxyResolved = true;
  const proxy =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;
  if (proxy) {
    try {
      const { ProxyAgent } = await import("undici");
      proxyDispatcher = new ProxyAgent(proxy);
    } catch {
      /* undici unavailable — direct fetch */
    }
  }
  return proxyDispatcher;
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const dispatcher = await getDispatcher();
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; MocaHubBrandBot/1.0; +https://mocainteractive.com)",
        accept: "text/html,text/css,*/*",
      },
      redirect: "follow",
      ...(dispatcher ? { dispatcher } : {}),
    } as RequestInit);
    if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

function rankByFrequency(items: string[]): string[] {
  const counts = new Map<string, number>();
  for (const raw of items) {
    const key = raw.trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

function extractColors(css: string): string[] {
  const hex = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
  const rgb = css.match(/rgba?\([^)]+\)/g) ?? [];
  const filtered = [...hex, ...rgb].filter((c) => {
    const v = c.toLowerCase();
    return (
      v !== "#fff" &&
      v !== "#ffffff" &&
      v !== "#000" &&
      v !== "#000000" &&
      !/rgba?\(0,\s*0,\s*0/.test(v) &&
      !/rgba?\(255,\s*255,\s*255/.test(v)
    );
  });
  return rankByFrequency(filtered).slice(0, 16);
}

function extractFonts(css: string): string[] {
  const decls = css.match(/font-family\s*:\s*([^;}{]+)/gi) ?? [];
  const families = decls
    .map((d) => d.split(":")[1] ?? "")
    .map((v) => v.split(",")[0] ?? "")
    .map((v) => v.replace(/['"]/g, "").trim())
    .filter(
      (v) =>
        v &&
        !/^(inherit|initial|unset|sans-serif|serif|monospace|system-ui|-apple-system)$/i.test(v),
    );
  return rankByFrequency(families).slice(0, 8);
}

export async function collectSiteSignals(rawUrl: string): Promise<SiteSignals> {
  const url = normalizeUrl(rawUrl);
  const html = await fetchText(url);
  const $ = cheerio.load(html);
  const origin = new URL(url).origin;

  let css = $("style").map((_, el) => $(el).text()).get().join("\n");
  $("[style]").each((_, el) => {
    css += "\n" + ($(el).attr("style") ?? "");
  });

  const links = ($('link[rel="stylesheet"]')
    .map((_, el) => $(el).attr("href"))
    .get()
    .filter(Boolean) as string[]).slice(0, 4);
  for (const href of links) {
    if (css.length > MAX_CSS_BYTES) break;
    try {
      const abs = new URL(href, url).toString();
      if (!abs.startsWith(origin)) continue;
      css += "\n" + (await fetchText(abs));
    } catch {
      /* ignore individual stylesheet failures */
    }
  }

  const name =
    $('meta[property="og:site_name"]').attr("content") ||
    $("title").first().text().split(/[|\-–—·]/)[0]?.trim() ||
    new URL(url).hostname.replace(/^www\./, "");

  const logo =
    $('meta[property="og:image"]').attr("content") ||
    $('img[src*="logo" i], img[alt*="logo" i]').first().attr("src") ||
    undefined;

  const themeColor = $('meta[name="theme-color"]').attr("content") || undefined;

  $("script, style, noscript").remove();
  const textSample = $("body").text().replace(/\s+/g, " ").trim().slice(0, 2500);

  return {
    url,
    name: name || "Brand",
    logo: logo ? new URL(logo, url).toString() : undefined,
    themeColor,
    colors: extractColors(css),
    fonts: extractFonts(css),
    textSample,
  };
}

const BrandSchema = z.object({
  name: z.string(),
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    background: z.string(),
    surface: z.string(),
    text: z.string(),
    muted: z.string(),
    border: z.string(),
  }),
  typography: z.object({
    headingFont: z.string(),
    bodyFont: z.string(),
    googleFonts: z.array(z.string()),
    baseSize: z.string(),
    scale: z.number(),
    headingWeight: z.number(),
    bodyWeight: z.number(),
  }),
  toneOfVoice: z.object({
    summary: z.string(),
    adjectives: z.array(z.string()),
  }),
});

const SYSTEM_PROMPT = `You are a brand systems designer. Given raw signals scraped from a website (frequency-ranked colors and fonts, plus a copy sample), produce a clean, coherent set of design tokens for a landing page builder.

Rules:
- Choose colors that are accessible and harmonious. The frequency-ranked list is a hint — pick a confident primary, a darker secondary, and a complementary accent. Ensure text has strong contrast on background.
- Output hex colors only (e.g. "#1a73e8").
- For fonts, prefer the detected families when they are real Google Fonts; otherwise pick close Google Font equivalents. googleFonts must contain valid Google Font family names.
- baseSize around "16px", scale between 1.15 and 1.333, headingWeight 600-800, bodyWeight 400-500.
- toneOfVoice should reflect the copy sample.

Output ONLY a single JSON object, no prose and no markdown fences, matching exactly this shape:
{ "name": string, "colors": { "primary": hex, "secondary": hex, "accent": hex, "background": hex, "surface": hex, "text": hex, "muted": hex, "border": hex }, "typography": { "headingFont": string, "bodyFont": string, "googleFonts": string[], "baseSize": string, "scale": number, "headingWeight": number, "bodyWeight": number }, "toneOfVoice": { "summary": string, "adjectives": string[] } }`;

function heuristicTokens(signals: SiteSignals): BrandTokens {
  const [c0, c1, c2] = signals.colors;
  const headingFont = signals.fonts[0] || "Poppins";
  const bodyFont = signals.fonts[1] || signals.fonts[0] || "Inter";
  return withDefaults({
    name: signals.name,
    source: signals.url,
    logo: signals.logo,
    colors: {
      primary: c0?.startsWith("#") ? c0 : signals.themeColor || "#2563eb",
      secondary: c1?.startsWith("#") ? c1 : "#1e293b",
      accent: c2?.startsWith("#") ? c2 : "#f59e0b",
      background: "#ffffff",
      surface: "#f8fafc",
      text: "#0f172a",
      muted: "#64748b",
      border: "#e2e8f0",
    },
    typography: {
      headingFont,
      bodyFont,
      googleFonts: [...new Set([headingFont, bodyFont])],
      baseSize: "16px",
      scale: 1.25,
      headingWeight: 700,
      bodyWeight: 400,
    },
    toneOfVoice: {
      summary: "Ricavato dal sito senza AI — perfeziona se necessario.",
      adjectives: ["chiaro", "professionale"],
    },
  });
}

export async function extractBrand(
  rawUrl: string,
  apiKey?: string | null,
): Promise<{ tokens: BrandTokens; signals: SiteSignals; usedAi: boolean }> {
  const signals = await collectSiteSignals(rawUrl);

  if (!apiKey) {
    return { tokens: heuristicTokens(signals), signals, usedAi: false };
  }

  try {
    const client = getClient(apiKey);
    const userContent = [
      `URL: ${signals.url}`,
      `Detected name: ${signals.name}`,
      `theme-color: ${signals.themeColor ?? "(none)"}`,
      `Frequency-ranked colors: ${signals.colors.join(", ") || "(none found)"}`,
      `Frequency-ranked fonts: ${signals.fonts.join(", ") || "(none found)"}`,
      `Copy sample:\n${signals.textSample}`,
    ].join("\n");

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const parsed = BrandSchema.parse(extractJson(textOf(response)));
    const tokens = withDefaults({ ...parsed, source: signals.url, logo: signals.logo });
    return { tokens, signals, usedAi: true };
  } catch (err) {
    console.error("Brand AI normalization failed, using heuristics:", err);
    return { tokens: heuristicTokens(signals), signals, usedAi: false };
  }
}
