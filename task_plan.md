# PaperFlow — Task Plan

## Project Goal
Build a local-first Electron + React + Vite desktop app for academic paper reading.
Students drag in a PDF → app generates mind map, summary, flashcards, and practice test via Claude API.
Notes saved as Obsidian-compatible Markdown with YAML frontmatter.

## Tech Stack
- **Shell**: Electron + electron-builder
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: SQLite via better-sqlite3
- **AI**: Anthropic Claude API (`claude-sonnet-4-6`) + Ollama (local, provider-selectable)
- **PDF**: pdf-parse (extraction) + pdfjs-dist (viewer)
- **Mind map**: Markmap.js
- **Editor**: CodeMirror 6
- **Charts**: Recharts

---

## Phase 1 — Scaffold & Infrastructure ✅ COMPLETE
- [x] 1.1 Init Vite React project
- [x] 1.2 Install all npm dependencies
- [x] 1.3 Create `electron/main.js` with BrowserWindow + IPC handlers
- [x] 1.4 Create `electron/preload.js` IPC bridge (`window.api`)
- [x] 1.5 Create SQLite schema (`schema.sql`) and run on first launch
- [x] 1.6 Create `data/` directory structure on startup
- [x] 1.7 Configure Tailwind CSS
- [x] 1.8 Configure React Router (routes: `/`, `/reader/:id`, `/settings`)
- [x] 1.9 Wire up electron-builder config in `package.json`
- [x] 1.10 Verify app launches with `npm run dev`

## Phase 2 — Overview Page ✅ COMPLETE
- [x] 2.1 `OverviewPage` layout (sidebar dashboard + main paper list)
- [x] 2.2 `PaperList` table component (columns: title, tags, icons, download)
- [x] 2.3 `AddPaperButton` → Electron file dialog → `window.api.papers.add()`
- [x] 2.4 `TagFilter` dropdown
- [x] 2.5 `DashboardPanel` sidebar:
  - [x] Pomodoro progress bar (today: done/goal)
  - [x] Papers progress bar (total/goal)
  - [x] Tags pie chart (Recharts PieChart)
  - [x] ToThink aggregated list
- [x] 2.6 Coloured tag pills rendering
- [x] 2.7 Click paper title → navigate to `/reader/:id`
- [x] 2.8 Click Note icon → navigate to `/reader/:id?panel=notes`
- [x] 2.9 Download icons call `window.api.export.*`

## Phase 3 — Reader Page ✅ COMPLETE
- [x] 3.1 Two-panel resizable layout (default: left content / right notes)
- [x] 3.2 Left panel tab 1: `PDFViewer` using pdfjs-dist
- [x] 3.3 Left panel tab 2: `MindMapViewer` using Markmap.js
  - [x] Placeholder + Generate button if mindmap not yet created
- [x] 3.4 Right panel: `NotesEditor` (CodeMirror 6, Markdown mode)
  - [x] Edit / Preview toggle
  - [x] Debounced auto-save (1s) via IPC
  - [x] Load template on first open (based on Settings default)
- [x] 3.5 AI action bar (bottom): Generate Mind Map / Summary / Flashcards / Test buttons
  - [x] Loading spinner on button while generating
  - [x] Refresh panel on completion
- [x] 3.6 Top bar: back arrow, paper title (editable), Pomodoro widget, settings gear

## Phase 4 — Pomodoro Widget ✅ COMPLETE
- [x] 4.1 `PomodoroWidget` component (persistent top-right)
- [x] 4.2 States: Idle → Running → Paused → Break → Done
- [x] 4.3 Click → settings popover (work/break durations, on/off toggle)
- [x] 4.4 Session end: dimmed overlay + popup notification
- [x] 4.5 Log session to DB via `window.api.pomodoro.log()`
- [x] 4.6 Timer uses `setInterval` in renderer

