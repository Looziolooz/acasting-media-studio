# 🎬 Acasting Media Studio

Tool AI per generare immagini e video per i social di **Acasting** (piattaforma casting svedese).

## Provider verificati (solo free)

| Provider | Tipo | Limite | Note |
|---|---|---|---|
| **Pollinations.ai** | 🖼 Immagini | ✅ Illimitato | Nessuna API key. FLUX + SDXL. |
| **HuggingFace** | 🖼 Immagini | ⚠️ Crediti limitati | API key gratuita, crediti si esauriscono. |
| **Magic Hour** | 🎬 Video + 🖼 Img | 100 crediti/giorno | 400 crediti signup. Riscattare daily. |

> **Rimossi perché NON gratuiti**: Replicate (trial solo), Runway (one-time 125 credits), Luma (API separate), HaiperAI (discontinued).

---

## Setup

### 1. Database (Neon — gratis)

```bash
# Crea un progetto su https://console.neon.tech
# Copia la connection string
```

### 2. Magic Hour API key (opzionale)

1. Crea account su https://magichour.ai
2. Vai su https://dev.magichour.ai
3. Crea un'API key
4. **Ogni giorno** vai su magichour.ai → riscatta 100 crediti giornalieri

### 3. HuggingFace API key (opzionale)

1. Crea account su https://huggingface.co
2. Vai su Settings → Access Tokens
3. Crea token con permesso "read"

### 4. Installazione

```bash
# Clona e installa
npm install

# Configura variabili d'ambiente
cp .env.example .env.local
# → Edita .env.local con i tuoi valori

# Crea le tabelle nel DB
npm run db:push

# Avvia in sviluppo
npm run dev
```

App disponibile su http://localhost:3000

---

## Features

- **Prompt Engineer** — task-specific modifiers per casting, headshot, thumbnail, teaser
- **Provider selector** — sceglie il provider ottimale per tipo di contenuto
- **Queue system** — generazioni in coda con stato real-time
- **Usage dashboard** — monitoraggio crediti con warning visivi (60% / 80% / 95% / 100%)
- **Storico** — tutte le generazioni salvate in PostgreSQL con filtri
- **Preview modal** — anteprima + download diretto
- **Social presets** — format rapidi per Instagram, TikTok, Facebook, headshot

## Task disponibili per Acasting

| Task | Uso |
|---|---|
| 📋 Post Casting | Post immagini per annunci di lavoro |
| 🎬 Video Teaser | Teaser video 5-10s per annunci |
| 📱 Thumbnail Social | Thumbnail ottimizzate per feed |
| 🎭 Headshot Attore | Portrait professionali per portfolio |
| 🎨 Scenario / Sfondo | Sfondi per set production |

## Struttura del progetto

```
src/
├── app/
│   ├── api/
│   │   ├── generate/route.ts   # Generazione (Pollinations + HF + Magic Hour)
│   │   ├── history/route.ts    # CRUD storico generazioni
│   │   └── usage/route.ts      # Monitoraggio utilizzo provider
│   ├── layout.tsx
│   └── page.tsx                # Main page con layout a 2 colonne
├── components/
│   ├── generation/
│   │   ├── GeneratePanel.tsx   # UI principale con tutti i controlli
│   │   ├── HistoryPanel.tsx    # Galleria storico con filtri
│   │   └── PreviewModal.tsx    # Modale anteprima + download
│   ├── layout/AppHeader.tsx    # Header con tabs e warning badge
│   ├── queue/QueuePanel.tsx    # Coda generazioni in tempo reale
│   └── usage/UsagePanel.tsx    # Dashboard utilizzo provider
├── lib/
│   ├── ai-providers/config.ts  # Config provider (solo free verificati)
│   ├── prompt-engineer/        # Miglioramento prompt task-specific
│   └── db/index.ts             # Prisma singleton
├── store/index.ts              # Zustand global state
└── types/index.ts              # TypeScript definitions
```

## Integrazione n8n

Per integrare con i workflow n8n di Acasting, usa il webhook:

```bash
POST /api/generate
Content-Type: application/json

{
  "prompt": "Swedish actress, confident pose",
  "provider": "pollinations",
  "model": "flux",
  "mediaType": "image",
  "task": "actor-headshot",
  "style": "editorial",
  "lighting": "studio-light",
  "composition": "centered-portrait",
  "aspectRatio": "3:4"
}
```
