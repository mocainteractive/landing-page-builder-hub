import Link from "next/link";

export default function Home() {
  return (
    <main className="home">
      <span className="badge">● App Moca Hub</span>
      <h1>
        Crea landing page <em>on-brand</em> in pochi minuti.
      </h1>
      <p className="lead">
        Moca Hub estrae il brand del cliente dal suo sito, ti dà blocchi pronti
        costruiti su quei design token e ti permette di modificare ogni sezione
        lasciando un commento per l&apos;AI. Esporta HTML pulito e
        self-contained, pronto per qualsiasi hosting.
      </p>

      <div className="steps">
        <div className="step">
          <b>1 · Brand</b>
          <p style={{ margin: "8px 0 0", color: "var(--moca-gray)" }}>
            Incolla l&apos;URL del sito: ispezioniamo HTML e CSS e Claude ne
            ricava design token + tono di voce.
          </p>
        </div>
        <div className="step">
          <b>2 · Componi</b>
          <p style={{ margin: "8px 0 0", color: "var(--moca-gray)" }}>
            Trascina i blocchi (hero, feature, pricing, CTA…). Ogni blocco
            eredita il brand automaticamente.
          </p>
        </div>
        <div className="step">
          <b>3 · Commenta &amp; esporta</b>
          <p style={{ margin: "8px 0 0", color: "var(--moca-gray)" }}>
            Commenta un blocco e l&apos;AI riscrive solo quella sezione, poi
            esporti un singolo file HTML.
          </p>
        </div>
      </div>

      <Link
        href="/editor"
        className="ed-btn ed-btn--primary"
        style={{ fontSize: 15, padding: "12px 22px" }}
      >
        Apri l&apos;editor →
      </Link>

      <p className="hint" style={{ marginTop: 24 }}>
        In produzione questa app viene aperta da Moca Hub (con il contesto
        cliente e le API key). In locale parte in modalità mock.
      </p>
    </main>
  );
}
