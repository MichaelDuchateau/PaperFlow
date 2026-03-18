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
| AI | Anthropic Claude API (`claude-sonnet-4-6`) or Ollama (local) |
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

## AI provider setup

PaperFlow supports two AI providers. Switch between them in **Settings → AI Skills → AI Provider**.

### Claude (Anthropic API) — default

1. Launch the app and click **Settings** (gear icon in the dashboard)
2. Go to **AI Skills**
3. Make sure **Claude (Anthropic API)** is selected
4. Paste your Anthropic API key — stored encrypted via your OS keychain (`safeStorage`)
5. Optionally customise the system prompt, max tokens, and temperature per skill

### Ollama (local, no API key required)

Run all 4 AI skills against a locally-running [Ollama](https://ollama.com) instance — no internet connection or API key needed.

**Prerequisites:**

```bash
# Install Ollama
brew install ollama        # macOS
# or download from https://ollama.com

# Pull a model (llama3.2 is the default)
ollama pull llama3.2

# Start the Ollama server (runs on http://localhost:11434)
ollama serve
```

**Configure in PaperFlow:**

1. Go to **Settings → AI Skills**
2. Select **Ollama (local)**
3. The connection status badge will turn green if Ollama is reachable
4. Click **Refresh** to load your pulled models, then select one from the dropdown
5. Click **Save**

> **Note:** Ollama models are generally less capable than `claude-sonnet-4-6` for structured tasks like JSON summary extraction. Results may vary by model. Models with at least 7B parameters are recommended.

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
