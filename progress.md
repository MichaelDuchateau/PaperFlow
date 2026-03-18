# PaperFlow — Progress Log

---

## Current Status
**Phase:** Complete ✅
**Last updated:** 2026-03-15

---

## Session Log

### Session 0 — 2026-03-15 (Planning)
**Done:**
- Reviewed spec PDF
- Finalised tech stack (Electron + React + Vite + SQLite + Markmap)
- Wrote full architecture, IPC bridge, DB schema
- Wrote all 4 AI skill system prompts (mindmap, summary, flashcards, test)
- Wrote 6 built-in note templates with YAML frontmatter spec
- Locked all 5 architectural decisions
- Created task_plan.md, findings.md, progress.md (this file)

### Session 1 — 2026-03-15 (Phase 1 complete)
**Done:**
- package.json, index.html, vite.config.js, tailwind.config.js, postcss.config.js, .gitignore
- electron/main.js (BrowserWindow + all IPC handlers as stubs/impl)
- electron/preload.js (full `window.api` contextBridge)
- electron/schema.sql (WAL mode, 4 tables + default settings)
- src/main.jsx, App.jsx, index.css (React + HashRouter)
- src/pages/OverviewPage.jsx, ReaderPage.jsx, SettingsPage.jsx (stubs)
- npm install + electron-rebuild for better-sqlite3
- App verified launching: Vite → Electron loads http://localhost:5173
- **Bug fixed**: `ELECTRON_RUN_AS_NODE=1` inherited from Claude Code env; added `env -u ELECTRON_RUN_AS_NODE` to dev script

**Next session should start with:**
- Phase 2.1: `OverviewPage` full layout (sidebar dashboard + paper list)

### Session 2 — 2026-03-15 (Phase 2 complete)
**Done:**
- `src/components/shared/TagPill.jsx` — coloured tag pill with inline styles
- `src/components/overview/DashboardPanel.jsx` — Pomodoro bar, Papers bar, Recharts PieChart, ToThink list, Settings button
- `src/components/overview/PaperList.jsx` — table with status dot (clickable), title+meta, tag pills, action icons (note/flashcard/mindmap/test), download dropdown, delete; hover reveal
- `src/components/overview/TagFilter.jsx` — dropdown filter with tag pills + paper counts
- `src/pages/OverviewPage.jsx` — full state management, Add Paper flow, status change, delete, toast notifications, tag filtering
- `electron/main.js` — added `notes:getToThink` IPC handler
- `electron/preload.js` — exposed `notes.getToThink`

**Next session should start with:**
- Phase 3.1: Two-panel resizable layout in ReaderPage

### Session 3 — 2026-03-15 (Phase 3 complete)
**Done:**
- `electron/main.js` — added `papers:getPdfBuffer` IPC handler
- `src/lib/noteTemplates.js` — 6 built-in templates (free-form, SQ3R, PQ4R, Cornell, SOAP, CASP) with YAML frontmatter builder
- `src/components/reader/ReaderTopBar.jsx` — back arrow, editable title (save on Enter/blur), Pomodoro stub (Phase 4), settings gear
- `src/components/reader/PDFViewer.jsx` — pdfjs-dist 4.x, all pages stacked, workerSrc via Vite `?url`, loading/error states
- `src/components/reader/MindMapViewer.jsx` — Markmap.create + fit, placeholder with Generate button
- `src/components/reader/NotesEditor.jsx` — CodeMirror 6 (oneDark, markdown, history, closeBrackets), Edit/Preview toggle, 1s debounced auto-save, first-open template load
- `src/components/reader/AIActionBar.jsx` — 4 generate buttons with spinners, green dot when content exists
- `src/pages/ReaderPage.jsx` — resizable panels (drag handle, 25–80%), tab bar, toast notifications, title edit, AI stubs wired up
- **Fix**: markmap-view@0.17.x + markmap-common@0.18.x version mismatch → upgraded markmap-lib + markmap-view to 0.18.x

**Next session should start with:**
- Phase 4: PomodoroWidget component

### Session 4 — 2026-03-15 (Phase 4 complete)
**Done:**
- `src/components/reader/PomodoroWidget.jsx` — self-contained: SVG ring timer, states (Idle/Running/Paused/Break/BreakDone), settings popover (+/− inputs, enable toggle), session-end overlay (🎉/⏰), DB logging via `window.api.pomodoro.log()`
- `src/pages/ReaderPage.jsx` — added `handleSettingsChange`, passes `<PomodoroWidget>` to `ReaderTopBar` via `pomodoroWidget` prop (replaces Phase 3 stub)

**Next session should start with:**
- Phase 5: Settings page (General, Tags, Templates, Pomodoro, AI Skills, Goals)

