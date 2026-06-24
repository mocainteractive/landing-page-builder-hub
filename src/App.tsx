import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Layers as LayersIcon, Download, Copy } from "lucide-react";
import { useMoca } from "@/lib/MocaProvider";
import type { BlockType, BrandTokens, PageDoc } from "@/lib/types";
import { DEFAULT_TOKENS } from "@/lib/tokens";
import { BLOCK_LIST, createBlock } from "@/lib/blocks";
import { buildHtmlDocument, buildPreviewDocument } from "@/lib/export";
import { saveExport } from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import { Layers } from "@/components/Layers";
import { Preview } from "@/components/Preview";
import { ProjectPanel } from "@/components/ProjectPanel";
import { BrandPanel } from "@/components/BrandPanel";
import { Inspector } from "@/components/Inspector";
import { sectionTitle } from "@/lib/ui";

const STORAGE_KEY = "moca-lpb:v2";

function starterPage(): PageDoc {
  const types: BlockType[] = ["header", "hero", "features", "cta", "footer"];
  return {
    title: "Landing senza titolo",
    brand: DEFAULT_TOKENS,
    blocks: types.map((t) => createBlock(t)),
  };
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function App() {
  const { client, getConfig } = useMoca();
  const apiKey = getConfig("ANTHROPIC_API_KEY");

  const [page, setPage] = useState<PageDoc>(starterPage);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

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

  const exportHtml = useCallback(() => {
    const doc = buildHtmlDocument(page);
    const blob = new Blob([doc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(page.title) || "landing-page"}.html`;
    a.click();
    URL.revokeObjectURL(url);
    // Best-effort archive (requires Supabase session).
    saveExport({ clientId: client.id, projectId, title: page.title, html: doc }).catch(
      () => {},
    );
  }, [page, projectId, client.id]);

  const headerActions = (
    <>
      <button
        className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-white/10 transition-colors"
        onClick={() => navigator.clipboard?.writeText(buildHtmlDocument(page))}
      >
        <Copy size={16} /> Copia HTML
      </button>
      <button
        className="inline-flex items-center gap-2 px-3 py-2 bg-moca-red rounded-md text-sm font-medium hover:bg-moca-red-dark transition-colors"
        onClick={exportHtml}
      >
        <Download size={16} /> <span className="hidden sm:inline">Esporta HTML</span>
      </button>
    </>
  );

  return (
    <div className="h-screen flex flex-col bg-moca-bg">
      <AppHeader appTitle="Landing Page Builder" actions={headerActions} />

      <div className="flex-1 min-h-0 flex">
        {/* LEFT */}
        <aside className="w-80 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          <ProjectPanel
            title={page.title}
            onTitle={(t) => setPage((p) => ({ ...p, title: t }))}
            page={page}
            projectId={projectId}
            clientId={client.id}
            onProjectId={setProjectId}
            onLoad={loadProject}
          />
          <div className="p-4 border-b border-gray-200">
            <h3 className={sectionTitle}>
              <Plus size={13} /> Aggiungi blocco
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {BLOCK_LIST.map((def) => (
                <button
                  key={def.type}
                  onClick={() => addBlock(def.type)}
                  title={def.description}
                  className="text-left p-2.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <span className="block text-sm font-semibold text-moca-black">
                    {def.label}
                  </span>
                  <span className="block text-[11px] text-moca-gray leading-snug mt-0.5">
                    {def.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="p-4">
            <h3 className={sectionTitle}>
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
        <main className="flex-1 min-w-0 p-4">
          <Preview doc={previewDoc} />
        </main>

        {/* RIGHT */}
        <aside className="w-80 flex-shrink-0 bg-white border-l border-gray-200 overflow-y-auto">
          <BrandPanel
            brand={page.brand}
            onBrand={setBrand}
            apiKey={apiKey}
            clientId={client.id}
          />
          <Inspector
            block={selected}
            brand={page.brand}
            apiKey={apiKey}
            onApplyEdit={applyEdit}
            onReset={resetBlock}
            onRemove={removeBlock}
            onUpdateProps={updateProps}
          />
        </aside>
      </div>
    </div>
  );
}
