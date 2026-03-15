import React, { useState, useRef, useEffect } from 'react';
import TagPill from '../shared/TagPill.jsx';

/**
 * Tag filter dropdown.
 * value: 'all' | tag id string
 * onChange: (value) => void
 * tags: [{ id, name, color }]
 */
export default function TagFilter({ value, onChange, tags, papers = [] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Count papers per tag for the dropdown labels
  const tagCounts = {};
  for (const paper of papers) {
    let ids = [];
    try { ids = JSON.parse(paper.tags || '[]'); } catch { /* */ }
    for (const id of ids) tagCounts[id] = (tagCounts[id] ?? 0) + 1;
  }

  const selected = tags.find(t => t.id === value);
  const label    = value === 'all' ? 'All papers' : (selected?.name ?? 'Filter by tag');

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-800 border border-gray-700 hover:border-gray-600 text-sm text-gray-300 transition-colors"
      >
        {selected ? <TagPill tag={selected} /> : <span>{label}</span>}
        <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-9 z-20 w-52 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1">
          <button
            onClick={() => { onChange('all'); setOpen(false); }}
            className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
              value === 'all'
                ? 'text-white bg-gray-700'
                : 'text-gray-300 hover:bg-gray-700/60'
            }`}
          >
            All papers
            <span className="ml-1 text-xs text-gray-500">({papers.length})</span>
          </button>
          {tags.length > 0 && <div className="border-t border-gray-700 my-1" />}
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => { onChange(tag.id); setOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-sm transition-colors ${
                value === tag.id
                  ? 'bg-gray-700'
                  : 'hover:bg-gray-700/60'
              }`}
            >
              <TagPill tag={tag} />
              <span className="text-xs text-gray-500">{tagCounts[tag.id] ?? 0}</span>
            </button>
          ))}
          {tags.length === 0 && (
            <p className="px-3 py-1.5 text-xs text-gray-600">No tags yet — add them in Settings.</p>
          )}
        </div>
      )}
    </div>
  );
}
