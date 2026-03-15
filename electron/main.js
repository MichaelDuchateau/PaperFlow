'use strict';

const { app, BrowserWindow, ipcMain, dialog, safeStorage } = require('electron');
const path = require('path');
const fs   = require('fs');

// ── Globals ────────────────────────────────────────────────────────
let db;
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

  // ── Pomodoro ─────────────────────────────────────────────────────
  ipcMain.handle('pomodoro:log', (_, session) => {
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    db.prepare(`
      INSERT INTO pomodoro_sessions (id, paper_id, duration_minutes, started_at, ended_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, session.paperId || null, session.durationMinutes, session.startedAt, session.endedAt);
    return { success: true };
  });

  ipcMain.handle('pomodoro:stats', () => {
    const today    = new Date().toISOString().split('T')[0];
    const todayRow = db.prepare("SELECT COUNT(*) AS count FROM pomodoro_sessions WHERE started_at LIKE ?").get(`${today}%`);
    const totalRow = db.prepare('SELECT COUNT(*) AS count FROM pomodoro_sessions').get();
    return { today: todayRow.count, total: totalRow.count };
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

  // ── AI stubs — Phase 8 fills these in ────────────────────────────
  ipcMain.handle('ai:mindmap',    async (_, paperId) => ({ status: 'stub', paperId }));
  ipcMain.handle('ai:summary',    async (_, paperId) => ({ status: 'stub', paperId }));
  ipcMain.handle('ai:flashcards', async (_, paperId) => ({ status: 'stub', paperId }));
  ipcMain.handle('ai:test',       async (_, paperId) => ({ status: 'stub', paperId }));

  // ── Export — Phase 7 fills these in ──────────────────────────────
  ipcMain.handle('export:note', async (_, { paperId }) => {
    const res = await dialog.showSaveDialog({
      defaultPath: `note_${paperId}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (res.canceled) return { canceled: true };
    const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(paperId);
    if (paper?.notes_path) {
      const src = path.join(DATA_DIR, paper.notes_path);
      if (fs.existsSync(src)) fs.copyFileSync(src, res.filePath);
    }
    return { success: true, filePath: res.filePath };
  });

  ipcMain.handle('export:flashcards', async (_, { paperId }) => {
    const res = await dialog.showSaveDialog({
      defaultPath: `flashcards_${paperId}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (res.canceled) return { canceled: true };
    const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(paperId);
    if (paper?.flashcards_path) {
      const src = path.join(DATA_DIR, paper.flashcards_path);
      if (fs.existsSync(src)) fs.copyFileSync(src, res.filePath);
    }
    return { success: true };
  });

  ipcMain.handle('export:anki', async (_, { paperId }) => {
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

    const res = await dialog.showSaveDialog({
      defaultPath: `anki_${paper.title?.replace(/[^a-z0-9]/gi, '_') ?? paperId}.txt`,
      filters: [{ name: 'Anki tab-separated', extensions: ['txt'] }],
    });
    if (res.canceled) return { canceled: true };
    fs.writeFileSync(res.filePath, lines.join('\n'), 'utf8');
    return { success: true, cardCount: lines.length };
  });

  ipcMain.handle('export:mindmap', async (_, { paperId }) => {
    const res = await dialog.showSaveDialog({
      defaultPath: `mindmap_${paperId}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (res.canceled) return { canceled: true };
    const paper = db.prepare('SELECT * FROM papers WHERE id = ?').get(paperId);
    if (paper?.mindmap_path) {
      const src = path.join(DATA_DIR, paper.mindmap_path);
      if (fs.existsSync(src)) fs.copyFileSync(src, res.filePath);
    }
    return { success: true };
  });

  // ── Dialog utilities ──────────────────────────────────────────────
  ipcMain.handle('dialog:openFile', async () => {
    const res = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });
    if (res.canceled || res.filePaths.length === 0) return null;
    return res.filePaths[0];
  });

  ipcMain.handle('dialog:openDirectory', async () => {
    const res = await dialog.showOpenDialog({
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
}
