import { useState } from "react";
import { Palette, Sparkles, Save } from "lucide-react";
import type { BrandTokens } from "@/lib/types";
import { aiExtractBrand, saveBrand } from "@/lib/api";
import { input, fieldLabel, sectionTitle, btnPrimary, btnSecondary } from "@/lib/ui";

function toHex(color: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  if (/^#[0-9a-fA-F]{3}$/.test(color))
    return "#" + color.slice(1).split("").map((c) => c + c).join("");
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

export function BrandPanel({
  brand,
  onBrand,
  apiKey,
  clientId,
}: {
  brand: BrandTokens;
  onBrand: (b: BrandTokens) => void;
  apiKey: string | null;
  clientId: string;
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
      const data = await aiExtractBrand(url, apiKey);
      onBrand(data.tokens);
      setNote(data.usedAi ? "Brand estratto con AI." : "Brand euristico (senza AI).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Estrazione fallita");
    } finally {
      setLoading(false);
    }
  }

  async function saveToLibrary() {
    setError(null);
    setNote(null);
    try {
      await saveBrand(clientId, brand.name ?? "Brand", brand);
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

  const colorFields: Array<[keyof BrandTokens["colors"], string]> = [
    ["primary", "Primario"],
    ["secondary", "Secondario"],
    ["accent", "Accento"],
    ["background", "Sfondo"],
    ["surface", "Superficie"],
    ["text", "Testo"],
  ];

  return (
    <div className="p-4 border-b border-gray-200">
      <h3 className={sectionTitle}>
        <Palette size={13} /> Brand
      </h3>
      <div className="mb-3">
        <label className={fieldLabel}>URL sito del cliente</label>
        <input
          className={input}
          placeholder="esempio.it"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && extract()}
        />
      </div>
      <div className="flex gap-2">
        <button className={`${btnPrimary} flex-1`} onClick={extract} disabled={loading}>
          <Sparkles size={15} /> {loading ? "Estraggo…" : "Estrai brand"}
        </button>
        <button className={btnSecondary} onClick={saveToLibrary} title="Salva nella libreria brand">
          <Save size={15} />
        </button>
      </div>
      {error && <p className="text-danger text-xs mt-2">{error}</p>}
      {note && <p className="text-moca-gray text-xs mt-2">{note}</p>}

      <div className="mt-4 space-y-1">
        <Row k="Nome" v={brand.name ?? "—"} />
        <Row k="Font titoli" v={brand.typography.headingFont} />
        <Row k="Font testo" v={brand.typography.bodyFont} />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {swatches.map(([name, color]) => (
          <span
            key={name}
            className="w-6 h-6 rounded-md border border-black/10"
            style={{ background: color }}
            title={`${name}: ${color}`}
          />
        ))}
      </div>
      {brand.toneOfVoice?.summary && (
        <p className="text-xs text-moca-gray mt-2.5 leading-relaxed">
          <b className="text-moca-black">Tono:</b> {brand.toneOfVoice.summary}
        </p>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-moca-gray">
          Modifica token manualmente
        </summary>
        <div className="mt-3">
          {colorFields.map(([key, label]) => (
            <div key={key} className="flex items-center gap-2.5 mb-1.5">
              <input
                type="color"
                className="w-8 h-7"
                value={toHex(brand.colors[key])}
                onChange={(e) =>
                  onBrand({ ...brand, colors: { ...brand.colors, [key]: e.target.value } })
                }
                aria-label={label}
              />
              <span className="text-xs text-moca-gray">{label}</span>
              <code className="ml-auto text-[11px]">{brand.colors[key]}</code>
            </div>
          ))}
          <div className="mt-2 mb-2">
            <label className={fieldLabel}>Font titoli (Google Font)</label>
            <input
              className={input}
              value={brand.typography.headingFont}
              onChange={(e) => onBrand(setFont(brand, "headingFont", e.target.value))}
            />
          </div>
          <div>
            <label className={fieldLabel}>Font testo (Google Font)</label>
            <input
              className={input}
              value={brand.typography.bodyFont}
              onChange={(e) => onBrand(setFont(brand, "bodyFont", e.target.value))}
            />
          </div>
        </div>
      </details>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-xs text-moca-gray py-0.5">
      <span>{k}</span>
      <b className="text-moca-black font-semibold">{v}</b>
    </div>
  );
}
