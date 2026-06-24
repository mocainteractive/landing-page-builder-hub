import { useState } from "react";
import { Save, FolderOpen, FileText } from "lucide-react";
import type { PageDoc } from "@/lib/types";
import {
  listProjects,
  saveProject,
  getProject,
  type ProjectRow,
} from "@/lib/api";
import { input, fieldLabel, sectionTitle, btnPrimary, btnSecondary } from "@/lib/ui";

export function ProjectPanel({
  title,
  onTitle,
  page,
  projectId,
  clientId,
  onProjectId,
  onLoad,
}: {
  title: string;
  onTitle: (t: string) => void;
  page: PageDoc;
  projectId: string | null;
  clientId: string;
  onProjectId: (id: string | null) => void;
  onLoad: (doc: PageDoc, id: string) => void;
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
      const id = await saveProject({ id: projectId, clientId, title, data: page });
      onProjectId(id);
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
      setList(await listProjects(clientId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Caricamento fallito");
    }
  }

  async function open(id: string) {
    setError(null);
    try {
      const doc = await getProject(id, clientId);
      onLoad(doc, id);
      setList(null);
      setNote("Progetto caricato.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Apertura fallita");
    }
  }

  return (
    <div className="p-4 border-b border-gray-200">
      <h3 className={sectionTitle}>
        <FileText size={13} /> Progetto
      </h3>
      <div className="mb-3">
        <label className={fieldLabel}>Titolo</label>
        <input className={input} value={title} onChange={(e) => onTitle(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button className={`${btnPrimary} flex-1`} onClick={save} disabled={busy}>
          <Save size={15} /> {busy ? "Salvo…" : "Salva"}
        </button>
        <button className={btnSecondary} onClick={toggleList}>
          <FolderOpen size={15} /> Progetti
        </button>
      </div>
      {error && <p className="text-danger text-xs mt-2">{error}</p>}
      {note && <p className="text-moca-gray text-xs mt-2">{note}</p>}

      {list && (
        <div className="mt-3">
          {list.length === 0 && (
            <p className="text-xs text-moca-gray">Nessun progetto salvato.</p>
          )}
          {list.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 px-2.5 py-2 border border-gray-200 rounded-md mb-1.5 bg-white"
            >
              <span
                className="flex-1 text-sm font-semibold cursor-pointer hover:text-moca-red"
                onClick={() => open(p.id)}
              >
                {p.title}
              </span>
              <span className="text-[11px] text-moca-gray">
                {new Date(p.updated_at).toLocaleDateString("it-IT")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
