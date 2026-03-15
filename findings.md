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

## Errors & Lessons Learned

### ELECTRON_RUN_AS_NODE=1 shadows built-in `electron` module
**Symptom**: `require('electron')` returns a path string; `process.type` is `undefined`; `app.isPackaged` throws TypeError.
**Root cause**: Claude Code sets `ELECTRON_RUN_AS_NODE=1` in the shell. This flag makes Electron behave as plain Node.js, so the built-in `electron` module is never registered and `node_modules/electron/index.js` (which exports a path string) wins instead.
**Fix**: Prefix every `electron` invocation with `env -u ELECTRON_RUN_AS_NODE`. Already applied to the `dev` script in package.json.
**Never repeat**: Always unset this variable before spawning Electron in terminal commands.