## Phase 5 — Settings Page ✅ COMPLETE
- [x] 5.1 General section: reviewer name, data folder path, split direction
- [x] 5.2 Tags section: add/remove/rename/recolour tags (stored in `tags` table)
- [x] 5.3 Note Templates section: template selector + CodeMirror editor for custom templates
- [x] 5.4 Pomodoro section: default durations, enable/disable
- [x] 5.5 AI Skills section:
  - [x] Anthropic API key (encrypted via `safeStorage`)
  - [x] Per-skill: enable/disable, system prompt editor, max tokens, temperature
- [x] 5.6 Goals section: daily pomodoro goal, weekly paper goal

## Phase 6 — Flashcard UI ✅ COMPLETE
- [x] 6.1 `FlashcardReviewer` component (parse `flashcards_<id>.md`)
- [x] 6.2 Single card display with flip on click/spacebar
- [x] 6.3 Confidence buttons: Again / Hard / Good / Easy
- [x] 6.4 Progress indicator: Card X of N
- [x] 6.5 Export button → `window.api.export.exportAnki(id)`

## Phase 7 — Export Service ✅ COMPLETE
- [x] 7.1 Export note `.md` file
- [x] 7.2 Export flashcards `.md` file
- [x] 7.3 Export Anki tab-separated `.txt`
- [x] 7.4 Export mind map `.md` file
- [x] 7.5 All exports triggered from Overview page download icons
- [x] 7.6 Export summary `.md` (formatted from JSON)
- [x] 7.7 Export practice test `.md`

## Phase 8 — AI Skills (Claude API) ✅ COMPLETE
- [x] 8.1 `claudeService.js`: `runSkill(db, skillKey, rawText)`
- [x] 8.2 PDF text extraction: done in Phase 1 (pdf-parse on papers:add)
- [x] 8.3 Store extracted text in DB on paper add: done in Phase 1
- [x] 8.4 Mind map skill: saves Markmap Markdown to mindmaps/, updates mindmap_path
- [x] 8.5 Summary skill: extracts JSON, stores in papers.summary column
- [x] 8.6 Flashcard skill: saves Markdown to flashcards/, updates flashcards_path
- [x] 8.7 Practice test skill: saves Markdown to tests/, updates test_path
- [x] 8.8 Handle large papers (>75k tokens): truncate at 300k chars with toast warning

## Phase 9 — Installer ✅ COMPLETE
- [x] 9.1 Configure electron-builder: NSIS (Win), DMG (Mac arm64+x64), AppImage (Linux)
- [x] 9.2 Test build on dev machine — both arm64 + x64 DMGs built successfully
- [x] 9.3 Write install instructions in README

---

## Phase 10 — Ollama Local AI Provider

### Goal
Let users run all 4 AI skills against a locally-running Ollama instance instead of (or
alongside) the Claude API. Provider is selectable per-installation in Settings → AI Skills.
No new npm dependencies — Ollama's REST API is called with Node's built-in `http` module.

### Architecture decision
`claudeService.js` is renamed to `aiService.js`. It gains a provider branch:
- **`claude`** — existing Anthropic SDK path, unchanged
- **`ollama`** — HTTP POST to `http://<ollamaUrl>/api/chat` with `"stream": false`

The 4 `ai:*` IPC handlers in `main.js` call `aiService.runSkill()` — same interface, no
changes needed there. All renderer code is unaffected.

### New settings keys (added to schema.sql defaults)
| Key | Default | Description |
|---|---|---|
| `ai_provider` | `'claude'` | Active provider: `'claude'` \| `'ollama'` |
| `ai_ollama_url` | `'http://localhost:11434'` | Ollama base URL (supports remote) |
| `ai_ollama_model` | `'llama3.2'` | Model tag to use (must be pulled in Ollama) |

### Tasks

#### A — Main process
- [x] 10.1 Rename `electron/claudeService.js` → `electron/aiService.js`; update `require` in `main.js`
- [x] 10.2 Add `getProvider(db)` helper (reads `ai_provider` setting)
- [x] 10.3 Add `callOllama(ollamaUrl, model, systemPrompt, userText, config)` function
  - POST to `<ollamaUrl>/api/chat` with `{ model, stream: false, messages: [system, user], options: { temperature, num_predict } }`
  - Returns `{ content, truncated }` — same shape as Claude path
