"use client";

import type { FieldDef, SubField } from "@/lib/blocks";

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
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
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
      <div className="field" style={{ marginBottom: 8 }}>
        <label>{field.label}</label>
        <textarea
          className="textarea"
          style={{ minHeight: 60 }}
          value={asStringArray(value).join("\n")}
          onChange={(e) =>
            onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))
          }
        />
      </div>
    );
  }
  return (
    <div className="field" style={{ marginBottom: 8 }}>
      <label>{field.label}</label>
      {field.type === "textarea" ? (
        <textarea
          className="textarea"
          style={{ minHeight: 56 }}
          value={asString(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="input"
          value={asString(value)}
          onChange={(e) => onChange(e.target.value)}
        />
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
            <div className="field" key={field.key}>
              <label>{field.label}</label>
              {items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    border: "1px solid var(--ed-border)",
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 8,
                    background: "var(--ed-panel-2)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 11, color: "var(--ed-muted)" }}>
                      {field.itemLabel} {idx + 1}
                    </span>
                    <button
                      className="ed-btn ed-btn--danger"
                      style={{ padding: "3px 8px", fontSize: 11 }}
                      onClick={() =>
                        set(
                          field.key,
                          items.filter((_, i) => i !== idx),
                        )
                      }
                    >
                      Remove
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
                          items.map((it, i) =>
                            i === idx ? { ...it, [sf.key]: v } : it,
                          ),
                        )
                      }
                    />
                  ))}
                </div>
              ))}
              <button
                className="ed-btn ed-btn--ghost"
                style={{ width: "100%", padding: "7px" }}
                onClick={() => set(field.key, [...items, field.blank()])}
              >
                + Add {field.itemLabel.toLowerCase()}
              </button>
            </div>
          );
        }

        if (field.type === "strings") {
          return (
            <div className="field" key={field.key}>
              <label>
                {field.label}
                {field.help ? (
                  <span style={{ color: "var(--ed-muted)" }}> · {field.help}</span>
                ) : null}
              </label>
              <textarea
                className="textarea"
                style={{ minHeight: 70 }}
                value={asStringArray(value[field.key]).join("\n")}
                onChange={(e) =>
                  set(
                    field.key,
                    e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                  )
                }
              />
            </div>
          );
        }

        return (
          <div className="field" key={field.key}>
            <label>{field.label}</label>
            {field.type === "textarea" ? (
              <textarea
                className="textarea"
                value={asString(value[field.key])}
                onChange={(e) => set(field.key, e.target.value)}
              />
            ) : (
              <input
                className="input"
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
