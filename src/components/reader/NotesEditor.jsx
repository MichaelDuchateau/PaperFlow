import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { EditorState }   from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown }      from '@codemirror/lang-markdown';
import { oneDark }       from '@codemirror/theme-one-dark';
import { closeBrackets } from '@codemirror/autocomplete';
import { indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { buildNote }     from '../../lib/noteTemplates.js';

const SAVE_DELAY = 1000; // ms debounce

// ── Minimal Markdown → HTML preview ──────────────────────────────
function renderMarkdown(md) {
  // Strip YAML frontmatter
  const body = md.replace(/^---[\s\S]*?---\n?/, '');
  return body
    .replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>')
    .replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/^#{4,}\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`([^`]+)`/g,     '<code>$1</code>')
    .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]+?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^(?!<[hup])/gm, '')   // keep block elements unaffected
    .trim();
}

const NotesEditor = forwardRef(function NotesEditor({ paperId, paper, settings }, ref) {
  const editorContainerRef = useRef(null);
  const viewRef            = useRef(null);
  const saveTimerRef       = useRef(null);
  const lastSavedRef       = useRef('');

  const [mode,       setMode]       = useState('edit'); // 'edit' | 'preview'
  const [content,    setContent]    = useState('');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved'
  const [loading,    setLoading]    = useState(true);

  // ── Debounced save ─────────────────────────────────────────────
  const schedulesSave = useCallback((text) => {
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (text === lastSavedRef.current) return;
      setSaveStatus('saving');
      try {
        await window.api.notes.save(paperId, text);
        lastSavedRef.current = text;
        setSaveStatus('saved');
      } catch {
        setSaveStatus('unsaved');
      }
    }, SAVE_DELAY);
  }, [paperId]);

  // ── Load or create note on mount / paper change ───────────────
  useEffect(() => {
    if (!paperId || !paper) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      let text = await window.api.notes.get(paperId);
      if (!text) {
        // First open: build from template
        const templateName  = settings?.default_template ?? 'free-form';
        const reviewerName  = settings?.reviewer_name    ?? '';
        let summary = null;
        try { summary = paper.summary ? JSON.parse(paper.summary) : null; } catch { /* */ }
        text = buildNote(templateName, paper, summary, reviewerName);
        await window.api.notes.save(paperId, text);
      }
      if (!cancelled) {
        lastSavedRef.current = text;
        setContent(text);
        setLoading(false);
        setSaveStatus('saved');
      }
    })();

    return () => { cancelled = true; };
  }, [paperId, paper?.id]);

  // ── Mount / destroy CodeMirror ────────────────────────────────
  useEffect(() => {
    if (loading || mode !== 'edit' || !editorContainerRef.current) return;

    const updateListener = EditorView.updateListener.of(update => {
      if (!update.docChanged) return;
      const text = update.state.doc.toString();
      setContent(text);
      schedulesSave(text);
    });

    const state = EditorState.create({
      doc: content,
      extensions: [
        history(),
        markdown(),
        oneDark,
        EditorView.lineWrapping,
        lineNumbers(),
        highlightActiveLine(),
        drawSelection(),
        closeBrackets(),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        updateListener,
        EditorView.theme({
          '&': { height: '100%', fontSize: '13px' },
          '.cm-scroller': { overflow: 'auto', fontFamily: '"JetBrains Mono", "Fira Code", monospace' },
          '.cm-content': { padding: '12px 0' },
        }),
      ],
    });

    const view = new EditorView({ state, parent: editorContainerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Intentionally omit `content` so the editor isn't re-created on every keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, mode, paperId]);

  // ── Expose insertAtCursor to parent via ref ───────────────────
  useImperativeHandle(ref, () => ({
    insertAtCursor(text) {
      const view = viewRef.current;
      if (!view) return;
      // Switch to edit mode if in preview
      setMode('edit');
      // Insert at cursor position (or end if no cursor)
      const from = view.state.selection.main.from;
      view.dispatch({
        changes: { from, insert: text },
        selection: { anchor: from + text.length },
      });
      view.focus();
    },
  }), []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
        <svg className="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        Loading notes…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Notes toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-800 bg-gray-900 flex-shrink-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</span>
        <div className="ml-auto flex items-center gap-1">
          {/* Edit / Preview toggle */}
          <div className="flex rounded-md overflow-hidden border border-gray-700 text-xs">
            {['edit', 'preview'].map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-2.5 py-1 transition-colors capitalize ${
                  mode === m ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          {/* Save status */}
          <span className={`text-xs ml-2 ${
            saveStatus === 'saved'   ? 'text-gray-700' :
            saveStatus === 'saving'  ? 'text-amber-500' : 'text-gray-500'
          }`}>
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? '✓ Saved' : '● Unsaved'}
          </span>
        </div>
      </div>

      {/* Editor / Preview */}
      {mode === 'edit' ? (
        <div ref={editorContainerRef} className="flex-1 overflow-hidden" />
      ) : (
        <div
          className="flex-1 overflow-auto px-5 py-4 prose prose-invert prose-sm max-w-none selectable"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      )}
    </div>
  );
});

export default NotesEditor;
