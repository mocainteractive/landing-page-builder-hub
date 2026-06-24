# Landing Page Builder Hub — Moca Hub

Editor visivo per **costruire landing page on-brand** ed esportarle in HTML pulito,
pronto per GitHub Pages o qualsiasi hosting. L'AI dietro è **Claude (Opus 4.8)** via
Anthropic Messages API.

L'app è costruita su tre livelli:

1. **Skill Brand Guidelines** — dato l'URL del sito di un cliente, il backend
   ispeziona HTML e CSS, e Claude distilla il tutto in **design token** (colori,
   tipografia, raggi, ombre) + **tono di voce**. Questi token diventano i mattoni
   dell'editor: ogni blocco li eredita automaticamente.
2. **Editor a blocchi** — componi, riordina (drag & drop) e personalizza blocchi
   riutilizzabili (hero, features, pricing, CTA, testimonial, footer…) tutti
   costruiti sui token del brand.
3. **Modifica guidata + Export** — seleziona un blocco, lascia un **commento** in
   linguaggio naturale e l'AI riscrive **solo quella sezione** senza toccare il
   resto. Poi esporti un singolo file HTML self-contained.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **React 19**
- **@anthropic-ai/sdk** (modello `claude-opus-4-8`)
- **@dnd-kit** per il drag & drop dei layer
- **cheerio** per il parsing server-side di HTML/CSS
- **zod** per la validazione dell'output del modello

## Setup

```bash
npm install
cp .env.example .env.local   # aggiungi la tua ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

Senza `ANTHROPIC_API_KEY` l'editor funziona comunque: l'estrazione brand usa un
**fallback euristico** (colori/font ricavati dal CSS) e le modifiche AI sono
disabilitate.

### Variabili d'ambiente

| Variabile | Obbligatoria | Default | Note |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | per le funzioni AI | — | abilita estrazione brand AI e modifiche per-blocco |
| `ANTHROPIC_MODEL` | no | `claude-opus-4-8` | override del modello |

## Come si usa

1. Apri **/editor**.
2. Nel pannello **Brand skill** (destra) incolla l'URL del cliente → **Extract
   brand**. I token aggiornano istantaneamente l'anteprima.
3. **Add block** (sinistra) per aggiungere sezioni; trascina i **Layers** per
   riordinare.
4. Clicca una sezione nell'anteprima → nel **Inspector** scrivi un commento
   (es. _"rendi il titolo più breve e cambia il bottone in 'Prenota una demo'"_)
   → **Apply AI edit**. Solo quel blocco cambia.
5. **Export HTML** in alto a destra scarica il file finale.

## Architettura

```
app/
  page.tsx                  Home / presentazione
  editor/page.tsx           Pagina editor (monta <Editor/>)
  api/
    brand/extract/route.ts  POST { url }  → { tokens, signals, usedAi }
    block/edit/route.ts     POST { blockType, currentHtml, comment, tokens } → { html, note }
components/
  Editor.tsx                Stato editor, anteprima, brand panel, inspector
  Layers.tsx                Lista layer sortable (dnd-kit)
lib/
  types.ts                  Modelli dati (BrandTokens, BlockInstance, PageDoc)
  tokens.ts                 Default + CSS variables + stylesheet condiviso
  blocks.ts                 Libreria blocchi token-driven (render → HTML)
  brand.ts                  Fetch+parse sito → Claude → BrandTokens (+ fallback)
  edit.ts                   Modifica AI di un singolo blocco
  export.ts                 Documento HTML finale + documento anteprima
  anthropic.ts / llm.ts     Client Anthropic + helper parsing JSON
```

### Note di design

- **Un'unica fonte di rendering**: i blocchi producono stringhe HTML che usano le
  CSS variable del brand (`var(--color-primary)`, `var(--font-heading)`, …). La
  stessa funzione genera sia l'anteprima sia l'export → WYSIWYG garantito.
- **Modifiche isolate**: una modifica AI salva un `customHtml` sul singolo blocco.
  Gli altri blocchi non sono toccati; "Reset block" torna alla versione di default.
- **Export leggero**: nessuna dipendenza JS nell'output. Solo i font Google via
  `<link>` e gli stili inline generati dai token.

## Deploy

`npm run build && npm start`, oppure deploy su una piattaforma Node (es. Vercel).
Imposta `ANTHROPIC_API_KEY` tra le variabili d'ambiente del progetto.
