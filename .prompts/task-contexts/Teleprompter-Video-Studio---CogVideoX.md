id: 6e664c5f-cd2d-4668-ae8d-30502fe45379
sessionId: a96b5fb0-3852-452b-9a2e-daa983c443a7
date: '2026-04-21T21:39:36.806Z'
label: Teleprompter Video Studio — CogVideoX Workflow Engine
---
# Teleprompter Video Studio — CogVideoX Workflow Engine

## Goal
Trasformare Teleprompter da tool solo-immagini a una **Video Production Studio completa**, aggiungendo un workflow automatizzato che usa i modelli CogVideoX di z.ai per generare video professionali a partire dai prompt modulari esistenti. L'utente costruisce il prompt come già fa oggi, e con un click lancia una pipeline che genera script, scene, immagini storyboard, e infine video montati con transizioni.

## Risk Assessment
| Factor | Rating | Rationale |
|--------|--------|----------|
| Steps | High | ~12 file da creare/modificare, pipeline multi-step |
| Architecture | High | Nuovo modulo video workflow con API routes, polling async, UI complessa |
| Scope | High | Feature completamente nuova che tocca store, lib, components, API routes |
| **Overall** | High | Progetto ambizioso — procediamo per step incrementali |

## Design

### Architettura del Video Workflow

```
┌─────────────────────────────────────────────────────────┐
│                    VIDEO WORKFLOW ENGINE                  │
│                                                          │
│  1. SCRIPT GENERATION (GLM-5.1 via Puter.js)            │
│     Prompt → Scene breakdown JSON (4-8 scene)           │
│     Ogni scena: description, mood, duration, transition │
│                                                          │
│  2. SCENE IMAGE GENERATION (Puter.js txt2img)           │
│     Ogni scene description → immagine storyboard        │
│     Parallelo, con progress tracking                     │
│                                                          │
│  3. VIDEO GENERATION (CogVideoX via z.ai API)           │
│     Ogni scena → 4-6s video clip via CogVideoX          │
│     Polling async per ogni job                           │
│                                                          │
│  4. TIMELINE COMPOSER                                    │
│     Preview timeline con drag & drop delle scene         │
│     Ordinamento, durate, transizioni                     │
│                                                          │
│  5. EXPORT                                               │
│     Download scene individuali + info file               │
│     Future: composizione lato client via FFmpeg.wasm     │
└─────────────────────────────────────────────────────────┘
```

### API z.ai — CogVideoX
La z.ai API segue lo standard OpenAI-compatible per la generazione video:
- **Endpoint**: `https://api.z.ai/v1/video/generations` (o simile)
- **Modello**: `cogvideox` o `cogvideox-2` 
- **Auth**: Bearer token via `ZAI_API_KEY`
- **Modalità**: async — submit job → poll per risultato
- **Input**: prompt testuale (+ opzionalmente immagine per img2video)
- **Output**: URL video temporaneo (mp4)

### Key Design Decisions
1. **API Route come proxy** — la chiave z.ai sta nel backend (`.env`), non esposta al client. Next.js API Routes fanno da proxy.
2. **Zustand store separato** — `useVideoStore.js` per non ingrossare lo store esistente
3. **Polling intelligente** — UI con progress per ogni scena, retry automatico su failure
4. **Timeline UI** — componente dedicato con preview visuale delle scene, stato generazione, drag reorder
5. **Script generation via GLM-5.1** — zero costi aggiuntivi, usa Puter.js già integrato

## Implementation Steps

