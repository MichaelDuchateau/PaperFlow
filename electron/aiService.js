'use strict';

// ── Model ───────────────────────────────────────────────────────────
const CLAUDE_MODEL = 'claude-sonnet-4-6';

// ── Token budget ────────────────────────────────────────────────────
// ~4 chars per token; 300k chars ≈ 75k tokens — leaves room for prompt + response
const MAX_TEXT_CHARS = 300_000;

// ── Default prompts (mirrors src/lib/defaultPrompts.js) ─────────────
const DEFAULT_PROMPTS = {
  mindmap: `You are an expert at creating visual knowledge maps from academic papers.
Given the text of an academic paper, produce a hierarchical Markdown bullet list
suitable for Markmap.js. Start with a single root node (the paper title or topic).
Use 2–3 levels of depth. Each node should be a short, meaningful phrase (3–8 words).
Focus on key concepts, methodology, findings, and implications.
Output ONLY the Markdown bullet list — no prose, no code fences.`,

  summary: `You are an expert academic summariser.
Given the text of an academic paper, return a JSON object with exactly these keys:
{
  "title": "<paper title>",
  "authors": ["<author1>", "<author2>"],
  "year": "<4-digit year or null>",
  "journal": "<journal or venue or null>",
  "objective": "<1–2 sentence research objective>",
  "methods": "<2–3 sentences describing methodology>",
  "results": "<2–3 sentences summarising key results>",
  "conclusions": "<1–2 sentences on conclusions and implications>",
  "keywords": ["<keyword1>", "<keyword2>", "<keyword3>"]
}
Output ONLY valid JSON — no markdown, no prose.`,

  flashcards: `You are an expert at creating spaced-repetition flashcards from academic papers.
Given the text of an academic paper, produce 10–15 high-quality flashcards.
Format each card as:

## Card N
**Q:** <concise question>
**A:** <concise answer>

Questions should test understanding, not mere recall. Cover definitions, mechanisms,
results, comparisons, and implications. Output ONLY the flashcard Markdown.`,

  test: `You are an expert at creating practice tests from academic papers.
Given the text of an academic paper, produce a practice test with:
- 5 multiple-choice questions (4 options each, one correct)
- 3 short-answer questions
- 1 essay question

Format as Markdown:

## Multiple Choice

### Q1. <question>
A) ...
B) ...
C) ...
D) ...

## Short Answer

### Q6. <question>

## Essay

### Q9. <question>

## Answer Key

**Q1:** <letter> — <brief explanation>
...

Output ONLY the Markdown test — no prose outside the format.`,
};

const DEFAULT_SKILL_SETTINGS = {
  mindmap:    { maxTokens: 2048,  temperature: 0.3 },
  summary:    { maxTokens: 1024,  temperature: 0.2 },
  flashcards: { maxTokens: 4096,  temperature: 0.4 },
  test:       { maxTokens: 4096,  temperature: 0.4 },
};

// ── Helpers ─────────────────────────────────────────────────────────

function getSetting(db, key, fallback) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return row.value; }
}

function getProvider(db) {
  return getSetting(db, 'ai_provider', 'claude');
}

function getApiKey(db) {
  const { safeStorage } = require('electron');
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage not available on this platform');
  }
  const row = db.prepare("SELECT value FROM settings WHERE key = 'api_key_encrypted'").get();
  if (!row) {
    throw new Error('No API key configured. Add your Anthropic API key in Settings → AI Skills.');
  }
  const encrypted = JSON.parse(row.value);
  if (!encrypted) {
    throw new Error('No API key configured. Add your Anthropic API key in Settings → AI Skills.');
  }
  return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
}

function getSkillConfig(db, skillKey) {
  const def = DEFAULT_SKILL_SETTINGS[skillKey];
  return {
    enabled:     getSetting(db, `ai_skill_${skillKey}_enabled`,     true),
    maxTokens:   getSetting(db, `ai_skill_${skillKey}_max_tokens`,  def.maxTokens),
    temperature: getSetting(db, `ai_skill_${skillKey}_temperature`, def.temperature),
    prompt:      getSetting(db, `ai_prompt_${skillKey}`,            DEFAULT_PROMPTS[skillKey]),
  };
}

