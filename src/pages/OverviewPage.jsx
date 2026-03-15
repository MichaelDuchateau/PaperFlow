import React, { useState, useEffect, useCallback } from 'react';
import DashboardPanel from '../components/overview/DashboardPanel.jsx';
import PaperList      from '../components/overview/PaperList.jsx';
import TagFilter      from '../components/overview/TagFilter.jsx';

export default function OverviewPage() {
  // ── State ──────────────────────────────────────────────────────
  const [papers,        setPapers]        = useState([]);
  const [tags,          setTags]          = useState([]);
  const [settings,      setSettings]      = useState({});
  const [pomodoroStats, setPomodoroStats] = useState({ today: 0, total: 0 });
  const [toThinkItems,  setToThinkItems]  = useState([]);
  const [tagFilter,     setTagFilter]     = useState('all');
  const [loading,       setLoading]       = useState(true);
  const [adding,        setAdding]        = useState(false);
  const [toast,         setToast]         = useState(null); // { type, message }

  // ── Data loading ───────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const [p, t, s, ps, tt] = await Promise.all([
        window.api.papers.getAll(),
        window.api.tags.getAll(),
        window.api.settings.getAll(),
        window.api.pomodoro.stats(),
        window.api.notes.getToThink(),
      ]);
      setPapers(p ?? []);
      setTags(t ?? []);
      setSettings(s ?? {});
      setPomodoroStats(ps ?? { today: 0, total: 0 });
      setToThinkItems(tt ?? []);
    } catch (err) {
      showToast('error', `Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Toast helper ───────────────────────────────────────────────
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Add paper ──────────────────────────────────────────────────
  const handleAddPaper = async () => {
    if (adding) return;
    try {
      const filePath = await window.api.dialog.openFile();
      if (!filePath) return;
      setAdding(true);
      showToast('info', 'Adding paper and extracting text…');
      const paper = await window.api.papers.add(filePath);
      await refresh();
      showToast('success', `"${paper.title}" added successfully.`);
    } catch (err) {
      showToast('error', `Failed to add paper: ${err.message}`);
    } finally {
      setAdding(false);
    }
  };

  // ── Status change ──────────────────────────────────────────────
  const handleStatusChange = async (id, newStatus) => {
    try {
      await window.api.papers.update(id, { status: newStatus });
      setPapers(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } catch (err) {
      showToast('error', `Failed to update status: ${err.message}`);
    }
  };

  // ── Delete paper ───────────────────────────────────────────────
  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?\n\nThis will also remove the PDF and all generated files.`)) return;
    try {
      await window.api.papers.delete(id);
      setPapers(prev => prev.filter(p => p.id !== id));
      showToast('success', `"${title}" deleted.`);
    } catch (err) {
      showToast('error', `Failed to delete: ${err.message}`);
    }
  };

  // ── Filtered papers ────────────────────────────────────────────
  const filteredPapers = tagFilter === 'all'
    ? papers
    : papers.filter(p => {
        let ids = [];
        try { ids = JSON.parse(p.tags || '[]'); } catch { /* */ }
        return ids.includes(tagFilter);
      });

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <DashboardPanel
        papers={papers}
        tags={tags}
        settings={settings}
        pomodoroStats={pomodoroStats}
        toThinkItems={toThinkItems}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800 bg-gray-950 flex-shrink-0">
          <button
            onClick={handleAddPaper}
            disabled={adding}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-wait text-white text-sm rounded-md transition-colors font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {adding ? 'Adding…' : 'Add Paper'}
          </button>

          <TagFilter
            value={tagFilter}
            onChange={setTagFilter}
            tags={tags}
            papers={papers}
          />

          {/* Status filter summary */}
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-600">
            {['unread', 'reading', 'done'].map(s => {
              const count = papers.filter(p => p.status === s).length;
              if (!count) return null;
              const colors = { unread: 'bg-gray-500', reading: 'bg-amber-400', done: 'bg-emerald-400' };
              return (
                <span key={s} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${colors[s]}`} />
                  {count} {s}
                </span>
              );
            })}
          </div>
        </div>

        {/* Paper list */}
        <PaperList
          papers={filteredPapers}
          tags={tags}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onToast={showToast}
          loading={loading}
        />
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl text-sm font-medium transition-all ${
          toast.type === 'error'   ? 'bg-red-900/90 text-red-200 border border-red-700'    :
          toast.type === 'success' ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-700' :
                                     'bg-gray-800 text-gray-200 border border-gray-700'
        }`}>
          {toast.type === 'error'   ? '✕' : toast.type === 'success' ? '✓' : 'ℹ'}
          {toast.message}
        </div>
      )}
    </div>
  );
}
