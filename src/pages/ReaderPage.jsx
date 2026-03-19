import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import ReaderTopBar    from '../components/reader/ReaderTopBar.jsx';
import PDFViewer       from '../components/reader/PDFViewer.jsx';
import MindMapViewer   from '../components/reader/MindMapViewer.jsx';
import NotesEditor     from '../components/reader/NotesEditor.jsx';
import AIActionBar     from '../components/reader/AIActionBar.jsx';
import PomodoroWidget  from '../components/reader/PomodoroWidget.jsx';

const LEFT_MIN = 25; // percent
const LEFT_MAX = 80;
const LEFT_DEFAULT = 55;

// ── Download icon ──────────────────────────────────────────────────
function DownloadIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

// ── Tab bar for left panel ─────────────────────────────────────────
function LeftTabs({ active, onChange, tabs, onExport }) {
  return (
    <div className="flex border-b border-gray-800 bg-gray-900 flex-shrink-0 overflow-x-auto">
      {tabs.map(t => (
        <div key={t.id} className="relative flex-shrink-0 flex items-stretch">
          <button
            onClick={() => onChange(t.id)}
            className={`flex-shrink-0 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
              active === t.id
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            } ${t.exportKey ? 'pr-1' : 'px-4'}`}
          >
            {t.label}
          </button>
          {t.exportKey && (
            <button
              onClick={e => { e.stopPropagation(); onExport?.(t.exportKey); }}
              title={`Download ${t.label}`}
              className={`flex items-center pr-2 py-2 -mb-px border-b-2 transition-colors ${
                active === t.id
                  ? 'border-brand-500 text-brand-600 hover:text-brand-400'
                  : 'border-transparent text-gray-700 hover:text-gray-400'
              }`}
            >
              <DownloadIcon />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Simple markdown renderer for generated content ─────────────────
function MarkdownPane({ paperId, type }) {
  const [content, setContent] = useState('');
  useEffect(() => {
    window.api.papers.getGeneratedFile(paperId, type).then(text => setContent(text ?? ''));
  }, [paperId, type]);

  const html = content
    .replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>')
    .replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/^#{4,}\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');

  return (
    <div
      className="flex-1 overflow-auto px-5 py-4 prose prose-invert prose-sm max-w-none selectable"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ── Custom skill output viewer ─────────────────────────────────────
function CustomOutputPane({ outputId }) {
  const [content, setContent] = useState('');
  useEffect(() => {
    window.api.customSkills.getOutputContent(outputId).then(text => setContent(text ?? ''));
  }, [outputId]);

  const html = content
    .replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>')
    .replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/^#{4,}\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');

  return (
    <div
      className="flex-1 overflow-auto px-5 py-4 prose prose-invert prose-sm max-w-none selectable"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ── Summary viewer ─────────────────────────────────────────────────
function SummaryPane({ summary }) {
  let s = {};
  try { s = JSON.parse(summary); } catch { /* */ }
  const authors  = Array.isArray(s.authors)  ? s.authors.join(', ')                         : (s.authors  ?? '—');
  const keywords = Array.isArray(s.keywords) ? s.keywords.map(k => `#${k}`).join('  ')      : (s.keywords ?? '');
  const field = (label, val) => val ? (
    <div key={label} className="space-y-0.5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-200 leading-relaxed">{val}</p>
    </div>
  ) : null;

  return (
    <div className="flex-1 overflow-auto px-5 py-4 space-y-4 selectable">
      <h2 className="text-base font-bold text-gray-100 leading-snug">{s.title ?? '—'}</h2>
      <p className="text-xs text-gray-500">{authors}{s.year ? ` · ${s.year}` : ''}{s.journal ? ` · ${s.journal}` : ''}</p>
      {field('Objective',   s.objective)}
      {field('Methods',     s.methods)}
      {field('Results',     s.results)}
      {field('Conclusions', s.conclusions)}
      {keywords && (
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Keywords</p>
          <p className="text-xs text-brand-400 leading-relaxed">{keywords}</p>
        </div>
      )}
    </div>
  );
}

export default function ReaderPage() {
  const { id }               = useParams();
  const [searchParams]       = useSearchParams();

  // ── State ──────────────────────────────────────────────────────
  const [paper,             setPaper]             = useState(null);
  const [settings,          setSettings]          = useState({});
  const [allTags,           setAllTags]            = useState([]);
  const [leftTab,           setLeftTab]            = useState('pdf');
  const [leftWidth,         setLeftWidth]          = useState(LEFT_DEFAULT);
  const [generating,        setGenerating]         = useState({ mindmap: false, summary: false, flashcards: false, test: false });
  const [customSkills,      setCustomSkills]       = useState([]);
  const [customOutputs,     setCustomOutputs]      = useState([]); // [{id, skill_id, skill_name, ...}]
  const [customGenerating,  setCustomGenerating]   = useState({});
  const [toast,      setToast]      = useState(null);

  const containerRef    = useRef(null);
  const draggingRef     = useRef(false);
  const startXRef       = useRef(0);
  const startWidthRef   = useRef(LEFT_DEFAULT);
  const notesEditorRef  = useRef(null);

  const [selectedPdfText, setSelectedPdfText] = useState(null);

  // ── Load paper + settings ─────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    Promise.all([
      window.api.papers.getById(id),
      window.api.settings.getAll(),
      window.api.tags.getAll(),
      window.api.customSkills.getAll(),
      window.api.customSkills.getOutputsForPaper(id),
    ]).then(([p, s, t, cs, co]) => {
      setPaper(p);
      setSettings(s ?? {});
      setAllTags(t ?? []);
      setCustomSkills(cs ?? []);
      setCustomOutputs(co ?? []);
      if (searchParams.get('tab') === 'mindmap') setLeftTab('mindmap');
    });
  }, [id]);

  const refreshPaper = useCallback(async () => {
    const p = await window.api.papers.getById(id);
    setPaper(p);
  }, [id]);

  // ── Settings change (used by PomodoroWidget) ──────────────────
  const handleSettingsChange = useCallback(async (updates) => {
    for (const [key, value] of Object.entries(updates)) {
      await window.api.settings.set(key, value);
    }
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // ── Tag update ────────────────────────────────────────────────
  const handleTagsChange = useCallback(async (newTagIds) => {
    const tags = JSON.stringify(newTagIds);
    await window.api.papers.update(id, { tags });
    setPaper(prev => ({ ...prev, tags }));
  }, [id]);

  // ── Custom skill generation ───────────────────────────────────
  const handleCustomGenerate = useCallback(async (skillId) => {
    setCustomGenerating(prev => ({ ...prev, [skillId]: true }));
    showToast('info', 'Running custom skill…');
    try {
      const result = await window.api.customSkills.run(skillId, id);
      const outputs = await window.api.customSkills.getOutputsForPaper(id);
      setCustomOutputs(outputs);
      const output = outputs.find(o => o.skill_id === skillId);
      if (output) setLeftTab(`custom_${skillId}`);
      if (result?.truncated) showToast('info', 'Done (paper was truncated).');
      else showToast('success', 'Custom skill done!');
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setCustomGenerating(prev => ({ ...prev, [skillId]: false }));
    }
  }, [id]);

  // ── PDF text → notes injection ────────────────────────────────
  const handlePdfTextSelected = useCallback((text) => {
    setSelectedPdfText(text || null);
  }, []);

  const handleInjectText = useCallback(() => {
    if (!selectedPdfText || !notesEditorRef.current) return;
    notesEditorRef.current.insertAtCursor(selectedPdfText);
    setSelectedPdfText(null);
    window.getSelection()?.removeAllRanges();
  }, [selectedPdfText]);

  // ── Export tab content ────────────────────────────────────────
  const handleExportTab = useCallback(async (exportKey) => {
    try {
      const result = await window.api.export[exportKey](id);
      if (result?.error) showToast('error', result.error);
      else showToast('success', `${exportKey.charAt(0).toUpperCase() + exportKey.slice(1)} exported.`);
    } catch (err) {
      showToast('error', err.message);
    }
  }, [id]);

  // ── Title edit ────────────────────────────────────────────────
  const handleTitleChange = useCallback(async (newTitle) => {
    await window.api.papers.update(id, { title: newTitle });
    setPaper(prev => ({ ...prev, title: newTitle }));
  }, [id]);

  // ── AI generation ─────────────────────────────────────────────
  const handleGenerate = useCallback(async (skill) => {
    setGenerating(prev => ({ ...prev, [skill]: true }));
    showToast('info', `Generating ${skill}…`);
    try {
      const result = await window.api.ai[skill](id);
      await refreshPaper();
      // Auto-switch to the newly generated tab
      if (['mindmap', 'summary', 'flashcards', 'test'].includes(skill)) setLeftTab(skill);
      const label = skill.charAt(0).toUpperCase() + skill.slice(1);
      if (result?.truncated) {
        showToast('info', `${label} generated (paper was truncated — very large PDF).`);
      } else {
        showToast('success', `${label} generated!`);
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setGenerating(prev => ({ ...prev, [skill]: false }));
    }
  }, [id, refreshPaper]);

  // ── Toast ─────────────────────────────────────────────────────
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Panel resize ──────────────────────────────────────────────
  const handleResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    draggingRef.current   = true;
    startXRef.current     = e.clientX;
    startWidthRef.current = leftWidth;

    const onMove = (ev) => {
      if (!draggingRef.current || !containerRef.current) return;
      const dx     = ev.clientX - startXRef.current;
      const total  = containerRef.current.offsetWidth;
      const newPct = Math.max(LEFT_MIN, Math.min(LEFT_MAX,
        startWidthRef.current + (dx / total) * 100
      ));
      setLeftWidth(newPct);
    };

    const onUp = () => {
      draggingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  }, [leftWidth]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <ReaderTopBar
        paper={paper}
        onTitleChange={handleTitleChange}
        allTags={allTags}
        onTagsChange={handleTagsChange}
        pomodoroWidget={
          settings.pomodoro_enabled !== false ? (
            <PomodoroWidget
              paperId={id}
              settings={settings}
              onSettingsChange={handleSettingsChange}
            />
          ) : null
        }
      />

      {/* Two-panel area */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden min-h-0">

        {/* ── Left panel ──────────────────────────────────────── */}
        <div
          className="flex flex-col overflow-hidden min-w-0"
          style={{ width: `${leftWidth}%`, flexShrink: 0 }}
        >
          <LeftTabs
            active={leftTab}
            onChange={setLeftTab}
            onExport={handleExportTab}
            tabs={[
              { id: 'pdf',        label: 'PDF' },
              ...(paper?.mindmap_path    ? [{ id: 'mindmap',    label: 'Mind Map',   exportKey: 'mindmap'    }] : []),
              ...(paper?.summary         ? [{ id: 'summary',    label: 'Summary',    exportKey: 'summary'    }] : []),
              ...(paper?.flashcards_path ? [{ id: 'flashcards', label: 'Flashcards', exportKey: 'flashcards' }] : []),
              ...(paper?.test_path       ? [{ id: 'test',       label: 'Test',       exportKey: 'test'       }] : []),
              ...customOutputs.map(o => ({ id: `custom_${o.skill_id}`, label: o.skill_name })),
            ]}
          />
          <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
            {leftTab === 'pdf'        && <PDFViewer paperId={id} onTextSelected={handlePdfTextSelected} />}
            {leftTab === 'mindmap'    && <MindMapViewer paperId={id} paper={paper} onGenerate={handleGenerate} generating={generating.mindmap} />}
            {leftTab === 'summary'    && <SummaryPane summary={paper?.summary} />}
            {leftTab === 'flashcards' && <MarkdownPane paperId={id} type="flashcards" />}
            {leftTab === 'test'       && <MarkdownPane paperId={id} type="test" />}
            {leftTab.startsWith('custom_') && (() => {
              const skillId = leftTab.slice(7);
              const output  = customOutputs.find(o => o.skill_id === skillId);
              return output ? <CustomOutputPane outputId={output.id} /> : null;
            })()}
          </div>
        </div>

        {/* ── Resize handle + inject button ────────────────────── */}
        <div
          onMouseDown={handleResizeMouseDown}
          className="relative w-1 flex-shrink-0 bg-gray-800 hover:bg-brand-600/60 cursor-col-resize transition-colors active:bg-brand-500 overflow-visible"
        >
          {selectedPdfText && (
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={handleInjectText}
              title="Send selection to notes"
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-6 h-6 bg-brand-500 hover:bg-brand-400 rounded-full flex items-center justify-center shadow-lg transition-colors cursor-pointer no-drag"
            >
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Right panel — Notes ──────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
          <NotesEditor ref={notesEditorRef} paperId={id} paper={paper} settings={settings} />
        </div>
      </div>

      {/* AI action bar */}
      <AIActionBar
        paper={paper}
        generating={generating}
        onGenerate={handleGenerate}
        customSkills={customSkills}
        customGenerating={customGenerating}
        onCustomGenerate={handleCustomGenerate}
      />

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-14 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl text-sm font-medium ${
          toast.type === 'error'   ? 'bg-red-900/90 text-red-200 border border-red-700'            :
          toast.type === 'success' ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-700' :
                                     'bg-gray-800 text-gray-200 border border-gray-700'
        }`}>
          {toast.type === 'error' ? '✕' : toast.type === 'success' ? '✓' : 'ℹ'}
          {toast.message}
        </div>
      )}
    </div>
  );
}
