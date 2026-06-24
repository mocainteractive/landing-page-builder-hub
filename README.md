# Landing Page Builder Hub — Moca Hub

App Moca Hub per **costruire landing page on-brand** ed esportarle in HTML pulito.
Integrata nell'ecosistema Moca Hub (launch token + design system v2.0), con
**Claude (Opus 4.8)** come motore AID e persistenza su **Supabase**.

Tre livelli:

1. **Skill Brand** — dato l'URL del sito del cliente, il backend ispeziona HTML/CSS
   e Claude ne ricava **design token** (colori, tipografia) + **tono di voce**.
2. **Editor a blocchi** — componi/riordina (drag & drop) blocchi che ereditano il
   brand; modifica testi/immagini inline **senza codice**.
3. **Modifica guidata AI + Export** — commenta un blocco → l'AI riscrive **solo**
   quella sezione; esporta un singolo HTML self-contained.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **React 19**
- **Moca SDK** (launch token, contesto cliente, API key per-cliente)
- **Design System v2.0** (Figtree, Moca Red `#E52217`, header dark, lucide-react)
- **@anthropic-ai/sdk** (`claude-opus-4-8`) — chiave fornita dal Hub per cliente
- **@supabase/supabase-js** — persistenza progetti/brand/export (DB del Hub)
- **cheerio** + **undici** (fetch proxy-aware) per l'estrazione brand
- Deploy su **Netlify** (API route = Netlify Functions)

## Come funziona l'integrazione Moca Hub

```
Utente clicca "Apri App" su Moca Hub
  → Hub genera launch token e apre  https://<app>.netlify.app/editor?moca_token=XXX
  → moca.init() valida il token su  ${HUB}/api/validate-launch-token
  → riceve { client, user, application, configurations }  (incl. ANTHROPIC_API_KEY)
  → l'app mostra l'editor; le chiamate AI inoltrano la chiave del cliente alle API route
```

- **Senza token valido** (e non in localhost) → schermata **“Accesso Negato”**.
- **In localhost** → **mock mode** automatico: l'app parte senza Hub; la chiave AI
  arriva dal fallback locale `ANTHROPIC_API_KEY` (`.env.local`).
- **Le API key non sono mai hardcodate**: in produzione arrivano dal Hub e
  vengono inoltrate alle API route nell'header `x-moca-anthropic-key`.
- La persistenza scopa i dati per `client_id`/`user_id` della sessione validata
  (header `x-moca-client-id` / `x-moca-user-id`).

## Setup locale

```bash
npm install
cp .env.example .env.local      # imposta almeno ANTHROPIC_API_KEY per testare l'AI
npm run dev                     # http://localhost:3000/editor  (mock mode)
```

Variabili (vedi `.env.example`):

| Variabile | Dove | Note |
|---|---|---|
| `NEXT_PUBLIC_MOCA_HUB_URL` | build/public | URL del Hub (default produzione) |
| `ANTHROPIC_API_KEY` | server | fallback locale; in prod la chiave arriva dal Hub |
| `SUPABASE_URL` | server | progetto Supabase del Hub (persistenza) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | service role del Hub |

Senza Supabase l'editor funziona comunque (solo localStorage); i pulsanti di
salvataggio mostreranno “Supabase non configurato”.

---

## Deploy su Netlify + integrazione Moca Hub (passo dopo passo)

### 1. Database — applica la migration sul Supabase del Hub
La migration `supabase/migrations/20260624120000_create_landing_page_builder.sql`
crea le tabelle `lpb_projects`, `lpb_brands`, `lpb_exports` (prefisso `lpb_`,
RLS attiva, accesso solo via service role).

- **Con Supabase CLI** (dalla root del repo del Hub o puntando al progetto):
  ```bash
  supabase db push      # applica le migration pendenti
  ```
- **Oppure** copia/incolla l'SQL nella **Dashboard Supabase → SQL Editor** del
  progetto del Hub ed eseguilo.

### 2. Deploy del sito su Netlify
1. **Netlify → Add new site → Import from GitHub** → scegli
   `mocainteractive/landing-page-builder-hub` (branch `main`).
2. Netlify rileva Next.js e usa `netlify.toml` (build `npm run build`, Node 22,
   plugin `@netlify/plugin-nextjs`). Nessuna configurazione manuale di build.

