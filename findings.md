# PaperFlow — Findings & Reference

> Research, decisions, and key facts accumulated during the build. Read this before major decisions.

---

## Architecture Decisions (Locked)

| Decision | Choice | Why |
|---|---|---|
| App shell | Electron | Single JS stack; easiest PDF.js + Markdown integration |
| Frontend | React + Vite | Fast DX, strong ecosystem |
| Styling | Tailwind CSS | Dark mode via `dark:`, utility-first |
| Database | SQLite (better-sqlite3) | Zero-config, local, file-portable; Obsidian uses same |
| Mind map | Markmap.js | Accepts Markdown bullet list natively, interactive SVG |
| AI model | claude-sonnet-4-20250514 | Best cost/quality; 200k context window |
| Notes format | Markdown + YAML frontmatter | Obsidian-compatible out of the box |
| Flashcard export | Tab-separated `.txt` v1 | Zero dependencies; Anki imports natively |
| Collaboration v1 | File sync (Syncthing/iCloud) | No server needed; MD files sync cleanly |

---

## Key File Paths at Runtime

```
app.getPath('userData')/
└── data/
    ├── papers/            ← stored PDFs
    ├── notes/             ← note_<paperid>.md
    ├── flashcards/        ← flashcards_<paperid>.md
    ├── mindmaps/          ← mindmap_<paperid>.md
    ├── tests/             ← test_<paperid>.md
    └── templates/         ← custom note templates
```

---

## IPC Channel Reference

| Channel | Direction | Payload |
|---|---|---|
| `papers:getAll` | renderer → main | — |
| `papers:getById` | renderer → main | `id: string` |
| `papers:add` | renderer → main | `filePath: string` |
| `papers:update` | renderer → main | `id, data` |
| `papers:delete` | renderer → main | `id: string` |
| `ai:mindmap` | renderer → main | `paperId: string` |
| `ai:summary` | renderer → main | `paperId: string` |
| `ai:flashcards` | renderer → main | `paperId: string` |
| `ai:test` | renderer → main | `paperId: string` |
| `export:note` | renderer → main | `paperId, destPath` |
| `export:flashcards` | renderer → main | `paperId, destPath` |
| `export:anki` | renderer → main | `paperId, destPath` |
| `export:mindmap` | renderer → main | `paperId, destPath` |
| `settings:get` | renderer → main | `key: string` |
| `settings:set` | renderer → main | `key, value` |
| `pomodoro:log` | renderer → main | `session object` |
| `pomodoro:stats` | renderer → main | — |

---

## SQLite Schema Summary

Tables: `papers`, `tags`, `pomodoro_sessions`, `settings`

Key columns on `papers`:
- `id` TEXT PK (UUID)
- `file_path` TEXT (relative to data dir)
- `tags` TEXT (JSON array of tag IDs)
- `status` TEXT: `unread | reading | done`
- `notes_path`, `flashcards_path`, `mindmap_path` TEXT
- `summary` TEXT (JSON from summary skill)
- `raw_text` TEXT (extracted PDF text, stored once on add)

Enable WAL mode on init: `PRAGMA journal_mode=WAL`

---

## AI Skill Output Formats

### Mind map skill
Returns Markmap-compatible Markdown bullet list.
Root = paper title. Level 1 = major sections. Level 2-3 = sub-topics.
Node labels ≤ 5 words. No full sentences.
Saved as `mindmap_<id>.md`.

### Summary skill
Returns JSON:
```json
{
  "title": "", "authors": [], "year": 0, "doi": "",
  "background": "", "objective": "", "methods": "",
  "results": [], "conclusion": "", "limitations": "",
  "keywords": [], "study_type": ""
}
```

### Flashcard skill
Returns Markdown. Each card = one `## Card N` section with `**Q:**` and `**A:**` lines.
15–30 cards per paper. Saved as `flashcards_<id>.md`.

### Practice test skill
Returns Markdown: 5 MCQ + 3 short answer + 2 critical appraisal + `## Answer Key`.
Saved as `test_<id>.md`.

---

## Note YAML Frontmatter (Obsidian-compatible)

```yaml
---
title: ""
authors: []
year: 0
doi: ""
tags: []
status: unread
reviewer: ""
added: YYYY-MM-DD
pomodoros: 0
---
```

---

## Built-in Note Templates

1. Free-form (default)
2. SQ3R (Survey, Question, Read, Recite, Review)
3. PQ4R (Preview, Question, Read, Reflect, Recite, Review)
4. Cornell Notes
5. SOAP (clinical/medical papers)
6. CASP-style Critical Appraisal

Each template must include `## ToThink` and `## Tasks` sections.

---

## Markmap Rendering Pattern

```js
// Main process: transform MD → data
import { Transformer } from 'markmap-lib';
const transformer = new Transformer();
const { root, features } = transformer.transform(markdownString);
// Send root + features to renderer via IPC
// Renderer: Markmap.create(svgElement, { root, features })
```