// Strip wrapping code fences that some models insert despite instructions
function stripCodeFence(text) {
  return text
    .replace(/^```(?:json|markdown|md)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

// Robustly extract JSON from a response that may contain prose or code fences
function extractJson(text) {
  const stripped = stripCodeFence(text);
  try { return JSON.parse(stripped); } catch { /* */ }
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch { /* */ }
  }
  throw new Error('Could not parse JSON from model response');
}

// ── Ollama caller ────────────────────────────────────────────────────

function callOllama(ollamaUrl, model, systemPrompt, userText, config) {
  return new Promise((resolve, reject) => {
    const http   = require('http');
    const https  = require('https');
    const url    = new URL('/api/chat', ollamaUrl);
    const body   = JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userText },
      ],
      options: {
        temperature: config.temperature,
        num_predict: config.maxTokens,
      },
    });

    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request({
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(`Ollama error: ${parsed.error}`));
          const content = parsed.message?.content ?? '';
          resolve(content);
        } catch (e) {
          reject(new Error(`Failed to parse Ollama response: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`Cannot reach Ollama at ${ollamaUrl}: ${e.message}`)));
    req.setTimeout(120_000, () => { req.destroy(); reject(new Error('Ollama request timed out (120s)')); });
    req.write(body);
    req.end();
  });
}

// ── Main entry point ────────────────────────────────────────────────

/**
 * Run an AI skill against a paper's raw text.
 * @param {object} db       - better-sqlite3 DB instance
 * @param {string} skillKey - 'mindmap' | 'summary' | 'flashcards' | 'test'
 * @param {string} rawText  - extracted paper text
 * @returns {{ content: string, truncated: boolean }}
 *   For 'summary', content is already a stringified JSON object.
 */
async function runSkill(db, skillKey, rawText) {
  if (!rawText || rawText.trim().length === 0) {
    throw new Error(
      'No text extracted from this paper. ' +
      'The PDF may be image-based or scanned without OCR. ' +
      'Try re-adding the paper or using a searchable PDF.'
    );
  }

  const config = getSkillConfig(db, skillKey);
  if (!config.enabled) {
    throw new Error(`The "${skillKey}" skill is disabled. Enable it in Settings → AI Skills.`);
  }

  // Truncate oversized papers
  let text = rawText;
  let truncated = false;
  if (text.length > MAX_TEXT_CHARS) {
    text = text.slice(0, MAX_TEXT_CHARS);
    truncated = true;
  }

  const provider = getProvider(db);
  let raw;

  if (provider === 'ollama') {
    const ollamaUrl = getSetting(db, 'ai_ollama_url',   'http://localhost:11434');
    const model     = getSetting(db, 'ai_ollama_model', 'llama3.2');
    raw = await callOllama(
      ollamaUrl,
      model,
      config.prompt,
      `Here is the academic paper text:\n\n${text}`,
      config
    );
  } else {
    // Claude path
    const apiKey = getApiKey(db);
    const AnthropicModule = require('@anthropic-ai/sdk');
    const Anthropic = AnthropicModule.default ?? AnthropicModule;
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model:       CLAUDE_MODEL,
      max_tokens:  config.maxTokens,
      temperature: config.temperature,
      system:      config.prompt,
      messages: [
        { role: 'user', content: `Here is the academic paper text:\n\n${text}` },
      ],
    });
    raw = response.content[0]?.text ?? '';
  }

  // For the summary skill, validate + re-serialise the JSON so it is clean
  if (skillKey === 'summary') {
    const parsed = extractJson(raw);
    return { content: JSON.stringify(parsed), truncated };
  }

  // For all other skills, strip accidental code fences and return the text
  return { content: stripCodeFence(raw), truncated };
}

module.exports = { runSkill };
