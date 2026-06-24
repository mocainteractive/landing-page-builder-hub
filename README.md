# Landing Page Builder Hub — App Moca Hub

App satellite del **Moca Hub** per costruire **landing page on-brand** ed esportarle
in HTML pulito. Sviluppata seguendo le **skill ufficiali Moca** (`.claude/skills/`):
stack Vite+React+Tailwind, integrazione via **launch token**, **Design System v2.0**,
**Supabase condiviso con RLS**, **Netlify Functions** per la logica server-side.

Tre livelli:
1. **Skill Brand** — dato l'URL del sito del cliente, una Netlify Function ispeziona
   HTML/CSS e Claude ne ricava **design token** + **tono di voce**.
2. **Editor a blocchi** — componi/riordina (drag&drop) blocchi che ereditano il brand;
   modifica testi/immagini inline **senza codice**.
3. **Modifica AI + Export** — commenta un blocco → l'AI riscrive **solo** quella sezione;
   esporti un singolo HTML self-contained.

## Stack (conforme alle skill)

- **React 18 + TypeScript + Vite + Tailwind** (design token Moca)
- **lucide-react** (icone, no emoji) · UI **in italiano**
- **Moca SDK** (`src/lib/moca-sdk.ts`) + `MocaProvider` + `AppHeader`
- **@supabase/supabase-js** — istanza condivisa del Hub, **anon key + RLS**
- **Netlify Functions** (`netlify/functions/`) per il proxy AI (chiave per-cliente)
- **@anthropic-ai/sdk** (`claude-opus-4-8`)

## Come funziona

```
Hub: "Apri App" → apre  https://<app>.netlify.app/?moca_token=XXX
  → moca.init() valida il token su  ${HUB}/api/validate-launch-token
  → riceve { client, user, application, configurations (ANTHROPIC_API_KEY) }
  → l'editor parte; le modifiche AI inoltrano la chiave del cliente alle Functions
```

- **Senza token valido** (e non in localhost) → schermata **“Accesso Negato”**.
- **In localhost** → **Mock Mode** automatico; la chiave AI arriva da
  `VITE_DEV_ANTHROPIC_API_KEY` (`.env.local`, mai committata).
- **Chiavi mai hardcodate**: la `ANTHROPIC_API_KEY` per-cliente arriva da
  `getConfig()` e viene passata alle Functions nell'header `x-moca-anthropic-key`.

### Sicurezza Supabase (modello più sicuro)

La persistenza usa la **stessa istanza Supabase del Hub** con la **sola anon key**
nel frontend. L'isolamento multi-tenant è imposto dal **database via RLS**: le tabelle
`lpb_projects` / `lpb_brands` / `lpb_exports` hanno `client_id REFERENCES clients(id)`
e policy `SELECT/INSERT/UPDATE/DELETE` basate su `user_clients` + `auth.uid()`
(stesso pattern delle tabelle del Hub). La `service_role` key **non è mai usata**
da quest'app. Il salvataggio richiede quindi la **sessione Supabase del Hub**; senza,
l'editor resta pienamente funzionante con persistenza locale (localStorage).

## Setup locale

```bash
npm install
cp .env.example .env.local     # imposta VITE_DEV_ANTHROPIC_API_KEY per provare l'AI
npm run dev                    # http://localhost:5173  (Mock Mode)
```

| Variabile | Tipo | Note |
|---|---|---|
| `VITE_MOCA_HUB_URL` | frontend | URL del Hub (default produzione) |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | frontend | istanza Supabase del Hub (persistenza) |
| `VITE_DEV_ANTHROPIC_API_KEY` | frontend, solo locale | chiave AI per il Mock Mode |

> ⚠️ La `service_role` key NON va mai messa in variabili `VITE_` né nel frontend.

---

## Deploy + integrazione Moca Hub (passo dopo passo)

### 1. Database — applica la migration sul Supabase del Hub
`supabase/migrations/20260624120000_create_landing_page_builder.sql` crea
`lpb_projects` / `lpb_brands` / `lpb_exports` con RLS scoped per `client_id`.
- `supabase db push` dal progetto del Hub, **oppure** incolla l'SQL in
  **Supabase → SQL Editor**.

### 2. Deploy su Netlify
- **Add new site → Import from GitHub** → `mocainteractive/landing-page-builder-hub`.
- Build automatica da `netlify.toml` (`npm run build`, publish `dist`, Functions in
  `netlify/functions`, redirect `/api/* → /.netlify/functions/*`, SPA fallback).

### 3. Variabili d'ambiente su Netlify (Site settings → Environment variables)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — istanza del Hub.
- (`VITE_MOCA_HUB_URL` è già nel `netlify.toml`.)
- Nessun segreto server-side richiesto: la chiave AI arriva dal Hub a runtime.

### 4. Registra l'app su Moca Hub (pannello Admin → Applicazioni)
- URL `https://<tuo-sito>.netlify.app`.
- Aggiungi **`ANTHROPIC_API_KEY`** tra le API key richieste e impostala per i clienti.
- Configura gli accessi (per utente/cliente/ruolo/livello).

### 5. Verifica
- Apri l'app da Moca Hub per un cliente → editor con logo/nome cliente nell'header e AI attiva.
- URL senza token → “Accesso Negato”.
- Salva un progetto e ricaricalo da “Progetti”; esporta l'HTML.

---

## Architettura

```
index.html · src/main.tsx          bootstrap Vite, <MocaProvider><App/>
src/App.tsx                        editor: header Moca + palette + livelli + anteprima + brand + ispettore
src/lib/
  moca-sdk.ts  MocaProvider.tsx    SDK launch-token + context (useMoca)
  supabase.ts  api.ts              client anon + helper persistenza/AI
  types.ts tokens.ts blocks.ts export.ts   modelli + blocchi token-driven + export HTML
src/components/                    AppHeader, Layers, ContentForm, BrandPanel, Inspector, ProjectPanel, Preview
netlify/functions/
  extract-brand.ts edit-block.ts   proxy AI (chiave per-cliente via header)
  utils/                           anthropic, brand (cheerio+undici), edit, llm
supabase/migrations/               tabelle lpb_* con RLS
.claude/skills/                    skill ufficiali Moca (copia per progetto)
```

## Conformità skill (Definition of Done)
- [x] Avvio solo con sessione valida (token o mock), altrimenti “Accesso Negato”.
- [x] Nessuna API key hardcodata: tutte da `getConfig()` / Functions.
- [x] Design System v2.0 (header dark, card bianche, Figtree, lucide, italiano).
- [x] Tabelle Supabase con `client_id` + RLS via `user_clients`/`auth.uid()`.
- [x] Segreti server-side solo nelle Functions; solo anon key nel frontend.
- [x] `.env.local` non committato; `env.example` aggiornato.
