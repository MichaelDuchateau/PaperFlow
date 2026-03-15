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

// ── Tab bar for left panel ─────────────────────────────────────────
function LeftTabs({ active, onChange, hasMindmap }) {
  const tabs = [
    { id: 'pdf',     label: 'PDF' },
    { id: 'mindmap', label: 'Mind Map', dot: hasMindmap },
  ];
  return (
    <div className="flex border-b border-gray-800 bg-gray-900 flex-shrink-0">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
            active === t.id
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          {t.label}
          {t.dot && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
        </button>
      ))}
    </div>
  );
}

export default function ReaderPage() {
  const { id }               = useParams();
  const [searchParams]       = useSearchParams();

  // ── State ──────────────────────────────────────────────────────
  const [paper,      setPaper]      = useState(null);
  const [settings,   setSettings]   = useState({});
  const [leftTab,    setLeftTab]    = useState('pdf');
  const [leftWidth,  setLeftWidth]  = useState(LEFT_DEFAULT); // percent
  const [generating, setGenerating] = useState({ mindmap: false, summary: false, flashcards: false, test: false });
  const [toast,      setToast]      = useState(null);

  const containerRef  = useRef(null);
  const draggingRef   = useRef(false);
  const startXRef     = useRef(0);
  const startWidthRef = useRef(LEFT_DEFAULT);

  // ── Load paper + settings ─────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    Promise.all([
      window.api.papers.getById(id),
      window.api.settings.getAll(),
    ]).then(([p, s]) => {
      setPaper(p);
      setSettings(s ?? {});
      // If URL says ?panel=notes, ensure we can see the notes pane (it's always visible)
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
      if (result?.status === 'stub') {
        showToast('info', 'AI not configured yet — add your API key in Settings (Phase 8).');
      } else {
        await refreshPaper();
        if (skill === 'mindmap') setLeftTab('mindmap');
        showToast('success', `${skill.charAt(0).toUpperCase() + skill.slice(1)} generated!`);
      }
    } catch (err) {
      showToast('error', `Generation failed: ${err.message}`);
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
        pomodoroWidget={
          <PomodoroWidget
            paperId={id}
            settings={settings}
            onSettingsChange={handleSettingsChange}
          />
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
            hasMindmap={!!paper?.mindmap_path}
          />
          <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
            {leftTab === 'pdf' ? (
              <PDFViewer paperId={id} />
            ) : (
              <MindMapViewer
                paperId={id}
                paper={paper}
                onGenerate={handleGenerate}
                generating={generating.mindmap}
              />
            )}
          </div>
        </div>

        {/* ── Resize handle ────────────────────────────────────── */}
        <div
          onMouseDown={handleResizeMouseDown}
          className="w-1 flex-shrink-0 bg-gray-800 hover:bg-brand-600/60 cursor-col-resize transition-colors active:bg-brand-500"
          style={{ cursor: 'col-resize' }}
        />

        {/* ── Right panel — Notes ──────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
          <NotesEditor paperId={id} paper={paper} settings={settings} />
        </div>
      </div>

      {/* AI action bar */}
      <AIActionBar paper={paper} generating={generating} onGenerate={handleGenerate} />

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