---

## Large Paper Handling (v1)

Truncate extracted text at 80,000 tokens before sending to Claude API.
Show a warning toast: "Paper truncated to 80k tokens for AI processing."
Implement chunked summarisation in v2.

---

## Pending Decisions

- [ ] **P3: Anki export** — tab-sep `.txt` (v1) or `.apkg` binary (v2)?  → **Locked: txt for v1**
- [ ] **P4: Collaboration** — file sync only for v1  → **Locked: file sync**
- [ ] **P5: Large papers** — truncate at 80k tokens  → **Locked**

---

---

## Chandra OCR v2 — Integration Research

**Package**: `chandra-ocr` (Python, PyPI) — NOT a JS library. Cannot be imported directly.
**Model**: `datalab-to/chandra-ocr-2` on HuggingFace. Requires GPU for local inference.
**Hosted API**: `https://www.datalab.to/` — REST endpoint, requires free API key.
**CLI**: `chandra input.pdf ./output --format md` — produces per-page Markdown files.

### Integration decision for Electron
Use the **Datalab hosted REST API** (not the local CLI or Python package):
- No Python dependency for end users
- Simple HTTPS calls from Node (same pattern as Claude API)
- API key stored via `safeStorage` (mirrors existing Claude key handling)
- Free tier available; link in settings for key signup

### Datalab API endpoint (inferred from docs + chandra-ocr source)
```
POST https://www.datalab.to/api/v1/marker
Headers: { X-Api-Key: <key>, Content-Type: application/json }
Body: { file: <base64 PDF>, langs: null, force_ocr: false, output_format: "markdown" }
Response: { markdown: "...", pages: N, ... }
```
Verify exact endpoint in Datalab docs before implementation — may differ.

### Chandra v2 vs v1
- v2 released 2026-03-18 (tag `v0.2.0`): improved math, tables, multilingual, layout
- Model: `datalab-to/chandra-ocr-2` (HF)
- For hosted API, version is managed server-side — always latest

### Fallback chain
1. If `chandra_api_key_encrypted` set → use Datalab API → store in `ocr_text`
2. If no key → use existing `raw_text` from `pdf-parse` (always available, stored on add)
3. Toggle in Reader shows `ocr_text` when available, otherwise `raw_text`

---

## Ollama REST API Reference (from ollama-ui research)

Base URL: `http://localhost:11434` (configurable via `ai_ollama_url` setting)

| Endpoint | Method | Description |
|---|---|---|
| `/api/version` | GET | `{ version: string }` — also used as health check |
| `/api/tags` | GET | `{ models: [{ name, size, modified_at, details: { family, parameter_size, quantization_level } }] }` |
| `/api/ps` | GET | `{ models: [{ name, size, size_vram }] }` — currently loaded in VRAM |
| `/api/show` | POST `{ model }` | `{ modelfile, parameters, template }` |
| `/api/delete` | DELETE `{ model }` | 200 OK on success |
| `/api/pull` | POST `{ model, stream: true }` | NDJSON stream: `{ status, completed?, total? }` |

### Ollama server start/stop
- Start: `spawn('ollama', ['serve'])` — on macOS/Linux, `ollama` must be on PATH
- Stop: `.kill()` on the spawned ChildProcess
- Track process in a `let ollamaProcess` global in `main.js`
- After spawn, poll `/api/version` up to 3× (500ms apart) to confirm ready
- Windows note: `ollama serve` may already run as a system tray process — `startServer` should check `ollama:status` first and skip spawn if already running

### Pull progress streaming pattern
```js
// main.js
ipcMain.handle('ollama:pullModel', async (event, name) => {
  // stream response line by line
  for await (const chunk of streamOllamaPull(url, name)) {
    event.sender.send('ollama:pullProgress', chunk);
  }
  return { ok: true };
});

// preload.js
ollama: {
  pullModel: (name) => ipcRenderer.invoke('ollama:pullModel', name),
  onPullProgress: (cb) => ipcRenderer.on('ollama:pullProgress', (_, data) => cb(data)),
  offPullProgress: (cb) => ipcRenderer.removeListener('ollama:pullProgress', cb),
}
```

---

## Errors & Lessons Learned

### ELECTRON_RUN_AS_NODE=1 shadows built-in `electron` module
**Symptom**: `require('electron')` returns a path string; `process.type` is `undefined`; `app.isPackaged` throws TypeError.
**Root cause**: Claude Code sets `ELECTRON_RUN_AS_NODE=1` in the shell. This flag makes Electron behave as plain Node.js, so the built-in `electron` module is never registered and `node_modules/electron/index.js` (which exports a path string) wins instead.
**Fix**: Prefix every `electron` invocation with `env -u ELECTRON_RUN_AS_NODE`. Already applied to the `dev` script in package.json.
**Never repeat**: Always unset this variable before spawning Electron in terminal commands.