### Step 1: Environment & API Infrastructure
- `.env` — aggiungere `ZAI_API_KEY` (l'utente inserirà la propria chiave)
- `src/lib/zai-client.js` — client per z.ai API (submit video job, poll status, download result)
- `src/app/api/video/generate/route.js` — API route proxy per submit
- `src/app/api/video/status/[jobId]/route.js` — API route proxy per polling

### Step 2: Video Store
- `src/store/useVideoStore.js` — Zustand store per:
  - Stato workflow (idle → scripting → generating → composing → done)
  - Script scene array con stato per scena (pending → generating → done)
  - Video results (URLs, durate, thumbnails)
  - Timeline ordering
  - Settings (modello, durata per scena, risoluzione)

### Step 3: Script Generation Engine
- `src/lib/video-script.js` — modulo che usa GLM-5.1 (Puter.js) per:
  - Trasformare il prompt in uno script strutturato (4-8 scene)
  - Ogni scena: `{ title, description, visualPrompt, duration, transition, mood }`
  - Il `visualPrompt` è ottimizzato per CogVideoX (descrittivo, cinematografico)

### Step 4: Video Workflow Component
- `src/components/VideoStudio.js` — componente principale che orchestra tutto:
  - CTA "Generate Video" nel PromptBuilder esistente
  - Modale fullscreen con stepper (Script → Generate → Timeline → Export)
  - Progress tracking per ogni scena
  - Preview dei video generati

### Step 5: Timeline Composer
- `src/components/VideoTimeline.js` — timeline visuale:
  - Thumbnail delle scene con overlay stato
  - Drag & drop per riordinare
  - Click per preview singola scena
  - Indicatori di durata e transizione
  - Playbar per preview sequenziale

### Step 6: Scene Card Component
- `src/components/SceneCard.js` — card singola scena:
  - Thumbnail/preview video
  - Stato (pending, generating con spinner, done con check, error con retry)
  - Durata, titolo, description
  - Azioni: rigenera, download, rimuovi

### Step 7: Integration into existing PromptBuilder
- `src/components/PromptBuilder.js` — aggiungere:
  - Bottone "🎬 Video Studio" nell'header
  - Stato aperto/chiuso del VideoStudio
  - Passaggio del prompt attivo (enhanced o raw) al VideoStudio

### Step 8: CSS & Polish
- `src/app/app.css` — aggiungere:
  - Stili per timeline, scene cards, stepper
  - Animazioni per progress
  - Video player styling
  - Glassmorphism consistency

### Step 9: API Route - Video Generation
- `src/app/api/video/generate/route.js`:
  ```javascript
  // POST: submit video generation job
  // Body: { prompt, model, duration, imageUrl? }
  // Response: { jobId, status: "processing" }
  ```

### Step 10: API Route - Job Status Polling
- `src/app/api/video/status/[jobId]/route.js`:
  ```javascript
  // GET: poll job status
  // Response: { jobId, status: "processing"|"completed"|"failed", videoUrl?, error? }
  ```

## Reference Examples
- `src/lib/glm.js:1-290` — pattern per AI calls con retry e caching
- `src/lib/storage.js:1-50` — pattern per persistenza
- `src/store/usePromptStore.js:1-280` — pattern Zustand con async actions
- `src/components/ImageGeneration.js:1-50` — pattern per generazione multimediale con Puter.js
- `src/components/QuantumMutator.js:1-90` — pattern per modale fullscreen overlay

## Verification
1. `npm run build` — deve compilare senza errori
2. `npm run dev` — avviare il server
3. Verificare che il bottone "Video Studio" appaia nel PromptBuilder
4. Verificare che lo script generation funzioni (con Puter.js attivo)
5. Verificare che le API routes rispondano correttamente (con ZAI_API_KEY valida)
6. Verificare che il polling funzioni e aggiorni la UI
7. Verificare che i video vengano scaricati correttamente

## Notes
- Per la prima versione, **non** implementiamo la composizione video lato client (FFmpeg.wasm) — è complesso e pesante. L'utente scarica le scene individuali e le compone esternamente.
- L'API z.ai è ancora da verificare — il Coder dovrà adattare l'endpoint reale quando la documentazione sarà confermata.
- Il file `.env` non deve mai essere committato — verificare che sia nel `.gitignore`.