### Session 5 — 2026-03-15 (Phase 5 complete)
**Done:**
- `electron/main.js` — added `dialog:openDirectory`, `templates:getAll`, `templates:save`, `templates:delete` IPC handlers
- `electron/preload.js` — exposed `dialog.openDirectory`, `templates.{getAll,save,delete}`
- `src/lib/defaultPrompts.js` — 4 AI skill system prompts (mindmap, summary, flashcards, test) + DEFAULT_SKILL_SETTINGS + SKILL_LABELS
- `src/components/settings/GeneralSection.jsx` — reviewer name, data folder picker (dialog:openDirectory), split direction toggle
- `src/components/settings/TagsSection.jsx` — full CRUD: inline edit, colour palette (PALETTE + custom color input), add row, hover-reveal delete
- `src/components/settings/TemplatesSection.jsx` — built-in template selector, custom template CRUD with inline CodeMirror 6 editor
- `src/components/settings/PomodoroSection.jsx` — enable toggle, work/break NumStepper inputs
- `src/components/settings/GoalsSection.jsx` — daily pomodoro goal + weekly papers goal NumSteppers
- `src/components/settings/AISkillsSection.jsx` — API key (safeStorage, show/hide toggle, ✓ stored indicator), per-skill panels (enable toggle, max tokens, temperature, system prompt CodeMirror editor, reset-to-default)
- `src/pages/SettingsPage.jsx` — sidebar nav (6 sections), section heading with icon, routes ?section= query param, unified handleSaveSettings

**Next session should start with:**
- Phase 6: Flashcard UI (`FlashcardReviewer` component)

### Session 6 — 2026-03-15 (Phase 6 complete)
**Done:**
- `electron/main.js` — added `flashcards:get` IPC handler; implemented real Anki tab-separated export in `export:anki` (parses `**Q:**`/`**A:**` blocks, writes TSV)
- `electron/preload.js` — exposed `window.api.flashcards.get`
- `src/App.jsx` — added `/flashcards/:id` route
- `src/components/flashcards/FlashcardReviewer.jsx` — `parseFlashcards()` parser; `FlipCard` with CSS 3D rotateY animation; confidence buttons (Again/Hard/Good/Easy, shortcuts 1–4); progress bar; "Again" re-queues card at end; `DoneScreen` with rating breakdown + restart/export; Space/Enter/Arrow keyboard shortcuts
- `src/pages/FlashcardsPage.jsx` — loads paper + flashcards, empty state, back to reader, Export to Anki button, toast
- `src/components/overview/PaperList.jsx` — flashcard icon now navigates to `/flashcards/:id`; mindmap icon navigates to `/reader/:id?tab=mindmap`
- `src/pages/ReaderPage.jsx` — handles `?tab=mindmap` URL param to switch left panel tab
- `src/components/reader/AIActionBar.jsx` — added "Review flashcards" quick-access button when flashcards exist

**Next session should start with:**
- Phase 7: Export Service (note, flashcards, mindmap .md exports — already have stubs, need full implementations)

### Session 7 — 2026-03-15 (Phase 7 complete)
**Done:**
- `electron/main.js` — `safeTitle()` + `copyExport()` helpers; improved `export:note/flashcards/mindmap` (use paper title in filename, return `{ error }` when missing); added `export:test` (copies test_path); added `export:summary` (formats JSON summary as Markdown doc with sections)
- `electron/preload.js` — exposed `export.test`, `export.summary`
- `src/components/overview/PaperList.jsx` — DownloadMenu expanded to 6 items (note, summary, flashcards, anki, mindmap, test); `run()` wrapper calls API + calls `onToast` on success/error; `onToast` prop threaded through PaperList → PaperRow → DownloadMenu
- `src/pages/OverviewPage.jsx` — passes `showToast` as `onToast` to PaperList

**Next session should start with:**
- Phase 8: AI Skills (real Claude API integration in claudeService.js)

### Session 8 — 2026-03-15 (Phase 8 complete)
**Done:**
- `electron/claudeService.js` — `runSkill(db, skillKey, rawText)`: reads API key via safeStorage; reads per-skill config (enabled, max_tokens, temperature, prompt) from settings DB with fallback to hardcoded defaults; lazy-requires `@anthropic-ai/sdk`; truncates at 300k chars (~75k tokens) with `truncated` flag; `stripCodeFence()` to clean model output; `extractJson()` to robustly parse summary JSON (handles prose wrapping + code fences); uses `claude-sonnet-4-6`
- `electron/main.js` — replaced 4 AI stubs with real handlers: mindmap saves to `mindmaps/mindmap_<id>.md` + updates `mindmap_path`; summary stores clean JSON in `papers.summary`; flashcards saves to `flashcards/flashcards_<id>.md`; test saves to `tests/test_<id>.md`
- `src/pages/ReaderPage.jsx` — removed stub check; shows truncation warning toast; error message uses `err.message` directly for clear user-facing errors (e.g. "No API key configured")

