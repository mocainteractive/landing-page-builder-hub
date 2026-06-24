import type { FieldDef, SubField } from "@/lib/blocks";
import { input, textarea, fieldLabel, btnDanger } from "@/lib/ui";

type Props = Record<string, unknown>;

function asString(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map(asString) : [];
}
function asObjectArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function SubFieldInput({
  field,
  value,
  onChange,
}: {
  field: SubField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-xs text-moca-black my-1.5">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        {field.label}
      </label>
    );
  }
  if (field.type === "strings") {
    return (
      <div className="mb-2">
        <label className={fieldLabel}>{field.label}</label>
        <textarea
          className={textarea}
          value={asStringArray(value).join("\n")}
          onChange={(e) =>
            onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))
          }
        />
      </div>
    );
  }
  return (
    <div className="mb-2">
      <label className={fieldLabel}>{field.label}</label>
      {field.type === "textarea" ? (
        <textarea
          className={textarea}
          value={asString(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input className={input} value={asString(value)} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export function ContentForm({
  fields,
  value,
  onChange,
}: {
  fields: FieldDef[];
  value: Props;
  onChange: (next: Props) => void;
}) {
  function set(key: string, v: unknown) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div>
      {fields.map((field) => {
        if (field.type === "objects") {
          const items = asObjectArray(value[field.key]);
          return (
            <div className="mb-3" key={field.key}>
              <label className={fieldLabel}>{field.label}</label>
              {items.map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-md p-2.5 mb-2 bg-gray-50">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] text-moca-gray">
                      {field.itemLabel} {idx + 1}
                    </span>
                    <button
                      className="text-[11px] text-danger hover:underline"
                      onClick={() => set(field.key, items.filter((_, i) => i !== idx))}
                    >
                      Rimuovi
                    </button>
                  </div>
                  {field.schema.map((sf) => (
                    <SubFieldInput
                      key={sf.key}
                      field={sf}
                      value={item[sf.key]}
                      onChange={(v) =>
                        set(
                          field.key,
                          items.map((it, i) => (i === idx ? { ...it, [sf.key]: v } : it)),
                        )
                      }
                    />
                  ))}
                </div>
              ))}
              <button
                className={`${btnDanger} w-full border-gray-300 text-moca-black hover:bg-gray-100`}
                onClick={() => set(field.key, [...items, field.blank()])}
              >
                + Aggiungi {field.itemLabel.toLowerCase()}
              </button>
            </div>
          );
        }

        if (field.type === "strings") {
          return (
            <div className="mb-3" key={field.key}>
              <label className={fieldLabel}>
                {field.label}
                {field.help ? <span className="text-moca-gray"> · {field.help}</span> : null}
              </label>
              <textarea
                className={textarea}
                value={asStringArray(value[field.key]).join("\n")}
                onChange={(e) =>
                  set(field.key, e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))
                }
              />
            </div>
          );
        }

        return (
          <div className="mb-3" key={field.key}>
            <label className={fieldLabel}>{field.label}</label>
            {field.type === "textarea" ? (
              <textarea
                className={textarea}
                value={asString(value[field.key])}
                onChange={(e) => set(field.key, e.target.value)}
              />
            ) : (
              <input
                className={input}
                placeholder={field.type === "image" ? "https://…" : undefined}
                value={asString(value[field.key])}
                onChange={(e) => set(field.key, e.target.value)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
