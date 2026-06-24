"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Save,
  FolderOpen,
  Download,
  Copy,
  Sparkles,
  Wand2,
  Trash2,
  RotateCcw,
  Plus,
  Palette,
  Layers as LayersIcon,
  FileText,
} from "lucide-react";
import type { BlockInstance, BlockType, BrandTokens, PageDoc } from "@/lib/types";
import { DEFAULT_TOKENS } from "@/lib/tokens";
import { BLOCKS, BLOCK_LIST, createBlock, renderBlock } from "@/lib/blocks";
import { buildHtmlDocument, buildPreviewDocument } from "@/lib/export";
import {
  ANTHROPIC_KEY_HEADER,
  MOCA_CLIENT_HEADER,
  MOCA_USER_HEADER,
} from "@/lib/moca-headers";
import { useMoca } from "./MocaProvider";
import { Layers } from "./Layers";
import { ContentForm } from "./ContentForm";

const STORAGE_KEY = "moca-lpb:v1";
const MOCA_LOGO = "https://mocainteractive.com/assets/svg/logo.svg";

function starterPage(): PageDoc {
  const types: BlockType[] = ["header", "hero", "features", "cta", "footer"];
  return {
    title: "Landing senza titolo",
    brand: DEFAULT_TOKENS,
    blocks: types.map((t) => createBlock(t)),
  };
}

