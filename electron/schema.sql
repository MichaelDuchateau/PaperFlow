-- PaperFlow SQLite Schema
-- WAL mode is enabled in main.js before this runs

CREATE TABLE IF NOT EXISTS papers (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  raw_text        TEXT DEFAULT '',
  tags            TEXT DEFAULT '[]',
  status          TEXT DEFAULT 'unread' CHECK(status IN ('unread', 'reading', 'done')),
  notes_path      TEXT,
  flashcards_path TEXT,
  mindmap_path    TEXT,
  test_path       TEXT,
  summary         TEXT,
  added_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366f1'
);

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id               TEXT PRIMARY KEY,
  paper_id         TEXT,
  duration_minutes INTEGER NOT NULL,
  started_at       TEXT NOT NULL,
  ended_at         TEXT NOT NULL,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_skills (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  max_tokens  INTEGER DEFAULT 2048,
  temperature REAL    DEFAULT 0.4,
  prompt      TEXT    NOT NULL DEFAULT '',
  enabled     INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS custom_skill_outputs (
  id           TEXT PRIMARY KEY,
  paper_id     TEXT NOT NULL,
  skill_id     TEXT NOT NULL,
  skill_name   TEXT NOT NULL,
  file_path    TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  FOREIGN KEY (paper_id) REFERENCES papers(id)     ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES custom_skills(id) ON DELETE CASCADE
);

-- Default settings (only inserted if key doesn't exist)
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('reviewer_name',        '""'),
  ('pomodoro_work_minutes',  '25'),
  ('pomodoro_break_minutes', '5'),
  ('pomodoro_enabled',       'true'),
  ('daily_pomodoro_goal',    '4'),
  ('weekly_paper_goal',      '3'),
  ('split_direction',        '"horizontal"'),
  ('default_template',       '"free-form"'),
  ('api_key_encrypted',      'null'),
  ('ai_provider',            '"claude"'),
  ('ai_ollama_url',          '"http://localhost:11434"'),
  ('ai_ollama_model',        '"llama3.2"');
