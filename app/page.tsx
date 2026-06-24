import Link from "next/link";
import { hasApiKey } from "@/lib/anthropic";

export default function Home() {
  const ai = hasApiKey();
  return (
    <main className="home">
      <span className={`badge ${ai ? "badge--ok" : "badge--warn"}`}>
        {ai ? "● AI ready" : "● AI key not set"}
      </span>
      <h1>
        Build landing pages that stay <em>on brand</em>.
      </h1>
      <p className="lead">
        Moca Hub extracts a client&apos;s brand from their website, gives you
        ready-made blocks built on those design tokens, and lets you edit any
        section by leaving a comment for the AI. Export clean, self-contained
        HTML — ready for GitHub Pages or any host.
      </p>

      <div className="steps">
        <div className="step">
          <b>1 · Brand skill</b>
          <p style={{ margin: "8px 0 0", color: "var(--ed-muted)" }}>
            Paste a site URL. We inspect HTML &amp; CSS and Claude distils it
            into design tokens + tone of voice.
          </p>
        </div>
        <div className="step">
          <b>2 · Compose</b>
          <p style={{ margin: "8px 0 0", color: "var(--ed-muted)" }}>
            Drag &amp; drop blocks (hero, features, pricing, CTA…). Every block
            inherits the brand automatically.
          </p>
        </div>
        <div className="step">
          <b>3 · Comment &amp; export</b>
          <p style={{ margin: "8px 0 0", color: "var(--ed-muted)" }}>
            Comment a block to have the AI rewrite just that section, then export
            a single HTML file.
          </p>
        </div>
      </div>

      <Link href="/editor" className="ed-btn ed-btn--primary" style={{ fontSize: 15, padding: "12px 22px" }}>
        Open the editor →
      </Link>

      {!ai && (
        <p className="hint" style={{ marginTop: 24 }}>
          Tip: set <code>ANTHROPIC_API_KEY</code> in <code>.env.local</code> to
          enable brand extraction and AI edits. Without it, the editor still
          works with a heuristic brand and manual editing.
        </p>
      )}
    </main>
  );
}
