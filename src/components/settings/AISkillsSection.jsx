import React, { useState, useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, drawSelection } from '@codemirror/view';
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands';
import { oneDark } from '@codemirror/theme-one-dark';
import { DEFAULT_PROMPTS, DEFAULT_SKILL_SETTINGS, SKILL_LABELS } from '../../lib/defaultPrompts.js';

// ── Inline prompt editor ───────────────────────────────────────────
function PromptEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const viewRef   = useRef(null);

  useEffect(() => {
    if (!editorRef.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        oneDark,
        drawSelection(),
        EditorView.lineWrapping,
        EditorView.updateListener.of(update => {
          if (update.docChanged) onChange(update.state.doc.toString());
        }),
      ],
    });
    viewRef.current = new EditorView({ state, parent: editorRef.current });
    return () => { viewRef.current?.destroy(); viewRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  return <div ref={editorRef} className="h-40 overflow-auto text-xs [&_.cm-editor]:h-full [&_.cm-scroller]:h-full" />;
}

// ── Per-skill panel ────────────────────────────────────────────────
function SkillPanel({ skillKey, skillSettings, skillPrompt, onSkillSave }) {
  const [enabled,     setEnabled]     = useState(skillSettings?.enabled    ?? true);
  const [maxTokens,   setMaxTokens]   = useState(skillSettings?.maxTokens  ?? DEFAULT_SKILL_SETTINGS[skillKey].maxTokens);
  const [temperature, setTemperature] = useState(skillSettings?.temperature ?? DEFAULT_SKILL_SETTINGS[skillKey].temperature);
  const [prompt,      setPrompt]      = useState(skillPrompt ?? DEFAULT_PROMPTS[skillKey]);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSkillSave(skillKey, { enabled, maxTokens, temperature, prompt });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setPrompt(DEFAULT_PROMPTS[skillKey]);
  };

  return (
    <div className="rounded-lg bg-gray-800/40 border border-gray-700/50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-100">{SKILL_LABELS[skillKey]}</p>
        <button
          onClick={() => setEnabled(v => !v)}
          className={`inline-flex items-center w-10 h-5 rounded-full p-0.5 transition-colors ${enabled ? 'bg-brand-600' : 'bg-gray-700'}`}
        >
          <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      <div className={`space-y-3 ${!enabled ? 'opacity-40 pointer-events-none' : ''}`}>
        {/* Max tokens + temperature */}
        <div className="flex gap-4">
          <label className="flex-1">
            <span className="text-xs text-gray-400 block mb-1">Max tokens</span>
            <input
              type="number"
              value={maxTokens}
              onChange={e => setMaxTokens(Number(e.target.value))}
              min={256}
              max={8192}
              step={256}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
            />
          </label>
          <label className="w-28">
            <span className="text-xs text-gray-400 block mb-1">Temperature</span>
            <input
              type="number"
              value={temperature}
              onChange={e => setTemperature(Number(e.target.value))}
              min={0}
              max={1}
              step={0.05}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
            />
          </label>
        </div>

        {/* System prompt */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">System prompt</span>
            <button onClick={handleReset} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Reset to default</button>
          </div>
          <div className="rounded-lg overflow-hidden border border-gray-700">
            <PromptEditor value={prompt} onChange={setPrompt} />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-3 py-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
      >
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
      </button>
    </div>
  );
}