### 3. Variabili d'ambiente su Netlify
**Site settings → Environment variables** (NON committarle):
- `ANTHROPIC_API_KEY` — chiave di fallback (opzionale se ogni cliente ha la sua sul Hub).
- `SUPABASE_URL` — URL del progetto Supabase del Hub.
- `SUPABASE_SERVICE_ROLE_KEY` — service role del Hub.
- (`NEXT_PUBLIC_MOCA_HUB_URL` è già in `netlify.toml`; sovrascrivila qui solo se usi un hub diverso.)

Poi **Deploys → Trigger deploy** per applicare le variabili.

### 4. Registra l'app su Moca Hub
Nel **pannello Admin di Moca Hub → Applicazioni**:
1. Crea/registra l'app con **URL** `https://<tuo-sito>.netlify.app` (entrypoint
   consigliato: `/editor`).
2. Tra le **API key richieste** dell'app aggiungi **`ANTHROPIC_API_KEY`** (così
   l'admin può impostarla per ciascun cliente).
3. Imposta `ANTHROPIC_API_KEY` per i clienti che useranno l'app.

### 5. Verifica
- Da Moca Hub apri l'app per un cliente → deve caricare l'editor con **logo/nome
  cliente** nell'header e l'AI funzionante (chiave del cliente).
- Aprendo l'URL **senza token** → deve comparire **“Accesso Negato”**.
- Salva un progetto → ricaricalo da “Progetti”; esporta l'HTML.

---

## Checklist di test (in `/editor`)

- **Brand**: pannello Brand → “Estrai brand” da un URL, o “Modifica token”.
- **Componi**: “Aggiungi blocco” + trascina i **Livelli**; anteprima live.
- **Inline**: clicca una sezione → modifica testi/immagini/liste senza codice.
- **AI**: commento → “Applica modifica AI” cambia **solo** quel blocco; “Ripristina”.
- **Persistenza**: “Salva” / “Progetti” (carica) ; “Salva nella libreria brand”.
- **Export**: “Esporta HTML” (scarica e archivia la versione su Supabase); “Copia HTML”.

## Requisiti di rete

- L'**estrazione brand** fa una richiesta in uscita verso il sito del cliente:
  l'ambiente deve permettere l'**egress**. Il fetch è **proxy-aware**
  (`HTTPS_PROXY` via `undici`); con MITM TLS imposta `NODE_EXTRA_CA_CERTS`.
- Le chiamate al modello vanno verso `api.anthropic.com`; la validazione token
  verso `${HUB}/api/validate-launch-token`.

## Architettura (file principali)

```
app/
  editor/page.tsx              <MocaProvider><Editor/></MocaProvider>
  api/brand/extract            estrazione brand (chiave dall'header Hub)
  api/block/edit               modifica AI di un blocco
  api/projects[/[id]]          CRUD progetti (Supabase, scoping per cliente)
  api/brands                   libreria brand
  api/exports                  versioni HTML esportate
components/
  MocaProvider.tsx             gate launch-token + Accesso Negato (italiano)
  Editor.tsx                   header Moca, persistenza, brand, ispettore
  Layers.tsx / ContentForm.tsx livelli drag&drop / editing inline
lib/
  moca-sdk.ts                  porting TS dell'SDK Moca
  moca-headers.ts              nomi header condivisi (key + identità)
  anthropic.ts / llm.ts        client AI (chiave per-cliente) + parsing JSON
  brand.ts                     fetch+parse sito → Claude → token (fallback euristico)
  edit.ts                      modifica AI isolata per blocco
  blocks.ts / tokens.ts        libreria blocchi token-driven + stylesheet
  export.ts                    HTML finale + documento anteprima
  supabase-admin.ts            client service-role + lettura identità Moca
supabase/migrations/           schema lpb_* per il DB del Hub
```

> **Nota sicurezza (v1):** lo scoping della persistenza usa `client_id`/`user_id`
> dalla sessione Moca inoltrati come header. Per un tool interno dietro il launch
> del Hub è accettabile; un irrobustimento futuro è firmare l'identità lato Hub o
> rivalidare un'identità per-richiesta nelle API route.
