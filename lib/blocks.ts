import type { BlockInstance, BlockType, BrandTokens } from "./types";

/** Escape user text before injecting into HTML. */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.length > 0 ? v : fallback;
}
function list<T = Record<string, unknown>>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/** Descriptor for an editable sub-field inside an object-array item. */
export interface SubField {
  key: string;
  label: string;
  type: "text" | "textarea" | "strings" | "boolean";
}

/** Descriptor for an editable field of a block, used to build the no-code form. */
export type FieldDef =
  | { key: string; label: string; type: "text" | "textarea" | "image" }
  | { key: string; label: string; type: "strings"; help?: string }
  | {
      key: string;
      label: string;
      type: "objects";
      itemLabel: string;
      schema: SubField[];
      blank: () => Record<string, unknown>;
    };

export interface BlockDefinition {
  type: BlockType;
  label: string;
  description: string;
  /** Default content used when the block is dropped onto the canvas. */
  defaults: () => Record<string, unknown>;
  /** Editable fields exposed in the inspector (no-code editing). */
  fields: FieldDef[];
  /** Render the block to clean, self-contained HTML using brand tokens/classes. */
  render: (props: Record<string, unknown>, t: BrandTokens) => string;
}

const PLACEHOLDER_IMG = "https://placehold.co/640x440/eef2ff/64748b?text=Image";