- [x] 10.4 Branch `runSkill()` on provider: Claude path unchanged; Ollama path uses `callOllama()`
- [x] 10.5 Add `ollama:listModels` IPC handler — GET `<ollamaUrl>/api/tags`, return model name array
- [x] 10.6 Add `ollama:testConnection` IPC handler — HEAD/GET `<ollamaUrl>/`, return `{ ok, error? }`
- [x] 10.7 Expose `ollama.listModels` and `ollama.testConnection` in `electron/preload.js`
- [x] 10.8 Add 3 new default rows to `electron/schema.sql`

#### B — Settings UI
- [x] 10.9  Add provider selector (Claude / Ollama radio toggle) at top of AI Skills section
  - Saves `ai_provider`; shows/hides the relevant config panel below
- [x] 10.10 Add Ollama config panel (shown when Ollama selected):
  - Base URL text input (default `http://localhost:11434`)
  - Connection status badge — calls `ollama:testConnection` on mount + "Test" button
  - Model dropdown — populated by `ollama:listModels`; "Refresh" button
  - Saves `ai_ollama_url` and `ai_ollama_model`
- [x] 10.11 Rename existing "Anthropic API key" block → "Claude API" and wrap it so it is
  only shown when Claude provider is selected

#### C — Verify & polish
- [x] 10.12 Build verify (`vite build`) — passes cleanly
- [ ] 10.13 Manual smoke test: switch to Ollama, generate mind map, confirm file saved
- [x] 10.14 Update README with Ollama setup section

### Out of scope for this phase
- Per-skill provider override (global provider only)
- Streaming output / progress display
- Ollama model pulling from within the app (`ollama pull`)
- Any SRS/scheduling for flashcards

---

---

## Phase 11 — Reader PDF / Text Toggle (pdf-parse)

### Goal
Add a **PDF | Text** view toggle in the Reader left panel. The "Text" view renders the
existing `raw_text` column (extracted by `pdf-parse` on paper add). No new extraction or
API calls — `raw_text` is already in every paper row. Chandra OCR deferred to a later phase.

### Architecture Decision
`raw_text` is already loaded in `papers:getById`. No new IPC needed for read — just pass
`paper.raw_text` down from `ReaderPage`. Toggle state is local React state in `ReaderPage`.

### Tasks
- [ ] 11.1 Add `PDF | Text` pill toggle to `ReaderTopBar.jsx`; accept `viewMode` + `onViewModeChange` props
- [ ] 11.2 In `ReaderPage.jsx`: add `const [viewMode, setViewMode] = useState('pdf')`; pass to `ReaderTopBar`
- [ ] 11.3 When `viewMode === 'text'`, render new `ExtractedTextPane` instead of `PDFViewer` in left panel
- [ ] 11.4 Create `src/components/reader/ExtractedTextPane.jsx`:
  - Receives `rawText` string prop
  - If empty: show "No text extracted for this PDF." placeholder
  - Otherwise: render scrollable pre-formatted text (whitespace-pre-wrap, selectable)
  - Source badge: "pdf-parse" in gray — Chandra upgrade path reserved

---

## Phase 12 — Ollama Management Panel

### Goal
Give users full visibility and control of the local Ollama service from within PaperFlow:
start/stop the server, see which models are installed and running in VRAM, pull new models
with a live progress bar, inspect and delete models. Mirrors the `ollama-ui` reference app.

### Architecture Decision
All Ollama REST calls use Node's built-in `http` module (same as existing `ollama:testConnection`).
Server start/stop: spawn `ollama serve` as a child_process tracked in a `let ollamaProcess` global.
Pull progress streaming: `main.js` sends IPC events via `event.sender.send('ollama:pullProgress', chunk)`
while a handle resolves only on completion/error.

