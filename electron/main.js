'use strict';

const { app, BrowserWindow, ipcMain, dialog, safeStorage } = require('electron');
const path = require('path');
const fs   = require('fs');

// ── Globals ────────────────────────────────────────────────────────
let db;
let ollamaProcess = null;
const isDev    = !app.isPackaged;
const USER_DATA = app.getPath('userData');
const DATA_DIR  = path.join(USER_DATA, 'data');

// ── Data directories ───────────────────────────────────────────────
function ensureDataDirectories() {
  const dirs = [
    DATA_DIR,
    path.join(DATA_DIR, 'papers'),
    path.join(DATA_DIR, 'notes'),
    path.join(DATA_DIR, 'flashcards'),
    path.join(DATA_DIR, 'mindmaps'),
    path.join(DATA_DIR, 'tests'),
    path.join(DATA_DIR, 'templates'),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

// ── SQLite ─────────────────────────────────────────────────────────
function initDatabase() {
  const Database = require('better-sqlite3');
  const dbPath   = path.join(USER_DATA, 'paperflow.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
}

// ── BrowserWindow ──────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,          // needed for preload to require electron
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0f0f1a',
    show: false,
  });

  win.once('ready-to-show', () => win.show());

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// ── App lifecycle ──────────────────────────────────────────────────
app.whenReady().then(() => {
  ensureDataDirectories();
  initDatabase();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC handlers ───────────────────────────────────────────────────
function registerIpcHandlers() {

  // ── Papers ──────────────────────────────────────────────────────
  ipcMain.handle('papers:getAll', () => {
    return db.prepare('SELECT * FROM papers ORDER BY added_at DESC').all();
  });

  ipcMain.handle('papers:getById', (_, id) => {
    return db.prepare('SELECT * FROM papers WHERE id = ?').get(id);
  });

  ipcMain.handle('papers:add', async (_, filePath) => {
    const { v4: uuidv4 } = require('uuid');
    const pdfParse       = require('pdf-parse');

    const id       = uuidv4();
    const fileName = path.basename(filePath, '.pdf');
    const destRel  = `papers/${id}.pdf`;
    const destAbs  = path.join(DATA_DIR, destRel);

    fs.copyFileSync(filePath, destAbs);

    let rawText = '';
    try {
      const buf     = fs.readFileSync(filePath);
      const pdfData = await pdfParse(buf);
      rawText = pdfData.text || '';
    } catch (e) {
      console.error('[pdf-parse] extraction failed:', e.message);
    }

    const now = new Date().toISOString().split('T')[0];
    db.prepare(`
      INSERT INTO papers (id, title, file_path, raw_text, tags, status, added_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, fileName, destRel, rawText, '[]', 'unread', now);

    return db.prepare('SELECT * FROM papers WHERE id = ?').get(id);
  });

  ipcMain.handle('papers:update', (_, { id, data }) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), id];
    db.prepare(`UPDATE papers SET ${fields} WHERE id = ?`).run(...values);
    return db.prepare('SELECT * FROM papers WHERE id = ?').get(id);
  });

  ipcMain.handle('papers:delete', (_, id) => {
    const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(id);
    if (paper) {
      for (const relPath of [paper.file_path, paper.notes_path, paper.flashcards_path, paper.mindmap_path, paper.test_path]) {
        if (relPath) {
          const abs = path.join(DATA_DIR, relPath);
          if (fs.existsSync(abs)) fs.unlinkSync(abs);
        }
      }
      db.prepare('DELETE FROM papers WHERE id = ?').run(id);
    }
    return { success: true };
  });

  // ── Tags ─────────────────────────────────────────────────────────
  ipcMain.handle('tags:getAll', () => {
    return db.prepare('SELECT * FROM tags ORDER BY name ASC').all();
  });

  ipcMain.handle('tags:add', (_, { name, color }) => {
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    db.prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)').run(id, name, color || '#6366f1');
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
  });

  ipcMain.handle('tags:update', (_, { id, name, color }) => {
    db.prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?').run(name, color, id);
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
  });

  ipcMain.handle('tags:delete', (_, id) => {
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    return { success: true };
  });

  // ── Settings ─────────────────────────────────────────────────────
  ipcMain.handle('settings:get', (_, key) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (!row) return null;
    try { return JSON.parse(row.value); } catch { return row.value; }
  });

  ipcMain.handle('settings:set', (_, { key, value }) => {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, serialized);
    return { success: true };
  });

  ipcMain.handle('settings:getAll', () => {
    const rows   = db.prepare('SELECT key, value FROM settings').all();
    const result = {};
    for (const row of rows) {
      try { result[row.key] = JSON.parse(row.value); } catch { result[row.key] = row.value; }
    }
    return result;
  });

  // API key uses safeStorage for encryption at rest
  ipcMain.handle('settings:setApiKey', (_, plaintext) => {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('safeStorage not available on this platform');
    }
    const encrypted = safeStorage.encryptString(plaintext).toString('base64');
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('api_key_encrypted', JSON.stringify(encrypted));
    return { success: true };
  });

  ipcMain.handle('settings:getApiKey', () => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('api_key_encrypted');
    if (!row) return null;
    const encrypted = JSON.parse(row.value);
    if (!encrypted || !safeStorage.isEncryptionAvailable()) return null;
    try {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
    } catch {
      return null;
    }
  });

  // ── Notes ────────────────────────────────────────────────────────
  ipcMain.handle('notes:getToThink', () => {
    const papers = db.prepare('SELECT id, title, notes_path FROM papers').all();
    const items  = [];
    for (const paper of papers) {
      if (!paper.notes_path) continue;
      const abs = path.join(DATA_DIR, paper.notes_path);
      if (!fs.existsSync(abs)) continue;
      const content = fs.readFileSync(abs, 'utf8');
      const match   = content.match(/^##\s+ToThink\s*\n([\s\S]*?)(?=^##|\s*$)/m);
      if (!match) continue;
      const lines = match[1].split('\n')
        .map(l => l.replace(/^[-*]\s+/, '').trim())
        .filter(Boolean);
      for (const line of lines) {
        items.push({ paperId: paper.id, paperTitle: paper.title, text: line });
      }
    }
    return items;
  });

  ipcMain.handle('flashcards:get', (_, paperId) => {
    const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(paperId);
    if (!paper?.flashcards_path) return null;
    const abs = path.join(DATA_DIR, paper.flashcards_path);
    if (!fs.existsSync(abs)) return null;
    return fs.readFileSync(abs, 'utf8');
  });

  ipcMain.handle('notes:get', (_, paperId) => {
    const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(paperId);
    if (!paper?.notes_path) return null;
    const abs = path.join(DATA_DIR, paper.notes_path);
    if (!fs.existsSync(abs)) return null;
    return fs.readFileSync(abs, 'utf8');
  });

  ipcMain.handle('notes:save', (_, { paperId, content }) => {
    const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(paperId);
    let notesPath = paper?.notes_path;
    if (!notesPath) {
      notesPath = `notes/note_${paperId}.md`;
      db.prepare('UPDATE papers SET notes_path = ? WHERE id = ?').run(notesPath, paperId);
    }
    fs.writeFileSync(path.join(DATA_DIR, notesPath), content, 'utf8');
    return { success: true };
  });

  // ── Markmap ──────────────────────────────────────────────────────
  ipcMain.handle('papers:getPdfBuffer', (_, id) => {
    const paper = db.prepare('SELECT file_path FROM papers WHERE id = ?').get(id);
    if (!paper) return null;
    const abs = path.join(DATA_DIR, paper.file_path);
    if (!fs.existsSync(abs)) return null;
    return fs.readFileSync(abs); // Buffer → serialised as Uint8Array on renderer side
  });

  // Read a generated file (flashcards / test) and return its text content
  ipcMain.handle('papers:getGeneratedFile', (_, { paperId, type }) => {
    const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(paperId);
    if (!paper) return null;
    const relPath = type === 'flashcards' ? paper.flashcards_path
                  : type === 'test'       ? paper.test_path
                  : null;
    if (!relPath) return null;
    const abs = path.join(DATA_DIR, relPath);
    if (!fs.existsSync(abs)) return null;
    return fs.readFileSync(abs, 'utf8');
  });

  ipcMain.handle('markmap:transform', (_, markdown) => {
    const { Transformer } = require('markmap-lib');
    const transformer     = new Transformer();
    const { root, features } = transformer.transform(markdown);
    return { root, features };
  });

  ipcMain.handle('markmap:get', (_, paperId) => {
    const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(paperId);
    if (!paper?.mindmap_path) return null;
    const abs = path.join(DATA_DIR, paper.mindmap_path);
    if (!fs.existsSync(abs)) return null;
    return fs.readFileSync(abs, 'utf8');
  });

  // ── AI skills ─────────────────────────────────────────────────────
  const aiService = require('./aiService.js');

  ipcMain.handle('ai:mindmap', async (_, paperId) => {
    const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(paperId);
    if (!paper) throw new Error('Paper not found');

    const { content, truncated } = await aiService.runSkill(db, 'mindmap', paper.raw_text);

    const relPath = `mindmaps/mindmap_${paperId}.md`;
    fs.writeFileSync(path.join(DATA_DIR, relPath), content, 'utf8');
    db.prepare('UPDATE papers SET mindmap_path = ? WHERE id = ?').run(relPath, paperId);

    return { status: 'ok', truncated };
  });

  ipcMain.handle('ai:summary', async (_, paperId) => {
    const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(paperId);
    if (!paper) throw new Error('Paper not found');

    const { content, truncated } = await aiService.runSkill(db, 'summary', paper.raw_text);

    // content is already clean-stringified JSON
    db.prepare('UPDATE papers SET summary = ? WHERE id = ?').run(content, paperId);

    return { status: 'ok', truncated };
  });

  ipcMain.handle('ai:flashcards', async (_, paperId) => {
    const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(paperId);
    if (!paper) throw new Error('Paper not found');

    const { content, truncated } = await aiService.runSkill(db, 'flashcards', paper.raw_text);

    const relPath = `flashcards/flashcards_${paperId}.md`;
    fs.writeFileSync(path.join(DATA_DIR, relPath), content, 'utf8');
    db.prepare('UPDATE papers SET flashcards_path = ? WHERE id = ?').run(relPath, paperId);

    return { status: 'ok', truncated };
  });

  ipcMain.handle('ai:test', async (_, paperId) => {
    const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(paperId);
    if (!paper) throw new Error('Paper not found');

    const { content, truncated } = await aiService.runSkill(db, 'test', paper.raw_text);

    const relPath = `tests/test_${paperId}.md`;
    fs.writeFileSync(path.join(DATA_DIR, relPath), content, 'utf8');
    db.prepare('UPDATE papers SET test_path = ? WHERE id = ?').run(relPath, paperId);

    return { status: 'ok', truncated };
  });

  // ── Custom skills ─────────────────────────────────────────────────
  ipcMain.handle('customSkills:getAll', () =>
    db.prepare('SELECT * FROM custom_skills ORDER BY name').all()
  );

  ipcMain.handle('customSkills:save', (_, skill) => {
    const { randomUUID } = require('crypto');
    const id = skill.id || randomUUID();
    db.prepare(`
      INSERT OR REPLACE INTO custom_skills (id, name, max_tokens, temperature, prompt, enabled)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, skill.name, skill.max_tokens ?? 2048, skill.temperature ?? 0.4, skill.prompt ?? '', skill.enabled ?? 1);
    return { id };
  });

  ipcMain.handle('customSkills:delete', (_, id) => {
    db.prepare('DELETE FROM custom_skills WHERE id = ?').run(id);
    return { ok: true };
  });

  ipcMain.handle('customSkills:run', async (_, { skillId, paperId }) => {
    const { randomUUID } = require('crypto');
    const skill = db.prepare('SELECT * FROM custom_skills WHERE id = ?').get(skillId);
    if (!skill) throw new Error('Custom skill not found');
    const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(paperId);
    if (!paper) throw new Error('Paper not found');

    const { content, truncated } = await aiService.runCustomSkill(db, {
      prompt:      skill.prompt,
      maxTokens:   skill.max_tokens,
      temperature: skill.temperature,
    }, paper.raw_text);

    const dir     = path.join(DATA_DIR, 'custom');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const relPath = `custom/${skillId}_${paperId}.md`;
    fs.writeFileSync(path.join(DATA_DIR, relPath), content, 'utf8');

    const outputId = randomUUID();
    db.prepare(`
      INSERT OR REPLACE INTO custom_skill_outputs (id, paper_id, skill_id, skill_name, file_path, generated_at)
      VALUES (
        COALESCE((SELECT id FROM custom_skill_outputs WHERE paper_id=? AND skill_id=?), ?),
        ?, ?, ?, ?, datetime('now')
      )
    `).run(paperId, skillId, outputId, paperId, skillId, skill.name, relPath);

    return { ok: true, truncated };
  });

  ipcMain.handle('customSkills:getOutputsForPaper', (_, paperId) =>
    db.prepare('SELECT * FROM custom_skill_outputs WHERE paper_id = ? ORDER BY generated_at DESC').all(paperId)
  );

  ipcMain.handle('customSkills:getOutputContent', (_, outputId) => {
    const row = db.prepare('SELECT file_path FROM custom_skill_outputs WHERE id = ?').get(outputId);
    if (!row) return null;
    const abs = path.join(DATA_DIR, row.file_path);
    if (!fs.existsSync(abs)) return null;
    return fs.readFileSync(abs, 'utf8');
  });

  // ── Ollama helpers ────────────────────────────────────────────────
  ipcMain.handle('ollama:testConnection', async () => {
    const http   = require('http');
    const https  = require('https');
    const row    = db.prepare("SELECT value FROM settings WHERE key = 'ai_ollama_url'").get();
    const base   = row ? (row.value || 'http://localhost:11434') : 'http://localhost:11434';
    return new Promise((resolve) => {
      try {
        const url       = new URL('/', base);
        const transport = url.protocol === 'https:' ? https : http;
        const req = transport.request({
          hostname: url.hostname,
          port:     url.port || (url.protocol === 'https:' ? 443 : 80),
          path:     '/',
          method:   'GET',
        }, (res) => {
          resolve({ ok: res.statusCode < 400 });
        });
        req.on('error', (e) => resolve({ ok: false, error: e.message }));
        req.setTimeout(5000, () => { req.destroy(); resolve({ ok: false, error: 'Timeout' }); });
        req.end();
      } catch (e) {
        resolve({ ok: false, error: e.message });
      }
    });
  });

  ipcMain.handle('ollama:listModels', async () => {
    const http   = require('http');
    const https  = require('https');
    const row    = db.prepare("SELECT value FROM settings WHERE key = 'ai_ollama_url'").get();
    const base   = row ? (row.value || 'http://localhost:11434') : 'http://localhost:11434';
    return new Promise((resolve, reject) => {
      try {
        const url       = new URL('/api/tags', base);
        const transport = url.protocol === 'https:' ? https : http;
        const req = transport.request({
          hostname: url.hostname,
          port:     url.port || (url.protocol === 'https:' ? 443 : 80),
          path:     url.pathname,
          method:   'GET',
        }, (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              const names = (parsed.models ?? []).map(m => m.name);
              resolve(names);
            } catch (e) {
              reject(new Error('Failed to parse Ollama model list'));
            }
          });
        });
        req.on('error', (e) => reject(new Error(`Cannot reach Ollama: ${e.message}`)));
        req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
      } catch (e) {
        reject(new Error(e.message));
      }
    });
  });

  // ── Export helpers ────────────────────────────────────────────────
  function safeTitle(paper) {
    return (paper?.title || 'export').replace(/[^a-zA-Z0-9_\-. ]/g, '_').trim().replace(/\s+/g, '_').slice(0, 60);
  }

  function copyExport(srcRel, destPath) {
    if (!srcRel) return false;
    const src = path.join(DATA_DIR, srcRel);
    if (!fs.existsSync(src)) return false;
    fs.copyFileSync(src, destPath);
    return true;
  }

  // ── Export handlers ───────────────────────────────────────────────
  ipcMain.handle('export:note', async (event, { paperId }) => {
    const win   = BrowserWindow.fromWebContents(event.sender);
    const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(paperId);
    if (!paper?.notes_path) return { error: 'No notes for this paper yet — open the reader and write some notes first.' };
    const res = await dialog.showSaveDialog(win, {
      defaultPath: `${safeTitle(paper)}_notes.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (res.canceled) return { canceled: true };
    const ok = copyExport(paper.notes_path, res.filePath);
    return ok ? { success: true } : { error: `Notes file not found at ${path.join(DATA_DIR, paper.notes_path)}. If you added this paper in dev mode (npm run dev) the files live under the "Electron" userData folder, not "PaperFlow".` };
  });

  ipcMain.handle('export:flashcards', async (event, { paperId }) => {
    const win   = BrowserWindow.fromWebContents(event.sender);
    const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(paperId);
    if (!paper?.flashcards_path) return { error: 'No flashcards for this paper yet — generate them first via the AI action bar.' };
    const res = await dialog.showSaveDialog(win, {
      defaultPath: `${safeTitle(paper)}_flashcards.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (res.canceled) return { canceled: true };
    const ok = copyExport(paper.flashcards_path, res.filePath);
    return ok ? { success: true } : { error: `Flashcards file not found at ${path.join(DATA_DIR, paper.flashcards_path)}. If you added this paper in dev mode (npm run dev) the files live under the "Electron" userData folder, not "PaperFlow".` };
  });

  ipcMain.handle('export:anki', async (event, { paperId }) => {
    const win   = BrowserWindow.fromWebContents(event.sender);
    const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(paperId);
    if (!paper?.flashcards_path) return { error: 'No flashcards for this paper' };
    const abs = path.join(DATA_DIR, paper.flashcards_path);
    if (!fs.existsSync(abs)) return { error: 'Flashcard file not found' };

    const content = fs.readFileSync(abs, 'utf8');
    // Parse "## Card N\n**Q:** ...\n**A:** ..." blocks
    const cardBlocks = content.split(/^##\s+Card\s+\d+/m).filter(Boolean);
    const lines = [];
    for (const block of cardBlocks) {
      const qMatch = block.match(/\*\*Q:\*\*\s*(.+)/);
      const aMatch = block.match(/\*\*A:\*\*\s*(.+)/);
      if (qMatch && aMatch) {
        const q = qMatch[1].trim().replace(/\t/g, ' ');
        const a = aMatch[1].trim().replace(/\t/g, ' ');
        lines.push(`${q}\t${a}`);
      }
    }

    const res = await dialog.showSaveDialog(win, {
      defaultPath: `anki_${paper.title?.replace(/[^a-z0-9]/gi, '_') ?? paperId}.txt`,
      filters: [{ name: 'Anki tab-separated', extensions: ['txt'] }],
    });
    if (res.canceled) return { canceled: true };
    fs.writeFileSync(res.filePath, lines.join('\n'), 'utf8');
    return { success: true, cardCount: lines.length };
  });

  ipcMain.handle('export:mindmap', async (event, { paperId }) => {
    const win   = BrowserWindow.fromWebContents(event.sender);
    const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(paperId);
    if (!paper?.mindmap_path) return { error: 'No mind map for this paper' };
    const res = await dialog.showSaveDialog(win, {
      defaultPath: `${safeTitle(paper)}_mindmap.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (res.canceled) return { canceled: true };
    const ok = copyExport(paper.mindmap_path, res.filePath);
    return ok ? { success: true } : { error: `Mind map file not found at ${path.join(DATA_DIR, paper.mindmap_path)}. If you added this paper in dev mode (npm run dev) the files live under the "Electron" userData folder, not "PaperFlow".` };
  });

  ipcMain.handle('export:test', async (event, { paperId }) => {
    const win   = BrowserWindow.fromWebContents(event.sender);
    const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(paperId);
    if (!paper?.test_path) return { error: 'No practice test for this paper' };
    const res = await dialog.showSaveDialog(win, {
      defaultPath: `${safeTitle(paper)}_test.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (res.canceled) return { canceled: true };
    const ok = copyExport(paper.test_path, res.filePath);
    return ok ? { success: true } : { error: `Test file not found at ${path.join(DATA_DIR, paper.test_path)}. If you added this paper in dev mode (npm run dev) the files live under the "Electron" userData folder, not "PaperFlow".` };
  });

  ipcMain.handle('export:summary', async (event, { paperId }) => {
    const win   = BrowserWindow.fromWebContents(event.sender);
    const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(paperId);
    if (!paper?.summary) return { error: 'No summary for this paper' };

    let s = {};
    try { s = JSON.parse(paper.summary); } catch { /* */ }

    const authors = Array.isArray(s.authors) ? s.authors.join(', ') : (s.authors || '');
    const keywords = Array.isArray(s.keywords) ? s.keywords.map(k => `\`${k}\``).join(', ') : '';

    const md = [
      `# ${s.title || paper.title}`,
      '',
      `**Authors:** ${authors || '—'}`,
      `**Year:** ${s.year || '—'}`,
      `**Journal:** ${s.journal || '—'}`,
      '',
      '## Objective',
      s.objective || '—',
      '',
      '## Methods',
      s.methods || '—',
      '',
      '## Results',
      s.results || '—',
      '',
      '## Conclusions',
      s.conclusions || '—',
      '',
      '## Keywords',
      keywords || '—',
    ].join('\n');

    const res = await dialog.showSaveDialog(win, {
      defaultPath: `${safeTitle(paper)}_summary.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (res.canceled) return { canceled: true };
    fs.writeFileSync(res.filePath, md, 'utf8');
    return { success: true };
  });

  // ── Dialog utilities ──────────────────────────────────────────────
  ipcMain.handle('dialog:openFile', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const res = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });
    if (res.canceled || res.filePaths.length === 0) return null;
    return res.filePaths[0];
  });

  ipcMain.handle('dialog:openDirectory', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const res = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory'],
    });
    if (res.canceled || res.filePaths.length === 0) return null;
    return res.filePaths[0];
  });

  // ── Templates ─────────────────────────────────────────────────────
  ipcMain.handle('templates:getAll', () => {
    const dir = path.join(DATA_DIR, 'templates');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    const customs = files.map(f => {
      const name = f.replace(/\.md$/, '');
      const content = fs.readFileSync(path.join(dir, f), 'utf8');
      return { id: name, name, content, isCustom: true };
    });
    return customs;
  });

  ipcMain.handle('templates:save', (_, { name, content }) => {
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(DATA_DIR, 'templates', `${safeName}.md`);
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true, id: safeName };
  });

  ipcMain.handle('templates:delete', (_, name) => {
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(DATA_DIR, 'templates', `${safeName}.md`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { success: true };
  });

  // ── Ollama management ─────────────────────────────────────────────

  function getOllamaBase() {
    const http  = require('http');
    const https = require('https');
    const row   = db.prepare("SELECT value FROM settings WHERE key = 'ai_ollama_url'").get();
    let base    = 'http://localhost:11434';
    if (row?.value) {
      try { base = JSON.parse(row.value); } catch { base = row.value; }
    }
    return { base: base.replace(/\/$/, ''), http, https };
  }

  function ollamaGet(urlPath) {
    const { base, http, https } = getOllamaBase();
    return new Promise((resolve, reject) => {
      try {
        const url       = new URL(urlPath, base);
        const transport = url.protocol === 'https:' ? https : http;
        const req = transport.request({
          hostname: url.hostname,
          port:     url.port || (url.protocol === 'https:' ? 443 : 80),
          path:     url.pathname,
          method:   'GET',
        }, (res) => {
          let data = '';
          res.on('data', c => { data += c; });
          res.on('end', () => {
            if (res.statusCode >= 400) return reject(new Error(`Ollama ${res.statusCode}`));
            try { resolve(JSON.parse(data)); } catch { resolve(data); }
          });
        });
        req.on('error', e => reject(new Error(e.message)));
        req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
      } catch (e) {
        reject(new Error(e.message));
      }
    });
  }

  function ollamaPost(urlPath, body) {
    const { base, http, https } = getOllamaBase();
    return new Promise((resolve, reject) => {
      try {
        const url       = new URL(urlPath, base);
        const transport = url.protocol === 'https:' ? https : http;
        const payload   = JSON.stringify(body);
        const req = transport.request({
          hostname: url.hostname,
          port:     url.port || (url.protocol === 'https:' ? 443 : 80),
          path:     url.pathname,
          method:   'POST',
          headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
        }, (res) => {
          let data = '';
          res.on('data', c => { data += c; });
          res.on('end', () => {
            if (res.statusCode >= 400) return reject(new Error(`Ollama ${res.statusCode}: ${data}`));
            try { resolve(JSON.parse(data)); } catch { resolve(data); }
          });
        });
        req.on('error', e => reject(new Error(e.message)));
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.write(payload);
        req.end();
      } catch (e) {
        reject(new Error(e.message));
      }
    });
  }

  function ollamaDelete(urlPath, body) {
    const { base, http, https } = getOllamaBase();
    return new Promise((resolve, reject) => {
      try {
        const url       = new URL(urlPath, base);
        const transport = url.protocol === 'https:' ? https : http;
        const payload   = JSON.stringify(body);
        const req = transport.request({
          hostname: url.hostname,
          port:     url.port || (url.protocol === 'https:' ? 443 : 80),
          path:     url.pathname,
          method:   'DELETE',
          headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
        }, (res) => {
          let data = '';
          res.on('data', c => { data += c; });
          res.on('end', () => {
            if (res.statusCode >= 400) return reject(new Error(`Ollama ${res.statusCode}: ${data}`));
            resolve({ ok: true });
          });
        });
        req.on('error', e => reject(new Error(e.message)));
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.write(payload);
        req.end();
      } catch (e) {
        reject(new Error(e.message));
      }
    });
  }

  ipcMain.handle('ollama:status', async () => {
    try {
      const data = await ollamaGet('/api/version');
      return { running: true, version: data.version ?? 'unknown' };
    } catch {
      return { running: false };
    }
  });

  ipcMain.handle('ollama:startServer', async () => {
    if (ollamaProcess && !ollamaProcess.killed) return { ok: true, alreadyRunning: true };
    const { spawn } = require('child_process');
    try {
      ollamaProcess = spawn('ollama', ['serve'], {
        detached: false,
        stdio:    'ignore',
        shell:    process.platform === 'win32',
      });
      ollamaProcess.on('exit', () => { ollamaProcess = null; });
      // poll up to 3× to confirm ready
      for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 700));
        try { await ollamaGet('/api/version'); return { ok: true }; } catch { /* not yet */ }
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('ollama:stopServer', async () => {
    if (ollamaProcess && !ollamaProcess.killed) {
      ollamaProcess.kill();
      ollamaProcess = null;
    }
    return { ok: true };
  });

  ipcMain.handle('ollama:listModelsFull', async () => {
    const data = await ollamaGet('/api/tags');
    return data.models ?? [];
  });

  ipcMain.handle('ollama:listRunning', async () => {
    const data = await ollamaGet('/api/ps');
    return data.models ?? [];
  });

  ipcMain.handle('ollama:showModel', async (_, name) => {
    return ollamaPost('/api/show', { model: name });
  });

  ipcMain.handle('ollama:deleteModel', async (_, name) => {
    return ollamaDelete('/api/delete', { model: name });
  });

  ipcMain.handle('ollama:pullModel', async (event, name) => {
    const { base, http, https } = getOllamaBase();
    return new Promise((resolve, reject) => {
      try {
        const url       = new URL('/api/pull', base);
        const transport = url.protocol === 'https:' ? https : http;
        const payload   = JSON.stringify({ model: name, stream: true });
        const req = transport.request({
          hostname: url.hostname,
          port:     url.port || (url.protocol === 'https:' ? 443 : 80),
          path:     url.pathname,
          method:   'POST',
          headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
        }, (res) => {
          let buf = '';
          res.on('data', chunk => {
            buf += chunk;
            const lines = buf.split('\n');
            buf = lines.pop();
            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const parsed = JSON.parse(line);
                if (!event.sender.isDestroyed()) event.sender.send('ollama:pullProgress', parsed);
                if (parsed.status === 'success') resolve({ ok: true });
              } catch { /* malformed line */ }
            }
          });
          res.on('end', () => resolve({ ok: true }));
          res.on('error', e => reject(new Error(e.message)));
        });
        req.on('error', e => reject(new Error(e.message)));
        req.write(payload);
        req.end();
      } catch (e) {
        reject(new Error(e.message));
      }
    });
  });
}