export const BLOCKS: Record<BlockType, BlockDefinition> = {
  header: {
    type: "header",
    label: "Header",
    description: "Logo, navigation and a call to action.",
    defaults: () => ({
      brand: "Your Brand",
      links: ["Features", "Pricing", "Contact"],
      cta: "Get started",
    }),
    fields: [
      { key: "brand", label: "Brand name", type: "text" },
      { key: "links", label: "Nav links", type: "strings", help: "One link per line" },
      { key: "cta", label: "Button label", type: "text" },
    ],
    render: (p, _t) => {
      const links = list<string>(p.links)
        .map((l) => `<a href="#">${esc(l)}</a>`)
        .join("");
      return `<header style="border-bottom:1px solid var(--color-border);background:var(--color-bg);">
  <div class="lpb-container" style="display:flex;align-items:center;justify-content:space-between;height:72px;">
    <strong style="font-family:var(--font-heading);font-size:1.25rem;">${esc(str(p.brand, "Your Brand"))}</strong>
    <nav style="display:flex;gap:28px;align-items:center;">${links}
      <a class="lpb-btn lpb-btn--primary" href="#" style="padding:10px 20px;">${esc(str(p.cta, "Get started"))}</a>
    </nav>
  </div>
</header>`;
    },
  },

  hero: {
    type: "hero",
    label: "Hero",
    description: "Headline, subtitle, buttons and a visual.",
    defaults: () => ({
      eyebrow: "Introducing",
      title: "Build landing pages that stay on brand",
      subtitle:
        "Assemble blocks, edit with simple comments and export clean HTML ready to publish.",
      primaryCta: "Start now",
      secondaryCta: "Learn more",
      image: PLACEHOLDER_IMG,
    }),
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
      { key: "primaryCta", label: "Primary button", type: "text" },
      { key: "secondaryCta", label: "Secondary button", type: "text" },
      { key: "image", label: "Image URL", type: "image" },
    ],
    render: (p, _t) => {
      return `<section class="lpb-section">
  <div class="lpb-container lpb-grid lpb-grid--2" style="align-items:center;">
    <div>
      ${str(p.eyebrow) ? `<span class="lpb-eyebrow">${esc(p.eyebrow)}</span>` : ""}
      <h1>${esc(str(p.title, "Your headline here"))}</h1>
      <p class="lpb-lead">${esc(str(p.subtitle))}</p>
      <div style="display:flex;gap:14px;margin-top:28px;flex-wrap:wrap;">
        ${str(p.primaryCta) ? `<a class="lpb-btn lpb-btn--primary" href="#">${esc(p.primaryCta)}</a>` : ""}
        ${str(p.secondaryCta) ? `<a class="lpb-btn lpb-btn--ghost" href="#">${esc(p.secondaryCta)}</a>` : ""}
      </div>
    </div>
    <div>
      <img src="${esc(str(p.image, PLACEHOLDER_IMG))}" alt="" style="border-radius:var(--radius-lg);box-shadow:var(--shadow-md);width:100%;">
    </div>
  </div>
</section>`;
    },
  },

  features: {
    type: "features",
    label: "Features",
    description: "A grid of three value propositions.",
    defaults: () => ({
      title: "Everything you need",
      subtitle: "Built for speed, designed to stay coherent.",
      items: [
        { title: "On-brand by default", text: "Every block inherits your colors, fonts and tone." },
        { title: "Edit with comments", text: "Describe a change in plain language; AI updates just that section." },
        { title: "Clean export", text: "Download a single HTML file, ready for any hosting." },
      ],
    }),
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
      {
        key: "items",
        label: "Feature cards",
        type: "objects",
        itemLabel: "Card",
        schema: [
          { key: "title", label: "Title", type: "text" },
          { key: "text", label: "Text", type: "textarea" },
        ],
        blank: () => ({ title: "New feature", text: "Describe it here." }),
      },
    ],
    render: (p, _t) => {
      const cards = list(p.items)
        .map(
          (it) => `<div class="lpb-card">
        <h3>${esc(str((it as Record<string, unknown>).title))}</h3>
        <p class="lpb-muted">${esc(str((it as Record<string, unknown>).text))}</p>
      </div>`,
        )
        .join("");
      return `<section class="lpb-section" style="background:var(--color-surface);">
  <div class="lpb-container">
    <div class="lpb-center" style="margin-bottom:48px;">
      <h2>${esc(str(p.title, "Features"))}</h2>
      <p class="lpb-lead" style="margin:0 auto;">${esc(str(p.subtitle))}</p>
    </div>
    <div class="lpb-grid lpb-grid--3">${cards}</div>
  </div>
</section>`;
    },
  },

  cta: {
    type: "cta",
    label: "Call to action",
    description: "A focused conversion band.",
    defaults: () => ({
      title: "Ready to get started?",
      text: "Join the teams shipping faster with Moca Hub.",
      button: "Get started",
    }),
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "text", label: "Text", type: "textarea" },
      { key: "button", label: "Button label", type: "text" },
    ],
    render: (p, _t) => `<section class="lpb-section">
  <div class="lpb-container">
    <div style="background:var(--color-primary);color:#fff;border-radius:var(--radius-lg);padding:64px 40px;text-align:center;">
      <h2 style="color:#fff;">${esc(str(p.title, "Ready to get started?"))}</h2>
      <p style="color:rgba(255,255,255,.85);max-width:50ch;margin:0 auto 28px;">${esc(str(p.text))}</p>
      <a class="lpb-btn" href="#" style="background:#fff;color:var(--color-primary);">${esc(str(p.button, "Get started"))}</a>
    </div>
  </div>
</section>`,
  },

  testimonial: {
    type: "testimonial",
    label: "Testimonial",
    description: "A single customer quote.",
    defaults: () => ({
      quote:
        "We cut landing page production from days to minutes while keeping every page perfectly on brand.",
      author: "Jane Doe",
      role: "Head of Marketing",
    }),
    fields: [
      { key: "quote", label: "Quote", type: "textarea" },
      { key: "author", label: "Author", type: "text" },
      { key: "role", label: "Role", type: "text" },
    ],
    render: (p, _t) => `<section class="lpb-section">
  <div class="lpb-container lpb-center" style="max-width:760px;">
    <p style="font-family:var(--font-heading);font-size:1.6rem;line-height:1.4;">“${esc(str(p.quote))}”</p>
    <p style="margin-top:24px;font-weight:600;">${esc(str(p.author))}</p>
    <p class="lpb-muted" style="margin:0;">${esc(str(p.role))}</p>
  </div>
</section>`,
  },

  pricing: {
    type: "pricing",
    label: "Pricing",
    description: "A two or three column pricing table.",
    defaults: () => ({
      title: "Simple pricing",
      subtitle: "Pick the plan that fits.",
      plans: [
        { name: "Starter", price: "€0", period: "/mo", features: ["1 project", "Basic blocks", "HTML export"], cta: "Start free", highlighted: false },
        { name: "Pro", price: "€29", period: "/mo", features: ["Unlimited projects", "All blocks", "AI edits", "Priority support"], cta: "Go Pro", highlighted: true },
      ],
    }),
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
      {
        key: "plans",
        label: "Plans",
        type: "objects",
        itemLabel: "Plan",
        schema: [
          { key: "name", label: "Name", type: "text" },
          { key: "price", label: "Price", type: "text" },
          { key: "period", label: "Period", type: "text" },
          { key: "features", label: "Features", type: "strings" },
          { key: "cta", label: "Button label", type: "text" },
          { key: "highlighted", label: "Highlighted", type: "boolean" },
        ],
        blank: () => ({ name: "New plan", price: "€0", period: "/mo", features: ["Feature"], cta: "Choose", highlighted: false }),
      },
    ],
    render: (p, _t) => {
      const plans = list(p.plans)
        .map((plan) => {
          const pl = plan as Record<string, unknown>;
          const feats = list<string>(pl.features)
            .map((f) => `<li style="padding:6px 0;">${esc(f)}</li>`)
            .join("");
          const hot = Boolean(pl.highlighted);
          return `<div class="lpb-card" style="${hot ? "border-color:var(--color-primary);box-shadow:var(--shadow-md);" : ""}">
        <h3>${esc(str(pl.name))}</h3>
        <p style="font-size:2.4rem;font-family:var(--font-heading);font-weight:700;margin:.2em 0;">${esc(str(pl.price))}<span class="lpb-muted" style="font-size:1rem;font-weight:400;">${esc(str(pl.period))}</span></p>
        <ul style="list-style:none;padding:0;margin:16px 0 24px;">${feats}</ul>
        <a class="lpb-btn ${hot ? "lpb-btn--primary" : "lpb-btn--ghost"}" href="#" style="width:100%;text-align:center;">${esc(str(pl.cta, "Choose"))}</a>
      </div>`;
        })
        .join("");
      const cols = list(p.plans).length === 2 ? "lpb-grid--2" : "lpb-grid--3";
      return `<section class="lpb-section" style="background:var(--color-surface);">
  <div class="lpb-container">
    <div class="lpb-center" style="margin-bottom:48px;">
      <h2>${esc(str(p.title, "Pricing"))}</h2>
      <p class="lpb-lead" style="margin:0 auto;">${esc(str(p.subtitle))}</p>
    </div>
    <div class="lpb-grid ${cols}" style="max-width:820px;margin:0 auto;">${plans}</div>
  </div>
</section>`;
    },
  },

  richtext: {
    type: "richtext",
    label: "Rich text",
    description: "A free text section.",
    defaults: () => ({
      title: "About us",
      body: "Tell your story here. Describe what you do and why it matters to your customers.",
    }),
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "body", label: "Body", type: "textarea" },
    ],
    render: (p, _t) => `<section class="lpb-section">
  <div class="lpb-container" style="max-width:760px;">
    ${str(p.title) ? `<h2>${esc(p.title)}</h2>` : ""}
    <p class="lpb-muted" style="font-size:1.1rem;">${esc(str(p.body))}</p>
  </div>
</section>`,
  },

  footer: {
    type: "footer",
    label: "Footer",
    description: "Closing bar with links and copyright.",
    defaults: () => ({
      brand: "Your Brand",
      links: ["Privacy", "Terms", "Contact"],
      copyright: "© 2026 Your Brand. All rights reserved.",
    }),
    fields: [
      { key: "brand", label: "Brand name", type: "text" },
      { key: "links", label: "Links", type: "strings" },
      { key: "copyright", label: "Copyright", type: "text" },
    ],
    render: (p, _t) => {
      const links = list<string>(p.links)
        .map((l) => `<a href="#" class="lpb-muted">${esc(l)}</a>`)
        .join("");
      return `<footer style="background:var(--color-secondary);color:#fff;padding:48px 0;">
  <div class="lpb-container" style="display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;">
    <strong style="font-family:var(--font-heading);">${esc(str(p.brand, "Your Brand"))}</strong>
    <nav style="display:flex;gap:24px;">${links}</nav>
    <small style="color:rgba(255,255,255,.6);">${esc(str(p.copyright))}</small>
  </div>
</footer>`;
    },
  },
};

export const BLOCK_LIST: BlockDefinition[] = Object.values(BLOCKS);

let counter = 0;
/** Create a new block instance with sensible defaults. */
export function createBlock(type: BlockType): BlockInstance {
  counter += 1;
  const id = `blk_${Date.now().toString(36)}_${counter}`;
  return { id, type, props: BLOCKS[type].defaults() };
}

/** Render a single block instance to HTML (honours AI custom overrides). */
export function renderBlock(block: BlockInstance, t: BrandTokens): string {
  if (block.customHtml && block.customHtml.trim().length > 0) {
    return block.customHtml;
  }
  const def = BLOCKS[block.type];
  if (!def) return "";
  return def.render(block.props, t);
}
