import React, { useState, useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, historyKeymap, history, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { TEMPLATE_OPTIONS } from '../../lib/noteTemplates.js';

// ── Mini CodeMirror editor ─────────────────────────────────────────
function MiniEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const viewRef   = useRef(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        markdown(),
        oneDark,
        lineNumbers(),
        drawSelection(),
        highlightActiveLine(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
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

  // Sync external value changes (e.g. when switching templates)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={editorRef} className="h-72 overflow-auto text-xs [&_.cm-editor]:h-full [&_.cm-scroller]:h-full" />;
}

export default function TemplatesSection({ settings, onSave }) {
  const [defaultTemplate, setDefaultTemplate] = useState(settings.default_template ?? 'free-form');
  const [customTemplates, setCustomTemplates]  = useState([]);
  const [selected,        setSelected]         = useState(null); // null = built-in, or custom id
  const [editorContent,   setEditorContent]    = useState('');
  const [newName,         setNewName]          = useState('');
  const [saving,          setSaving]           = useState(false);
  const [saved,           setSaved]            = useState(false);

  useEffect(() => {
    window.api.templates.getAll().then(setCustomTemplates);
  }, []);

  const handleSelectCustom = (tpl) => {
    setSelected(tpl.id);
    setEditorContent(tpl.content);
    setNewName(tpl.name);
  };

  const handleNewTemplate = () => {
    setSelected('__new__');
    setNewName('');
    setEditorContent('## Section\n\n\n## ToThink\n\n\n## Tasks\n\n');
  };

  const handleSaveCustom = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const result = await window.api.templates.save(newName.trim(), editorContent);
    const updated = await window.api.templates.getAll();
    setCustomTemplates(updated);
    setSelected(result.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDeleteCustom = async (id) => {
    if (!window.confirm('Delete this custom template?')) return;
    await window.api.templates.delete(id);
    const updated = await window.api.templates.getAll();
    setCustomTemplates(updated);
    setSelected(null);
    setEditorContent('');
  };

  const handleSaveDefault = async () => {
    setSaving(true);
    await onSave({ default_template: defaultTemplate });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Default template selector */}
      <div>
        <p className="text-sm font-medium text-gray-200 mb-2">Default template for new notes</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setDefaultTemplate(opt.value)}
              className={`px-3 py-1 rounded-lg text-xs border transition-colors ${
                defaultTemplate === opt.value
                  ? 'bg-brand-600 border-brand-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {customTemplates.map(tpl => (
            <button
              key={tpl.id}
              onClick={() => setDefaultTemplate(tpl.id)}
              className={`px-3 py-1 rounded-lg text-xs border transition-colors ${
                defaultTemplate === tpl.id
                  ? 'bg-brand-600 border-brand-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              {tpl.name}
            </button>
          ))}
        </div>
        <button
          onClick={handleSaveDefault}
          disabled={saving}
          className="mt-3 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save default'}
        </button>
      </div>

      {/* Custom templates */}
      <div className="border-t border-gray-800 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-200">Custom templates</p>
          <button
            onClick={handleNewTemplate}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors"
          >
            + New template
          </button>
        </div>

        {customTemplates.length === 0 && selected !== '__new__' && (
          <p className="text-xs text-gray-600 italic">No custom templates yet.</p>
        )}

        {/* Template list */}
        <div className="flex flex-wrap gap-2 mb-3">
          {customTemplates.map(tpl => (
            <button
              key={tpl.id}
              onClick={() => handleSelectCustom(tpl)}
              className={`px-3 py-1 rounded-lg text-xs border transition-colors ${
                selected === tpl.id
                  ? 'bg-gray-700 border-brand-500 text-gray-100'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              {tpl.name}
            </button>
          ))}
        </div>

        {/* Editor (shown when a custom template or new is selected) */}
        {(selected !== null) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Template name"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
              <button
                onClick={handleSaveCustom}
                disabled={saving || !newName.trim()}
                className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
              </button>
              {selected !== '__new__' && (
                <button
                  onClick={() => handleDeleteCustom(selected)}
                  className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/70 text-red-400 text-xs rounded-lg border border-red-800/50 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="rounded-lg overflow-hidden border border-gray-700">
              <MiniEditor value={editorContent} onChange={setEditorContent} />
            </div>
            <p className="text-xs text-gray-600">
              Placeholders: <code className="text-gray-500">{'{{TITLE}}'}</code>, <code className="text-gray-500">{'{{AUTHORS}}'}</code>, <code className="text-gray-500">{'{{YEAR}}'}</code>, <code className="text-gray-500">{'{{DATE}}'}</code>, <code className="text-gray-500">{'{{REVIEWER}}'}</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