// ── Ollama config panel ────────────────────────────────────────────
function OllamaPanel({ settings }) {
  const [url,     setUrl]     = useState(settings.ai_ollama_url   ?? 'http://localhost:11434');
  const [model,   setModel]   = useState(settings.ai_ollama_model ?? 'llama3.2');
  const [models,  setModels]  = useState([]);
  const [status,  setStatus]  = useState(null); // null | 'ok' | 'error'
  const [errMsg,  setErrMsg]  = useState('');
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  const testConnection = async () => {
    setTesting(true);
    setStatus(null);
    try {
      const result = await window.api.ollama.testConnection();
      setStatus(result.ok ? 'ok' : 'error');
      setErrMsg(result.error ?? '');
    } catch (e) {
      setStatus('error');
      setErrMsg(e.message);
    }
    setTesting(false);
  };

  const refreshModels = async () => {
    setLoading(true);
    try {
      const list = await window.api.ollama.listModels();
      setModels(list);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await window.api.settings.set('ai_ollama_url',   url.trim());
    await window.api.settings.set('ai_ollama_model', model.trim());
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Test connection on mount
  useEffect(() => { testConnection(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4 rounded-lg bg-gray-800/40 border border-gray-700/50 p-4">
      <p className="text-sm font-medium text-gray-200">Ollama configuration</p>

      {/* Base URL */}
      <label className="block">
        <span className="text-xs text-gray-400 block mb-1">Ollama base URL</span>
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
          placeholder="http://localhost:11434"
        />
      </label>

      {/* Connection status */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${
          status === 'ok'    ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40' :
          status === 'error' ? 'bg-red-900/40 text-red-400 border border-red-700/40' :
                               'bg-gray-800 text-gray-500 border border-gray-700'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            status === 'ok' ? 'bg-emerald-400' : status === 'error' ? 'bg-red-400' : 'bg-gray-600'
          }`} />
          {status === 'ok' ? 'Connected' : status === 'error' ? `Unreachable${errMsg ? ': ' + errMsg : ''}` : 'Unknown'}
        </span>
        <button
          onClick={testConnection}
          disabled={testing}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
        >
          {testing ? 'Testing…' : 'Test'}
        </button>
      </div>

      {/* Model */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">Model</span>
          <button onClick={refreshModels} disabled={loading}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50">
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        {models.length > 0 ? (
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
          >
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        ) : (
          <input
            type="text"
            value={model}
            onChange={e => setModel(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
            placeholder="e.g. llama3.2"
          />
        )}
        <p className="text-xs text-gray-600 mt-1">Model must be pulled in Ollama before use.</p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
      </button>
    </div>
  );
}

// ── Custom skill editor ────────────────────────────────────────────
function CustomSkillForm({ skill, onSave, onCancel }) {
  const [name,        setName]        = useState(skill?.name        ?? '');
  const [maxTokens,   setMaxTokens]   = useState(skill?.max_tokens  ?? 2048);
  const [temperature, setTemperature] = useState(skill?.temperature ?? 0.4);
  const [prompt,      setPrompt]      = useState(skill?.prompt      ?? '');
  const [saving,      setSaving]      = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !prompt.trim()) return;
    setSaving(true);
    await onSave({ id: skill?.id, name: name.trim(), max_tokens: maxTokens, temperature, prompt, enabled: 1 });
    setSaving(false);
  };

  return (
    <div className="rounded-lg bg-gray-800/40 border border-gray-700/50 p-4 space-y-3">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Skill name (e.g. Key Equations)"
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500"
      />
      <div className="flex gap-4">
        <label className="flex-1">
          <span className="text-xs text-gray-400 block mb-1">Max tokens</span>
          <input type="number" value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))}
            min={256} max={8192} step={256}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-100 focus:outline-none focus:border-brand-500" />
        </label>
        <label className="w-28">
          <span className="text-xs text-gray-400 block mb-1">Temperature</span>
          <input type="number" value={temperature} onChange={e => setTemperature(Number(e.target.value))}
            min={0} max={1} step={0.05}
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-100 focus:outline-none focus:border-brand-500" />
        </label>
      </div>
      <div>
        <span className="text-xs text-gray-400 block mb-1">System prompt</span>
        <div className="rounded-lg overflow-hidden border border-gray-700">
          <PromptEditor value={prompt} onChange={setPrompt} />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving || !name.trim() || !prompt.trim()}
          className="px-3 py-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors">
          {saving ? 'Saving…' : 'Save skill'}
        </button>
        <button onClick={onCancel}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

function CustomSkillsPanel() {
  const [skills,   setSkills]   = useState([]);
  const [editing,  setEditing]  = useState(null); // null | 'new' | skill.id
  const [editSkill, setEditSkill] = useState(null);

  const load = () => window.api.customSkills.getAll().then(setSkills);
  useEffect(() => { load(); }, []);

  const handleSave = async (data) => {
    await window.api.customSkills.save(data);
    await load();
    setEditing(null);
    setEditSkill(null);
  };

  const handleDelete = async (id) => {
    await window.api.customSkills.delete(id);
    await load();
  };

  const handleEdit = (skill) => {
    setEditSkill(skill);
    setEditing(skill.id);
  };

  return (
    <div className="space-y-3">
      {skills.map(skill => (
        editing === skill.id ? (
          <CustomSkillForm key={skill.id} skill={skill} onSave={handleSave} onCancel={() => setEditing(null)} />
        ) : (
          <div key={skill.id} className="flex items-center justify-between rounded-lg bg-gray-800/40 border border-gray-700/50 px-4 py-2.5">
            <span className="text-sm text-gray-200">{skill.name}</span>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(skill)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Edit</button>
              <button onClick={() => handleDelete(skill.id)}
                className="text-xs text-red-600 hover:text-red-400 transition-colors">Delete</button>
            </div>
          </div>
        )
      ))}
      {editing === 'new' ? (
        <CustomSkillForm onSave={handleSave} onCancel={() => setEditing(null)} />
      ) : (
        <button onClick={() => { setEditing('new'); setEditSkill(null); }}
          className="w-full py-2 border border-dashed border-gray-700 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-colors">
          + Add custom skill
        </button>
      )}
    </div>
  );
}

// ── Main section ───────────────────────────────────────────────────
export default function AISkillsSection({ settings }) {
  const [provider,    setProvider]    = useState(settings.ai_provider ?? 'claude');
  const [apiKey,      setApiKey]      = useState('');
  const [apiKeyMask,  setApiKeyMask]  = useState(true);
  const [apiSaving,   setApiSaving]   = useState(false);
  const [apiSaved,    setApiSaved]    = useState(false);
  const [hasKey,      setHasKey]      = useState(false);

  useEffect(() => {
    window.api.settings.getApiKey().then(k => { setHasKey(!!k); });
  }, []);

  const handleProviderChange = async (p) => {
    setProvider(p);
    await window.api.settings.set('ai_provider', p);
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    setApiSaving(true);
    await window.api.settings.setApiKey(apiKey.trim());
    setApiSaving(false);
    setApiSaved(true);
    setHasKey(true);
    setApiKey('');
    setTimeout(() => setApiSaved(false), 2500);
  };

  const handleSkillSave = async (skillKey, data) => {
    await window.api.settings.set(`ai_skill_${skillKey}_enabled`,    data.enabled);
    await window.api.settings.set(`ai_skill_${skillKey}_max_tokens`, data.maxTokens);
    await window.api.settings.set(`ai_skill_${skillKey}_temperature`,data.temperature);
    await window.api.settings.set(`ai_prompt_${skillKey}`,           data.prompt);
  };

  const getSkillSettings = (key) => ({
    enabled:     settings[`ai_skill_${key}_enabled`]     ?? true,
    maxTokens:   settings[`ai_skill_${key}_max_tokens`]  ?? DEFAULT_SKILL_SETTINGS[key].maxTokens,
    temperature: settings[`ai_skill_${key}_temperature`] ?? DEFAULT_SKILL_SETTINGS[key].temperature,
  });

  const getSkillPrompt = (key) => settings[`ai_prompt_${key}`] ?? DEFAULT_PROMPTS[key];

  return (
    <div className="space-y-6">
      {/* Provider selector */}
      <div>
        <p className="text-sm font-medium text-gray-200 mb-2">AI Provider</p>
        <div className="flex gap-2">
          {[['claude', 'Claude (Anthropic API)'], ['ollama', 'Ollama (local)']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => handleProviderChange(val)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm border transition-colors ${
                provider === val
                  ? 'bg-brand-600/20 border-brand-500 text-brand-300'
                  : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Claude API key (shown when Claude selected) */}
      {provider === 'claude' && (
        <div>
          <p className="text-sm font-medium text-gray-200 mb-1">Anthropic API key</p>
          <p className="text-xs text-gray-500 mb-3">
            Stored encrypted using your OS keychain via <code className="text-gray-400">safeStorage</code>.
            {hasKey && <span className="ml-2 text-emerald-500">✓ Key is stored</span>}
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={apiKeyMask ? 'password' : 'text'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveApiKey(); }}
                placeholder={hasKey ? '●●●●●●●●  (enter new key to replace)' : 'sk-ant-…'}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors pr-10"
              />
              <button
                onClick={() => setApiKeyMask(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                tabIndex={-1}
              >
                {apiKeyMask ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>
            <button
              onClick={handleSaveApiKey}
              disabled={apiSaving || !apiKey.trim()}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-sm rounded-lg transition-colors flex-shrink-0"
            >
              {apiSaving ? 'Saving…' : apiSaved ? '✓ Saved' : 'Save key'}
            </button>
          </div>
        </div>
      )}

      {/* Ollama config (shown when Ollama selected) */}
      {provider === 'ollama' && <OllamaPanel settings={settings} />}

      {/* Per-skill panels */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Skill configuration</p>
        {['mindmap', 'summary', 'flashcards', 'test'].map(key => (
          <SkillPanel
            key={key}
            skillKey={key}
            skillSettings={getSkillSettings(key)}
            skillPrompt={getSkillPrompt(key)}
            onSkillSave={handleSkillSave}
          />
        ))}
      </div>

      {/* Custom skills */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Custom skills</p>
        <p className="text-xs text-gray-600">Custom skills run your own prompt against the paper and save the result as a Markdown file, visible as a tab in the reader.</p>
        <CustomSkillsPanel />
      </div>
    </div>
  );
}
