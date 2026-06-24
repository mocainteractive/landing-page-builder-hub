// Core data models shared across the Moca Hub landing page builder.

/** Design tokens extracted from a client's brand and used to drive every block. */
export interface BrandTokens {
  /** Source URL the brand was extracted from (if any). */
  source?: string;
  /** Human label for the brand (company / project name). */
  name?: string;
  /** Logo URL discovered on the site (optional). */
  logo?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
  };
  typography: {
    /** Font family for headings, e.g. "Poppins". */
    headingFont: string;
    /** Font family for body copy. */
    bodyFont: string;
    /** Google Font families to load (subset of the two above when available). */
    googleFonts: string[];
    /** Base body font size, e.g. "16px". */
    baseSize: string;
    /** Modular scale ratio for heading sizes, e.g. 1.25. */
    scale: number;
    headingWeight: number;
    bodyWeight: number;
  };
  radius: { sm: string; md: string; lg: string };
  shadow: { sm: string; md: string };
  /** Tone of voice guidance to keep AI edits on-brand. */
  toneOfVoice: {
    summary: string;
    adjectives: string[];
  };
}

export type BlockType =
  | "header"
  | "hero"
  | "features"
  | "cta"
  | "testimonial"
  | "pricing"
  | "richtext"
  | "footer";

/** An instance of a block placed on the page. */
export interface BlockInstance {
  id: string;
  type: BlockType;
  /** Editable content for the block (text, image URLs, lists, ...). */
  props: Record<string, unknown>;
  /**
   * When set, this raw HTML replaces the default render output for the block.
   * Produced by AI edits so a single section can diverge without touching the rest.
   */
  customHtml?: string;
}

/** A full page is just an ordered list of blocks plus the active brand. */
export interface PageDoc {
  title: string;
  brand: BrandTokens;
  blocks: BlockInstance[];
}

/** A comment attached to a block, used to request an AI edit. */
export interface BlockComment {
  blockId: string;
  text: string;
}
