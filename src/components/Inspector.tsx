import { useEffect, useState } from "react";
import { Wand2, Sparkles, RotateCcw, Trash2 } from "lucide-react";
import type { BlockInstance, BrandTokens } from "@/lib/types";
import { BLOCKS, renderBlock } from "@/lib/blocks";
import { aiEditBlock } from "@/lib/api";
import { ContentForm } from "./ContentForm";
import { textarea, fieldLabel, sectionTitle, btnPrimary, btnSecondary, btnDanger } from "@/lib/ui";

export function Inspector({
  block,
  brand,
  apiKey,
  onApplyEdit,
  onReset,
  onRemove,
  onUpdateProps,
}: {
  block: BlockInstance | null;
  brand: BrandTokens;
  apiKey: string | null;
  onApplyEdit: (id: string, html: string) => void;
  onReset: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateProps: (id: string, props: Record<string, unknown>) => void;
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
      <div className="p-4 border-b border-gray-200">
        <h3 className={sectionTitle}>
          <Wand2 size={13} /> Ispettore
        </h3>
        <p className="text-xs text-moca-gray leading-relaxed">
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
      const data = await aiEditBlock(
        { blockType: block.type, currentHtml, comment, tokens: brand },
        apiKey,
      );
      onApplyEdit(block.id, data.html);
      setNote(data.note || "Aggiornato.");
      setComment("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Modifica fallita");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 border-b border-gray-200">
      <h3 className={sectionTitle}>
        <Wand2 size={13} /> Ispettore ·{" "}
        <span className="capitalize text-moca-black">{block.type}</span>
      </h3>

      {block.customHtml ? (
        <p className="text-xs text-moca-gray leading-relaxed mb-3.5">
          Questo blocco è una modifica AI (HTML grezzo). Premi “Ripristina” per
          tornare a modificarne i campi.
        </p>
      ) : (
        <div className="mb-4">
          <ContentForm
            fields={BLOCKS[block.type].fields}
            value={block.props}
            onChange={(next) => onUpdateProps(block.id, next)}
          />
        </div>
      )}

      <div className="mb-3">
        <label className={fieldLabel}>Commento per l&apos;AI</label>
        <textarea
          className={textarea}
          placeholder={`es. "Rendi il titolo più breve e cambia il bottone in 'Prenota una demo'."`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <button
        className={`${btnPrimary} w-full`}
        onClick={applyComment}
        disabled={loading || !comment.trim()}
      >
        <Sparkles size={15} /> {loading ? "Modifico…" : "Applica modifica AI"}
      </button>
      {error && <p className="text-danger text-xs mt-2">{error}</p>}
      {note && <p className="text-moca-gray text-xs mt-2">{note}</p>}

      <div className="flex gap-2 mt-4">
        {block.customHtml && (
          <button className={btnSecondary} onClick={() => onReset(block.id)}>
            <RotateCcw size={15} /> Ripristina
          </button>
        )}
        <button className={btnDanger} onClick={() => onRemove(block.id)}>
          <Trash2 size={15} /> Elimina
        </button>
      </div>
    </div>
  );
}