export default function Editor() {
  const { sdk, session } = useMoca();
  const [page, setPage] = useState<PageDoc>(starterPage);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Build request headers carrying the Hub AI key + Moca identity.
  const buildHeaders = useCallback(
    (json = true): Record<string, string> => {
      const h: Record<string, string> = {};
      if (json) h["content-type"] = "application/json";
      const key = sdk.getConfig("ANTHROPIC_API_KEY");
      if (key) h[ANTHROPIC_KEY_HEADER] = key;
      const clientId = session?.client?.id;
      if (clientId) h[MOCA_CLIENT_HEADER] = clientId;
      const userId = session?.user?.id;
      if (userId) h[MOCA_USER_HEADER] = userId;
      return h;
    },
    [sdk, session],
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPage(JSON.parse(raw) as PageDoc);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(page));
    } catch {
      /* ignore */
    }
  }, [page, hydrated]);

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

  // ---- block mutators ----
  const addBlock = useCallback((type: BlockType) => {
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
      return { ...p, blocks: ids.map((id) => byId.get(id)!).filter(Boolean) };
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
      blocks: p.blocks.map((b) => (b.id === id ? { ...b, customHtml: undefined } : b)),
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

  const loadProject = useCallback((doc: PageDoc, id: string) => {
    setPage(doc);
    setProjectId(id);
    setSelectedId(null);
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
    // Best-effort: archive the export version on Supabase (if configured).
    fetch("/api/exports", {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({ projectId, title: page.title, html: doc }),
    }).catch(() => {});
  }, [page, projectId, buildHeaders]);

  return (
    <div className="editor">
      <header className="topbar">
        <div className="client-info">
          {session?.client?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="client-logo" src={session.client.logo_url} alt="" />
          )}
          <div>
            <div className="client-name">{session?.client?.name ?? "Cliente"}</div>
            <div className="client-sub">
              {session?.user?.name}
              {session?.user?.role ? ` · ${session.user.role}` : ""}
            </div>
          </div>
        </div>
        <div className="app-title">Landing Page Builder</div>
        <div className="topbar-actions">
          <button
            className="ed-btn"
            onClick={() => navigator.clipboard?.writeText(buildHtmlDocument(page))}
          >
            <Copy size={15} /> Copia HTML
          </button>
          <button className="ed-btn ed-btn--primary" onClick={exportHtml}>
            <Download size={15} /> Esporta HTML
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="moca-logo" src={MOCA_LOGO} alt="Moca" />
        </div>
      </header>

      {/* LEFT */}
      <aside className="sidebar">
        <ProjectPanel
          title={page.title}
          onTitle={(t) => setPage((p) => ({ ...p, title: t }))}
          page={page}
          projectId={projectId}
          onProjectId={setProjectId}
          onLoad={loadProject}
          buildHeaders={buildHeaders}
        />
        <div className="panel">
          <h3>
            <Plus size={13} /> Aggiungi blocco
          </h3>
          <div className="palette">
            {BLOCK_LIST.map((def) => (
              <button
                key={def.type}
                className="ed-btn ed-btn--ghost"
                onClick={() => addBlock(def.type)}
                title={def.description}
              >
                {def.label}
                <small>{def.description}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <h3>
            <LayersIcon size={13} /> Livelli · trascina per riordinare
          </h3>
          <Layers
            blocks={page.blocks}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onReorder={reorder}
          />
        </div>
      </aside>

      {/* CENTER */}
      <main className="canvas">
        <iframe
          title="Anteprima"
          srcDoc={previewDoc}
          sandbox="allow-scripts allow-same-origin"
        />
      </main>

      {/* RIGHT */}
      <aside className="inspector">
        <BrandPanel brand={page.brand} onBrand={setBrand} buildHeaders={buildHeaders} />
        <Inspector
          block={selected}
          brand={page.brand}
          onApplyEdit={applyEdit}
          onReset={resetBlock}
          onRemove={removeBlock}
          onUpdateProps={updateProps}
          buildHeaders={buildHeaders}
        />
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------

type Headers = (json?: boolean) => Record<string, string>;

interface ProjectRow {
  id: string;
  title: string;
  updated_at: string;
}

function ProjectPanel({
  title,
  onTitle,
  page,
  projectId,
  onProjectId,
  onLoad,
  buildHeaders,
}: {
  title: string;
  onTitle: (t: string) => void;
  page: PageDoc;
  projectId: string | null;
  onProjectId: (id: string | null) => void;
  onLoad: (doc: PageDoc, id: string) => void;
  buildHeaders: Headers;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<ProjectRow[] | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({ id: projectId, title, data: page }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Salvataggio fallito");
      if (data.id) onProjectId(data.id);
      setNote("Progetto salvato.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Salvataggio fallito");
    } finally {
      setBusy(false);
    }
  }

  async function toggleList() {
    if (list) {
      setList(null);
      return;
    }
    setError(null);
    try {
      const res = await fetch("/api/projects", { headers: buildHeaders(false) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Caricamento fallito");
      setList(data.projects as ProjectRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Caricamento fallito");
    }
  }

  async function open(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}`, { headers: buildHeaders(false) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Apertura fallita");
      onLoad(data.project.data as PageDoc, id);
      setList(null);
      setNote("Progetto caricato.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Apertura fallita");
    }
  }

  return (
    <div className="panel">
      <h3>
        <FileText size={13} /> Progetto
      </h3>
      <div className="field">
        <label>Titolo</label>
        <input
          className="input"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="ed-btn ed-btn--primary"
          onClick={save}
          disabled={busy}
          style={{ flex: 1, justifyContent: "center" }}
        >
          <Save size={15} /> {busy ? "Salvo…" : "Salva"}
        </button>
        <button
          className="ed-btn"
          onClick={toggleList}
          style={{ justifyContent: "center" }}
        >
          <FolderOpen size={15} /> Progetti
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {note && <p className="hint" style={{ marginTop: 8 }}>{note}</p>}

      {list && (
        <div style={{ marginTop: 12 }}>
          {list.length === 0 && <p className="hint">Nessun progetto salvato.</p>}
          {list.map((p) => (
            <div className="proj-item" key={p.id}>
              <span className="name" onClick={() => open(p.id)}>
                {p.title}
              </span>
              <span className="meta">
                {new Date(p.updated_at).toLocaleDateString("it-IT")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BrandPanel({
  brand,
  onBrand,
  buildHeaders,
}: {
  brand: BrandTokens;
  onBrand: (b: BrandTokens) => void;
  buildHeaders: Headers;
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
        headers: buildHeaders(),
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Estrazione fallita");
      onBrand(data.tokens as BrandTokens);
      setNote(data.usedAi ? "Brand estratto con AI." : "Brand euristico (senza AI).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Estrazione fallita");
    } finally {
      setLoading(false);
    }
  }

  async function saveBrand() {
    setNote(null);
    setError(null);
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({ name: brand.name ?? "Brand", tokens: brand }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Salvataggio brand fallito");
      setNote("Brand salvato nella libreria.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Salvataggio brand fallito");
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
      <h3>
        <Palette size={13} /> Brand
      </h3>
      <div className="field">
        <label>URL sito del cliente</label>
        <input
          className="input"
          placeholder="esempio.it"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && extract()}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="ed-btn ed-btn--primary"
          onClick={extract}
          disabled={loading}
          style={{ flex: 1, justifyContent: "center" }}
        >
          <Sparkles size={15} /> {loading ? "Estraggo…" : "Estrai brand"}
        </button>
        <button className="ed-btn" onClick={saveBrand} title="Salva nella libreria brand">
          <Save size={15} />
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {note && <p className="hint" style={{ marginTop: 8 }}>{note}</p>}

      <div style={{ marginTop: 16 }}>
        <div className="kv">
          <span>Nome</span>
          <b>{brand.name}</b>
        </div>
        <div className="kv">
          <span>Font titoli</span>
          <b>{brand.typography.headingFont}</b>
        </div>
        <div className="kv">
          <span>Font testo</span>
          <b>{brand.typography.bodyFont}</b>
        </div>
        <div className="swatches" style={{ marginTop: 10 }}>
          {swatches.map(([name, color]) => (
            <span
              key={name}
              className="swatch"
              style={{ background: color }}
              title={`${name}: ${color}`}
            />
          ))}
        </div>
        {brand.toneOfVoice?.summary && (
          <p className="hint" style={{ marginTop: 10 }}>
            <b style={{ color: "var(--moca-black)" }}>Tono:</b>{" "}
            {brand.toneOfVoice.summary}
          </p>
        )}
      </div>

      <details style={{ marginTop: 14 }}>
        <summary
          style={{ cursor: "pointer", fontSize: 12, color: "var(--moca-gray)" }}
        >
          Modifica token manualmente
        </summary>
        <div style={{ marginTop: 12 }}>
          {(
            [
              ["primary", "Primario"],
              ["secondary", "Secondario"],
              ["accent", "Accento"],
              ["background", "Sfondo"],
              ["surface", "Superficie"],
              ["text", "Testo"],
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
                  onBrand({ ...brand, colors: { ...brand.colors, [key]: e.target.value } })
                }
                style={{
                  width: 34,
                  height: 28,
                  padding: 0,
                  border: "none",
                  background: "none",
                }}
                aria-label={label}
              />
              <span style={{ fontSize: 12, color: "var(--moca-gray)" }}>{label}</span>
              <code style={{ marginLeft: "auto", fontSize: 11 }}>{brand.colors[key]}</code>
            </div>
          ))}
          <div className="field" style={{ marginTop: 10 }}>
            <label>Font titoli (Google Font)</label>
            <input
              className="input"
              value={brand.typography.headingFont}
              onChange={(e) => onBrand(setFont(brand, "headingFont", e.target.value))}
            />
          </div>
          <div className="field">
            <label>Font testo (Google Font)</label>
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

function Inspector({
  block,
  brand,
  onApplyEdit,
  onReset,
  onRemove,
  onUpdateProps,
  buildHeaders,
}: {
  block: BlockInstance | null;
  brand: BrandTokens;
  onApplyEdit: (id: string, html: string) => void;
  onReset: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateProps: (id: string, props: Record<string, unknown>) => void;
  buildHeaders: Headers;
}) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setComment("");
    setError(null);
    setNote(null);
  }, [block?.id]);

  if (!block) {
    return (
      <div className="panel">
        <h3>
          <Wand2 size={13} /> Ispettore
        </h3>
        <p className="hint">
          Clicca una sezione nell&apos;anteprima (o un livello a sinistra) per
          selezionarla, poi modifica i contenuti o lascia un commento all&apos;AI.
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
        headers: buildHeaders(),
        body: JSON.stringify({
          blockType: block.type,
          currentHtml,
          comment,
          tokens: brand,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Modifica fallita");
      onApplyEdit(block.id, data.html as string);
      setNote(data.note || "Aggiornato.");
      setComment("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Modifica fallita");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <h3>
        <Wand2 size={13} /> Ispettore ·{" "}
        <span style={{ textTransform: "capitalize", color: "var(--moca-black)" }}>
          {block.type}
        </span>
      </h3>

      {block.customHtml ? (
        <p className="hint" style={{ marginBottom: 14 }}>
          Questo blocco è una modifica AI (HTML grezzo). Premi “Ripristina” per
          tornare a modificarne i campi.
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
        <label>Commento per l&apos;AI</label>
        <textarea
          className="textarea"
          placeholder={`es. "Rendi il titolo più breve e incisivo e cambia il bottone in 'Prenota una demo'."`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <button
        className="ed-btn ed-btn--primary"
        onClick={applyComment}
        disabled={loading || !comment.trim()}
        style={{ width: "100%", justifyContent: "center" }}
      >
        <Sparkles size={15} /> {loading ? "Modifico…" : "Applica modifica AI"}
      </button>
      {error && <p className="error">{error}</p>}
      {note && <p className="hint" style={{ marginTop: 8 }}>{note}</p>}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        {block.customHtml && (
          <button className="ed-btn ed-btn--ghost" onClick={() => onReset(block.id)}>
            <RotateCcw size={15} /> Ripristina
          </button>
        )}
        <button className="ed-btn ed-btn--danger" onClick={() => onRemove(block.id)}>
          <Trash2 size={15} /> Elimina
        </button>
      </div>
    </div>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
