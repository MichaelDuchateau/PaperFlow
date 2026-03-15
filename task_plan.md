# PaperFlow — Task Plan

## Project Goal
Build a local-first Electron + React + Vite desktop app for academic paper reading.
Students drag in a PDF → app generates mind map, summary, flashcards, and practice test via Claude API.
Notes saved as Obsidian-compatible Markdown with YAML frontmatter.

## Tech Stack
- **Shell**: Electron + electron-builder
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: SQLite via better-sqlite3
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514)
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

## Phase 8 — AI Skills (Claude API)
- [ ] 8.1 `claudeService.js`: `runSkill(skillName, paperText, userSettings)`
- [ ] 8.2 PDF text extraction: `extractText(pdfPath)` using pdf-parse
- [ ] 8.3 Store extracted text in DB on paper add
- [ ] 8.4 Mind map skill: returns Markmap Markdown bullet list
- [ ] 8.5 Summary skill: returns structured JSON
- [ ] 8.6 Flashcard skill: returns Markdown with sections per card
- [ ] 8.7 Practice test skill: returns Markdown with MCQ + short answer + answer key
- [ ] 8.8 Handle large papers (>80k tokens): truncate with warning

## Phase 9 — Installer
- [ ] 9.1 Configure electron-builder: NSIS (Win), DMG (Mac), AppImage (Linux)
- [ ] 9.2 Test build on dev machine
- [ ] 9.3 Write install instructions in README

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