**Next session should start with:**
- Phase 9: Installer (electron-builder DMG/NSIS/AppImage)

### Session 9 — 2026-03-15 (Phase 9 complete — ALL PHASES DONE)
**Done:**
- `package.json` — added `author`, `postinstall` script; `build:mac/win/linux` scripts; full electron-builder config: `asarUnpack` for `**/*.node` + `pdf-parse` + `bindings`; Mac universal (arm64+x64) DMG; NSIS config (custom install dir, desktop + start menu shortcuts); AppImage for Linux; `publish: null`
- `build/icon.icns` — generated from 512x512 PNG via iconutil (macOS)
- `build/icon.png` — 512×512 Linux icon
- `build/icons/*.png` — 7 sizes (16–512px) for Linux AppImage
- `build/entitlements.mac.plist` — file-access + JIT entitlements
- `README.md` — full documentation: features, tech stack, prerequisites, dev setup, API key config, build instructions, icon guide, data paths, keyboard shortcuts, known limitations
- **Build test**: `PaperFlow-1.0.0-arm64.dmg` and `PaperFlow-1.0.0.dmg` both built successfully

---

### Session 10 — 2026-03-18 (Issues #1–#6 + Phase 10 complete)
**Done:**
- `src/components/reader/PomodoroWidget.jsx` — added `overflow-hidden` to toggle container; removed standalone gear button; made ring+time area clickable to open settings popover (fix #1, #3)
- `src/components/settings/PomodoroSection.jsx` — added `overflow-hidden` to toggle container (fix #1)
- `src/components/settings/AISkillsSection.jsx` — added `overflow-hidden` to toggle container (fix #1); full rewrite to add provider selector (Claude/Ollama radio), Claude API key panel shown conditionally, Ollama config panel (URL input, connection status badge, model dropdown/input, save) (fix #1, phase 10C)
- `electron/preload.js` — exposed `platform: process.platform`; added `ollama: { testConnection, listModels }` (fix #2, phase 10B)
- `src/App.jsx` — macOS-only 28px drag-region spacer above routes so traffic lights don't overlap content (fix #2)
- `src/components/reader/ReaderTopBar.jsx` — added `onExportNote` prop + download icon button; added `TagPicker` inline component + `allTags`/`onTagsChange` props; tag pills shown with × to remove, "+" dropdown to add (fix #4, fix #6)
- `src/pages/ReaderPage.jsx` — loads `window.api.tags.getAll()` on mount; `handleTagsChange` persists via `papers.update`; `handleExportNote` calls `export.note` with toast; passes all new props to `ReaderTopBar` (fix #4, fix #6)
- `electron/main.js` — improved error messages on missing file exports to include full path + dev/prod mismatch hint; added `ollama:testConnection` and `ollama:listModels` IPC handlers; renamed `claudeService` → `aiService` (fix #5, phase 10B)
- `electron/aiService.js` — new file: `getProvider(db)` helper; `callOllama()` using Node built-in `http`/`https`; `runSkill()` branches on `'claude'` vs `'ollama'` provider; identical interface as before (phase 10A)
- `electron/schema.sql` — added 3 default settings: `ai_provider='claude'`, `ai_ollama_url`, `ai_ollama_model` (phase 10B)
- `vite build` — passes cleanly

---

## Phase Completion Tracker

| Phase | Status | Notes |
|---|---|---|
| Phase 1 — Scaffold | ✅ Complete | |
| Phase 2 — Overview page | ✅ Complete | |
| Phase 3 — Reader page | ✅ Complete | |
| Phase 4 — Pomodoro | ✅ Complete | |
| Phase 5 — Settings | ✅ Complete | |
| Phase 6 — Flashcard UI | ✅ Complete | |
| Phase 7 — Export service | ✅ Complete | |
| Phase 8 — AI skills | ✅ Complete | claude-sonnet-4-6, all 4 skills |
| Phase 9 — Installer | ✅ Complete | DMG arm64+x64 verified |
| Phase 10 — Ollama provider | ✅ Complete | aiService.js, Settings UI, IPC handlers |
| Issues #1–#6 | ✅ Fixed | toggle overflow, macOS titlebar, gear dupe, export, errors, tags |

---

## Test Results

*(Populated during build)*

---

## Known Errors / Blockers

*(Populated during build — never repeat a logged failure)*

---

## Reminder: Core Rules
1. ALL file I/O in main process — never `fs` or `better-sqlite3` in renderer
2. API key via `safeStorage.encryptString()` only
3. Mock AI first, real API after Phase 3 UI is solid
4. PDF text extracted once on add, stored in DB as `raw_text`
5. `data/` dir = `app.getPath('userData')/data` by default
