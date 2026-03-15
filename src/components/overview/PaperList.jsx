import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TagPill from '../shared/TagPill.jsx';

// ── Status config ──────────────────────────────────────────────────
const STATUS_CONFIG = {
  unread:  { label: 'Unread',  dot: 'bg-gray-500',   next: 'reading' },
  reading: { label: 'Reading', dot: 'bg-amber-400',  next: 'done'    },
  done:    { label: 'Done',    dot: 'bg-emerald-400', next: 'unread'  },
};

// ── Action icon button ─────────────────────────────────────────────
function ActionIcon({ title, active, onClick, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-1 rounded transition-colors ${
        active
          ? 'text-brand-400 hover:text-brand-300'
          : 'text-gray-700 hover:text-gray-500 cursor-default'
      }`}
    >
      {children}
    </button>
  );
}

// ── Download dropdown ──────────────────────────────────────────────
function DownloadMenu({ paper }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const items = [
    { label: 'Note (.md)',       enabled: !!paper.notes_path,      fn: () => window.api.export.note(paper.id) },
    { label: 'Flashcards (.md)', enabled: !!paper.flashcards_path, fn: () => window.api.export.flashcards(paper.id) },
    { label: 'Anki (.txt)',      enabled: !!paper.flashcards_path, fn: () => window.api.export.anki(paper.id) },
    { label: 'Mind map (.md)',   enabled: !!paper.mindmap_path,    fn: () => window.api.export.mindmap(paper.id) },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Export"
        className="p-1 rounded text-gray-600 hover:text-gray-400 transition-colors"
      >
        {/* Download icon */}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 bottom-7 z-20 w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1">
          {items.map(item => (
            <button
              key={item.label}
              disabled={!item.enabled}
              onClick={() => { item.fn(); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                item.enabled
                  ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  : 'text-gray-600 cursor-default'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Row ────────────────────────────────────────────────────────────
function PaperRow({ paper, tags, onStatusChange, onDelete }) {
  const navigate = useNavigate();
  const status   = STATUS_CONFIG[paper.status] ?? STATUS_CONFIG.unread;
  const summary  = React.useMemo(() => {
    try { return paper.summary ? JSON.parse(paper.summary) : null; } catch { return null; }
  }, [paper.summary]);
  const tagIds   = React.useMemo(() => {
    try { return JSON.parse(paper.tags || '[]'); } catch { return []; }
  }, [paper.tags]);
  const tagMap   = Object.fromEntries(tags.map(t => [t.id, t]));

  return (
    <tr className="group border-b border-gray-800/60 hover:bg-gray-900/60 transition-colors">
      {/* Status dot */}
      <td className="pl-4 pr-2 py-3 w-6">
        <button
          title={`Status: ${status.label} — click to advance`}
          onClick={() => onStatusChange(paper.id, status.next)}
          className={`w-2.5 h-2.5 rounded-full ${status.dot} hover:opacity-70 transition-opacity`}
        />
      </td>

      {/* Title + meta */}
      <td className="px-3 py-3 min-w-0">
        <button
          onClick={() => navigate(`/reader/${paper.id}`)}
          className="text-left block w-full"
        >
          <p className="text-sm font-medium text-gray-100 hover:text-brand-300 transition-colors truncate max-w-sm">
            {summary?.title || paper.title}
          </p>
          {(summary?.authors?.length || summary?.year) && (
            <p className="text-xs text-gray-600 mt-0.5 truncate">
              {summary.authors?.slice(0, 2).join(', ')}
              {summary.authors?.length > 2 ? ' et al.' : ''}
              {summary.year ? ` · ${summary.year}` : ''}
            </p>
          )}
        </button>
      </td>

      {/* Tags */}
      <td className="px-3 py-3 w-48">
        <div className="flex flex-wrap gap-1">
          {tagIds.map(id => tagMap[id] && (
            <TagPill key={id} tag={tagMap[id]} />
          ))}
        </div>
      </td>

      {/* AI content icons */}
      <td className="px-3 py-3 w-32">
        <div className="flex items-center gap-0.5">
          {/* Note */}
          <ActionIcon
            title="Open notes"
            active={!!paper.notes_path}
            onClick={() => paper.notes_path && navigate(`/reader/${paper.id}?panel=notes`)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </ActionIcon>
          {/* Flashcards */}
          <ActionIcon title="View flashcards" active={!!paper.flashcards_path} onClick={() => {}}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </ActionIcon>
          {/* Mind map */}
          <ActionIcon title="View mind map" active={!!paper.mindmap_path} onClick={() => {}}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-10l6-3m6 16l-6 3V7l6-3v16z" />
            </svg>
          </ActionIcon>
          {/* Test */}
          <ActionIcon title="View practice test" active={!!paper.test_path} onClick={() => {}}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </ActionIcon>
        </div>
      </td>

      {/* Download + delete */}
      <td className="pr-4 py-3 w-16">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <DownloadMenu paper={paper} />
          <button
            onClick={() => onDelete(paper.id, paper.title)}
            title="Delete paper"
            className="p-1 rounded text-gray-700 hover:text-red-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main component ─────────────────────────────────────────────────
export default function PaperList({ papers, tags, onStatusChange, onDelete, loading }) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
        Loading papers…
      </div>
    );
  }

  if (papers.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-600">
        <svg className="w-12 h-12 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p className="text-sm">No papers yet — click <span className="text-brand-400">+ Add Paper</span> to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-800 text-xs text-gray-600 uppercase tracking-wider sticky top-0 bg-gray-950 z-10">
            <th className="pl-4 pr-2 py-2 w-6" />
            <th className="px-3 py-2 text-left">Title</th>
            <th className="px-3 py-2 text-left w-48">Tags</th>
            <th className="px-3 py-2 text-left w-32">Content</th>
            <th className="pr-4 py-2 w-16" />
          </tr>
        </thead>
        <tbody>
          {papers.map(paper => (
            <PaperRow
              key={paper.id}
              paper={paper}
              tags={tags}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
