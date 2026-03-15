# PaperFlow

A local-first desktop app for reading and annotating academic papers. Drag in a PDF and PaperFlow generates a mind map, structured summary, flashcards, and a practice test — all powered by Claude AI. Notes are saved as Obsidian-compatible Markdown.

---

## Features

- **PDF viewer** — read papers without leaving the app
- **AI generation** — mind map, summary, flashcards, and practice test via Claude API
- **Notes editor** — CodeMirror 6 with Markdown mode, 6 built-in templates (SQ3R, Cornell, CASP…), auto-save
- **Flashcard reviewer** — card flip animation, Again/Hard/Good/Easy confidence buttons, Anki export
- **Pomodoro timer** — SVG ring timer with break overlay and session logging
- **Tags** — colour-coded tags with pie chart in the dashboard
- **Export** — note, summary, flashcards, Anki TSV, mind map, practice test as `.md`/`.txt`
- **Fully local** — all data stored on your machine; API key encrypted via OS keychain

---

## Tech stack

| Layer | Library |
|---|---|
| Shell | Electron 32 |
| Frontend | React 18 + Vite 5 + Tailwind CSS 3 |
| Database | SQLite via better-sqlite3 (WAL mode) |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) |
| PDF view | pdfjs-dist 4 |
| PDF extract | pdf-parse |
| Mind map | Markmap 0.18 |
| Editor | CodeMirror 6 |
| Charts | Recharts |

---

## Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **npm 9+** — included with Node.js
- An **Anthropic API key** — [console.anthropic.com](https://console.anthropic.com)

---

## Development

```bash
# Clone
git clone https://github.com/MichaelDuchateau/PaperFlow.git
cd PaperFlow

# Install dependencies + rebuild native modules
npm install

# Start dev server (Vite + Electron)
npm run dev
```

> **macOS note:** The dev script uses `env -u ELECTRON_RUN_AS_NODE` to unset a variable that interferes with Electron when launched from certain shells (e.g. Claude Code). If you see `TypeError: Cannot read properties of undefined (reading 'isPackaged')`, this is why.

---

## Adding your API key

1. Launch the app and click **Settings** (gear icon in the dashboard)
2. Go to **AI Skills**
3. Paste your Anthropic API key — it is stored encrypted via your OS keychain (`safeStorage`)
4. Optionally customise the system prompt, max tokens, and temperature per skill

---

## Building for distribution

```bash
# macOS (produces arm64 + x64 DMGs in dist-electron/)
npm run build:mac

# Windows (produces NSIS installer in dist-electron/)
npm run build:win

# Linux (produces AppImage in dist-electron/)
npm run build:linux

# All platforms
npm run build
```

### App icons

Place your own icons in `build/` before building:

| File | Platform | Size |
|---|---|---|
| `build/icon.icns` | macOS | 1024×1024 (use `iconutil`) |
| `build/icon.ico` | Windows | 256×256 multi-resolution ICO |
| `build/icon.png` | Linux | 512×512 PNG |
| `build/icons/*.png` | Linux | 16, 32, 48, 64, 128, 256, 512 px PNGs |

Placeholder icons are included; replace them before a public release.

### macOS code signing

For distribution outside direct download, you need an Apple Developer certificate:

```bash
# Set your identity in package.json build.mac.identity, then:
npm run build:mac
```

For notarization, set `hardenedRuntime: true` in `package.json` and configure `afterSign` with `electron-notarize`.

---

## Data storage

All data lives in your OS user-data directory:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/PaperFlow/` |
| Windows | `%APPDATA%\PaperFlow\` |
| Linux | `~/.config/PaperFlow/` |

You can change the data folder in **Settings → General**.

Structure inside the data directory:

```
data/
  papers/         PDF copies
  notes/          Markdown note files
  flashcards/     AI-generated flashcard Markdown
  mindmaps/       AI-generated mind map Markdown
  tests/          AI-generated practice test Markdown
  templates/      Custom note templates
paperflow.db      SQLite database (WAL mode)
```

---

## Keyboard shortcuts (Flashcard Reviewer)

| Key | Action |
|---|---|
| `Space` / `Enter` | Flip card (or advance on Good if already flipped) |
| `1` | Again (re-queues card) |
| `2` | Hard |
| `3` | Good |
| `4` | Easy |
| `→` | Good (advance) |

---

## Known limitations

- **Image-based PDFs** — pdf-parse cannot extract text from scanned PDFs without embedded text; AI skills will fail with a clear error message
- **Very large papers** — text is truncated at ~75 000 tokens before sending to the API; a toast notification is shown
- **Windows code signing** — NSIS installer is unsigned by default; Windows Defender may warn on first run
- **No sync** — data is local only; back up your data directory manually

---

## License

MIT
