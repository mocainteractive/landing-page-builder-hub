import type { BrandTokens } from "./types";

/** A neutral, professional default brand used before any extraction runs. */
export const DEFAULT_TOKENS: BrandTokens = {
  name: "Your Brand",
  colors: {
    primary: "#2563eb",
    secondary: "#1e293b",
    accent: "#f59e0b",
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#0f172a",
    muted: "#64748b",
    border: "#e2e8f0",
  },
  typography: {
    headingFont: "Poppins",
    bodyFont: "Inter",
    googleFonts: ["Poppins", "Inter"],
    baseSize: "16px",
    scale: 1.25,
    headingWeight: 700,
    bodyWeight: 400,
  },
  radius: { sm: "6px", md: "12px", lg: "20px" },
  shadow: {
    sm: "0 1px 2px rgba(15,23,42,0.06)",
    md: "0 10px 30px rgba(15,23,42,0.12)",
  },
  toneOfVoice: {
    summary: "Clear, professional and confident.",
    adjectives: ["professional", "trustworthy", "modern"],
  },
};

/** Merge a partial token set onto the defaults so the app never renders undefined. */
export function withDefaults(partial: Partial<BrandTokens> | undefined): BrandTokens {
  if (!partial) return DEFAULT_TOKENS;
  return {
    ...DEFAULT_TOKENS,
    ...partial,
    colors: { ...DEFAULT_TOKENS.colors, ...(partial.colors ?? {}) },
    typography: { ...DEFAULT_TOKENS.typography, ...(partial.typography ?? {}) },
    radius: { ...DEFAULT_TOKENS.radius, ...(partial.radius ?? {}) },
    shadow: { ...DEFAULT_TOKENS.shadow, ...(partial.shadow ?? {}) },
    toneOfVoice: { ...DEFAULT_TOKENS.toneOfVoice, ...(partial.toneOfVoice ?? {}) },
  };
}

/** Build the `:root` CSS custom properties from a token set. */
export function buildCssVariables(t: BrandTokens): string {
  const heading = `'${t.typography.headingFont}', system-ui, sans-serif`;
  const body = `'${t.typography.bodyFont}', system-ui, sans-serif`;
  return `:root{
  --color-primary:${t.colors.primary};
  --color-secondary:${t.colors.secondary};
  --color-accent:${t.colors.accent};
  --color-bg:${t.colors.background};
  --color-surface:${t.colors.surface};
  --color-text:${t.colors.text};
  --color-muted:${t.colors.muted};
  --color-border:${t.colors.border};
  --font-heading:${heading};
  --font-body:${body};
  --text-base:${t.typography.baseSize};
  --weight-heading:${t.typography.headingWeight};
  --weight-body:${t.typography.bodyWeight};
  --radius-sm:${t.radius.sm};
  --radius-md:${t.radius.md};
  --radius-lg:${t.radius.lg};
  --shadow-sm:${t.shadow.sm};
  --shadow-md:${t.shadow.md};
}`;
}

/**
 * The base stylesheet shared by the live preview and the exported HTML.
 * Uses the CSS variables above so all blocks stay coherent with the brand.
 */
export function buildBaseStyles(): string {
  return `*{box-sizing:border-box;}
body{margin:0;font-family:var(--font-body);font-size:var(--text-base);font-weight:var(--weight-body);color:var(--color-text);background:var(--color-bg);line-height:1.6;-webkit-font-smoothing:antialiased;}
h1,h2,h3,h4{font-family:var(--font-heading);font-weight:var(--weight-heading);line-height:1.15;margin:0 0 .4em;color:var(--color-text);}
h1{font-size:clamp(2.2rem,5vw,3.6rem);}
h2{font-size:clamp(1.7rem,3.5vw,2.6rem);}
h3{font-size:1.3rem;}
p{margin:0 0 1rem;}
a{color:var(--color-primary);text-decoration:none;}
img{max-width:100%;display:block;}
.lpb-container{width:100%;max-width:1120px;margin:0 auto;padding:0 24px;}
.lpb-section{padding:80px 0;}
.lpb-eyebrow{display:inline-block;font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;color:var(--color-primary);font-weight:600;margin-bottom:.75rem;}
.lpb-lead{font-size:1.15rem;color:var(--color-muted);max-width:60ch;}
.lpb-btn{display:inline-block;padding:14px 28px;border-radius:var(--radius-md);font-weight:600;font-family:var(--font-heading);cursor:pointer;transition:transform .15s ease,opacity .15s ease;border:none;}
.lpb-btn:hover{transform:translateY(-2px);}
.lpb-btn--primary{background:var(--color-primary);color:#fff;box-shadow:var(--shadow-sm);}
.lpb-btn--ghost{background:transparent;color:var(--color-text);border:1px solid var(--color-border);}
.lpb-grid{display:grid;gap:28px;}
.lpb-grid--3{grid-template-columns:repeat(3,1fr);}
.lpb-grid--2{grid-template-columns:repeat(2,1fr);}
.lpb-card{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:32px;}
.lpb-muted{color:var(--color-muted);}
.lpb-center{text-align:center;}
@media(max-width:860px){.lpb-grid--3,.lpb-grid--2{grid-template-columns:1fr;}.lpb-section{padding:56px 0;}}`;
}

/** Build the Google Fonts <link> href for the brand fonts (empty when none). */
export function googleFontsHref(t: BrandTokens): string {
  const families = (t.typography.googleFonts ?? []).filter(Boolean);
  if (families.length === 0) return "";
  const params = families
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