### New IPC Handlers
| Channel | Description |
|---|---|
| `ollama:status` | `→ { running: bool, version?: string }` |
| `ollama:startServer` | spawn `ollama serve`, return `{ ok }` |
| `ollama:stopServer` | kill tracked process, return `{ ok }` |
| `ollama:listRunning` | GET /api/ps → `[{ name, size, size_vram }]` |
| `ollama:showModel` | `name → { modelfile, parameters, template }` |
| `ollama:deleteModel` | `name → { ok }` |
| `ollama:pullModel` | `name →` stream progress via `ollama:pullProgress` event, resolves `{ ok }` |

(Note: `ollama:listModels` and `ollama:testConnection` already exist — keep as-is)

### Tasks

#### A — Main process
- [ ] 12.1 Add `let ollamaProcess = null` global in `main.js`
- [ ] 12.2 Add `ollama:status` handler — GET `<ollamaUrl>/api/version` → `{ running, version }`; on ECONNREFUSED return `{ running: false }`
- [ ] 12.3 Add `ollama:startServer` handler — `spawn('ollama', ['serve'], { detached: false })`; store in `ollamaProcess`; wait 1.5s then ping `/api/version` to confirm; return `{ ok }`
- [ ] 12.4 Add `ollama:stopServer` handler — `ollamaProcess?.kill()`; set `ollamaProcess = null`; return `{ ok }`
- [ ] 12.5 Add `ollama:listRunning` handler — GET `<ollamaUrl>/api/ps` → return models array
- [ ] 12.6 Add `ollama:showModel` handler — POST `<ollamaUrl>/api/show` with `{ model: name }`
- [ ] 12.7 Add `ollama:deleteModel` handler — DELETE `<ollamaUrl>/api/delete` with `{ model: name }`
- [ ] 12.8 Add `ollama:pullModel` handler — streaming POST `<ollamaUrl>/api/pull`; for each JSON line call `event.sender.send('ollama:pullProgress', chunk)`; resolve `{ ok }` on completion
- [ ] 12.9 Expose all new channels + `ollama:pullProgress` event listener in `preload.js`

#### B — Settings UI
- [ ] 12.10 Add `{ id: 'ollama', label: 'Ollama', icon: '...' }` nav item to `NAV` in `SettingsPage.jsx`
- [ ] 12.11 Create `src/components/settings/OllamaSection.jsx`:
  - **Server status row**: colored dot (green/red) + version string + "Start" / "Stop" buttons
    - On mount: call `ollama.status()`; auto-refresh every 5s while panel is visible
  - **Models in memory** (from `ollama:listRunning`): metric cards showing name, size GB, VRAM GB; shown only when Ollama is running
  - **Installed models table** (from `ollama:listModels`): columns Name | Size | Family | Parameters | Quantization | Modified; with per-row "Inspect" + "Delete" (confirm checkbox) actions
  - **Inspect drawer**: shows modelfile, parameters, template in `<pre>` blocks
  - **Pull model form**: text input + "Pull" button; live progress bar listening to `ollama:pullProgress` events; success/error toast
- [ ] 12.12 Import and wire `OllamaSection` in `SettingsPage.jsx` alongside existing sections

---

## Critical Rules
1. ALL file I/O in main process only — never import `fs` or `better-sqlite3` in renderer
2. API key stored via `safeStorage.encryptString()` — never in plain JSON
3. Mock AI calls first, add real API calls once UI is solid
4. PDF text extracted once on paper add, stored in DB — never re-extract per skill call
5. `data/` dir lives in `app.getPath('userData')` by default, configurable in Settings

## Known Risks / Watch Points
- Markmap rendering: transform in main process, render SVG in renderer
- Large PDFs (>50 pages): truncate at 80k tokens with warning toast
- SQLite concurrent writes: enable WAL mode (`PRAGMA journal_mode=WAL`)
- Dark mode: use Tailwind `dark:` variant, detect via `matchMedia`
