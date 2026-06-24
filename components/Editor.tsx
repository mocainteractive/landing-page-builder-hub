"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BlockInstance, BlockType, BrandTokens, PageDoc } from "@/lib/types";
import { DEFAULT_TOKENS } from "@/lib/tokens";
import { BLOCKS, BLOCK_LIST, createBlock, renderBlock } from "@/lib/blocks";
import { buildHtmlDocument, buildPreviewDocument } from "@/lib/export";
import { Layers } from "./Layers";
import { ContentForm } from "./ContentForm";

const STORAGE_KEY = "moca-lpb:v1";

function starterPage(): PageDoc {
  const types: BlockType[] = ["header", "hero", "features", "cta", "footer"];
  return {
    title: "Untitled landing page",
    brand: DEFAULT_TOKENS,
    blocks: types.map((t) => createBlock(t)),
  };
}

export default function Editor() {
  const [page, setPage] = useState<PageDoc>(starterPage);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted page once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPage(JSON.parse(raw) as PageDoc);
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  // Persist on change.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(page));
    } catch {
      /* storage full / disabled */
    }
  }, [page, hydrated]);

  // Receive block selection from the preview iframe.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.source === "lpb-preview" && e.data?.type === "select") {
        setSelectedId(String(e.data.id));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const previewDoc = useMemo(
    () => buildPreviewDocument(page, selectedId ?? undefined),
    [page, selectedId],
  );

  const selected = page.blocks.find((b) => b.id === selectedId) ?? null;

  // ---- mutators ----
  const addBlockSafe = useCallback((type: BlockType) => {
    const block = createBlock(type);
    setPage((p) => {
      const footerIdx = p.blocks.findIndex((b) => b.type === "footer");
      const blocks = [...p.blocks];
      if (type !== "footer" && footerIdx !== -1) blocks.splice(footerIdx, 0, block);
      else blocks.push(block);
      return { ...p, blocks };
    });
    setSelectedId(block.id);
  }, []);

  const reorder = useCallback((ids: string[]) => {
    setPage((p) => {
      const byId = new Map(p.blocks.map((b) => [b.id, b]));
      const blocks = ids.map((id) => byId.get(id)!).filter(Boolean);
      return { ...p, blocks };
    });
  }, []);

  const removeBlock = useCallback((id: string) => {
    setPage((p) => ({ ...p, blocks: p.blocks.filter((b) => b.id !== id) }));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const applyEdit = useCallback((id: string, html: string) => {
    setPage((p) => ({
      ...p,
      blocks: p.blocks.map((b) => (b.id === id ? { ...b, customHtml: html } : b)),
    }));
  }, []);

  const resetBlock = useCallback((id: string) => {
    setPage((p) => ({
      ...p,
      blocks: p.blocks.map((b) =>
        b.id === id ? { ...b, customHtml: undefined } : b,
      ),
    }));
  }, []);

  const updateProps = useCallback((id: string, props: Record<string, unknown>) => {
    setPage((p) => ({
      ...p,
      blocks: p.blocks.map((b) => (b.id === id ? { ...b, props } : b)),
    }));
  }, []);

  const setBrand = useCallback((brand: BrandTokens) => {
    setPage((p) => ({ ...p, brand }));
  }, []);

  // ---- export ----
  const exportHtml = useCallback(() => {
    const doc = buildHtmlDocument(page);
    const blob = new Blob([doc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(page.title) || "landing-page"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [page]);

  return (
    <div className="editor">
      <div className="topbar">
        <span className="brand-mark">Moca&nbsp;Hub</span>
        <input
          className="title-input"
          value={page.title}
          onChange={(e) => setPage((p) => ({ ...p, title: e.target.value }))}
          aria-label="Page title"
        />
        <div className="spacer" />
        <span className="badge">{page.blocks.length} blocks</span>
        <button className="ed-btn" onClick={() => navigator.clipboard?.writeText(buildHtmlDocument(page))}>
          Copy HTML
        </button>
        <button className="ed-btn ed-btn--primary" onClick={exportHtml}>
          ⬇ Export HTML
        </button>
      </div>

      {/* LEFT: palette + layers */}
      <aside className="sidebar">
        <div className="panel">
          <h3>Add block</h3>
          <div className="palette">
            {BLOCK_LIST.map((def) => (
              <button
                key={def.type}
                className="ed-btn ed-btn--ghost"
                onClick={() => addBlockSafe(def.type)}
                title={def.description}
              >
                {def.label}
                <small>{def.description}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <h3>Layers · drag to reorder</h3>
          <Layers
            blocks={page.blocks}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onReorder={reorder}
          />
        </div>
      </aside>

      {/* CENTER: live preview */}
      <main className="canvas">
        <iframe title="Preview" srcDoc={previewDoc} sandbox="allow-scripts allow-same-origin" />
      </main>

      {/* RIGHT: brand + inspector */}
      <aside className="inspector">
        <BrandPanel brand={page.brand} onBrand={setBrand} />
        <Inspector
          block={selected}
          brand={page.brand}
          onApplyEdit={applyEdit}
          onReset={resetBlock}
          onRemove={removeBlock}
          onUpdateProps={updateProps}
        />
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------

function BrandPanel({
  brand,
  onBrand,
}: {
  brand: BrandTokens;
  onBrand: (b: BrandTokens) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function extract() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/brand/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Extraction failed");
      onBrand(data.tokens as BrandTokens);
      setNote(data.usedAi ? "Brand extracted with AI." : "Heuristic brand (no AI key).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setLoading(false);
    }
  }

  const swatches: Array<[string, string]> = [
    ["primary", brand.colors.primary],
    ["secondary", brand.colors.secondary],
    ["accent", brand.colors.accent],
    ["surface", brand.colors.surface],
    ["text", brand.colors.text],
  ];

  return (
    <div className="panel">
      <h3>Brand skill</h3>
      <div className="field">
        <label>Client website URL</label>
        <input
          className="input"
          placeholder="example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && extract()}
        />
      </div>
      <button className="ed-btn ed-btn--primary" onClick={extract} disabled={loading} style={{ width: "100%" }}>
        {loading ? <span className="spin" /> : "✦"} {loading ? "Extracting…" : "Extract brand"}
      </button>
      {error && <p className="error">{error}</p>}
      {note && <p className="hint" style={{ marginTop: 8 }}>{note}</p>}

      <div style={{ marginTop: 16 }}>
        <div className="kv">
          <span>Name</span>
          <b>{brand.name}</b>
        </div>
        <div className="kv">
          <span>Heading font</span>
          <b>{brand.typography.headingFont}</b>
        </div>
        <div className="kv">
          <span>Body font</span>
          <b>{brand.typography.bodyFont}</b>
        </div>
        <div className="swatches" style={{ marginTop: 10 }}>
          {swatches.map(([name, color]) => (
            <span key={name} className="swatch" style={{ background: color }} title={`${name}: ${color}`} />
          ))}
        </div>
        {brand.toneOfVoice?.summary && (
          <p className="hint" style={{ marginTop: 10 }}>
            <b style={{ color: "var(--ed-text)" }}>Tone:</b> {brand.toneOfVoice.summary}
          </p>
        )}
      </div>

      <details style={{ marginTop: 14 }}>
        <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--ed-muted)" }}>
          Adjust tokens manually
        </summary>
        <div style={{ marginTop: 12 }}>
          {(
            [
              ["primary", "Primary"],
              ["secondary", "Secondary"],
              ["accent", "Accent"],
              ["background", "Background"],
              ["surface", "Surface"],
              ["text", "Text"],
            ] as Array<[keyof BrandTokens["colors"], string]>
          ).map(([key, label]) => (
            <div
              key={key}
              style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}
            >
              <input
                type="color"
                value={toHex(brand.colors[key])}
                onChange={(e) =>
                  onBrand({
                    ...brand,
                    colors: { ...brand.colors, [key]: e.target.value },
                  })
                }
                style={{ width: 34, height: 28, padding: 0, border: "none", background: "none" }}
                aria-label={label}
              />
              <span style={{ fontSize: 12, color: "var(--ed-muted)" }}>{label}</span>
              <code style={{ marginLeft: "auto", fontSize: 11 }}>{brand.colors[key]}</code>
            </div>
          ))}

          <div className="field" style={{ marginTop: 10 }}>
            <label>Heading font (Google Font)</label>
            <input
              className="input"
              value={brand.typography.headingFont}
              onChange={(e) =>
                onBrand(setFont(brand, "headingFont", e.target.value))
              }
            />
          </div>
          <div className="field">
            <label>Body font (Google Font)</label>
            <input
              className="input"
              value={brand.typography.bodyFont}
              onChange={(e) => onBrand(setFont(brand, "bodyFont", e.target.value))}
            />
          </div>
        </div>
      </details>
    </div>
  );
}

/** Coerce any CSS color to a #rrggbb value the native color input accepts. */
function toHex(color: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    return (
      "#" +
      color
        .slice(1)
        .split("")
        .map((c) => c + c)
        .join("")
    );
  }
  return "#000000";
}

/** Update a font family and keep googleFonts in sync so the preview loads it. */
function setFont(
  brand: BrandTokens,
  which: "headingFont" | "bodyFont",
  value: string,
): BrandTokens {
  const typography = { ...brand.typography, [which]: value };
  typography.googleFonts = [
    ...new Set([typography.headingFont, typography.bodyFont].filter(Boolean)),
  ];
  return { ...brand, typography };
}

function Inspector({
  block,
  brand,
  onApplyEdit,
  onReset,
  onRemove,
  onUpdateProps,
}: {
  block: BlockInstance | null;
  brand: BrandTokens;
  onApplyEdit: (id: string, html: string) => void;
  onReset: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateProps: (id: string, props: Record<string, unknown>) => void;
}) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // Reset transient state when selection changes.
  useEffect(() => {
    setComment("");
    setError(null);
    setNote(null);
  }, [block?.id]);

  if (!block) {
    return (
      <div className="panel">
        <h3>Inspector</h3>
        <p className="hint">
          Click a section in the preview (or a layer on the left) to select it,
          then leave a comment for the AI to edit just that block.
        </p>
      </div>
    );
  }

  async function applyComment() {
    if (!comment.trim() || !block) return;
    setLoading(true);
    setError(null);
    setNote(null);
    try {
      const currentHtml = renderBlock(block, brand);
      const res = await fetch("/api/block/edit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          blockType: block.type,
          currentHtml,
          comment,
          tokens: brand,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Edit failed");
      onApplyEdit(block.id, data.html as string);
      setNote(data.note || "Updated.");
      setComment("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Edit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <h3>
        Inspector · <span style={{ textTransform: "capitalize", color: "var(--ed-text)" }}>{block.type}</span>
      </h3>

      {block.customHtml ? (
        <p className="hint" style={{ marginBottom: 14 }}>
          This block is an AI-edited override (raw HTML). Reset it below to edit
          fields again.
        </p>
      ) : (
        <div style={{ marginBottom: 18 }}>
          <ContentForm
            fields={BLOCKS[block.type].fields}
            value={block.props}
            onChange={(next) => onUpdateProps(block.id, next)}
          />
        </div>
      )}

      <div className="field">
        <label>Comment for the AI</label>
        <textarea
          className="textarea"
          placeholder={`e.g. "Make the headline shorter and punchier, and change the button to 'Book a demo'."`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <button
        className="ed-btn ed-btn--primary"
        onClick={applyComment}
        disabled={loading || !comment.trim()}
        style={{ width: "100%" }}
      >
        {loading ? <span className="spin" /> : "✦"} {loading ? "Editing…" : "Apply AI edit"}
      </button>
      {error && <p className="error">{error}</p>}
      {note && <p className="hint" style={{ marginTop: 8 }}>{note}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        {block.customHtml && (
          <button className="ed-btn ed-btn--ghost" onClick={() => onReset(block.id)}>
            ↺ Reset block
          </button>
        )}
        <button className="ed-btn ed-btn--danger" onClick={() => onRemove(block.id)}>
          🗑 Delete
        </button>
      </div>

      <p className="hint" style={{ marginTop: 16 }}>
        {block.customHtml
          ? "This block has an AI-edited override. Reset to return to the default, brand-driven version."
          : "This block renders from the brand tokens. Your comment edits only this section."}
      </p>
    </div>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
