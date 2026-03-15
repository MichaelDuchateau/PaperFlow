import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Top bar for the Reader page.
 * - Back arrow → Overview
 * - Editable paper title (save on blur / Enter)
 * - Pomodoro widget stub (Phase 4 will animate it)
 * - Settings gear
 */
export default function ReaderTopBar({ paper, onTitleChange, pomodoroWidget }) {
  const navigate   = useNavigate();
  const [editing,  setEditing]  = useState(false);
  const [draft,    setDraft]    = useState('');
  const inputRef   = useRef(null);

  useEffect(() => {
    if (paper) setDraft(paper.title || '');
  }, [paper?.title]);

  const startEdit = () => { setEditing(true); setTimeout(() => inputRef.current?.select(), 0); };
  const commitEdit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== paper?.title) onTitleChange?.(trimmed);
    else setDraft(paper?.title || '');
  };
  const cancelEdit = () => { setEditing(false); setDraft(paper?.title || ''); };

  return (
    <header className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-gray-900 flex-shrink-0 drag-region min-h-[42px]">
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="no-drag p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors flex-shrink-0"
        title="Back to overview"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Editable title */}
      <div className="no-drag flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            className="w-full bg-gray-800 border border-brand-500 rounded px-2 py-0.5 text-sm text-gray-100 outline-none"
          />
        ) : (
          <button
            onClick={startEdit}
            title="Click to edit title"
            className="text-sm font-medium text-gray-200 hover:text-white truncate max-w-full text-left transition-colors"
          >
            {paper?.title ?? '…'}
          </button>
        )}
      </div>

      {/* Pomodoro widget (Phase 4 replaces this stub) */}
      <div className="no-drag flex-shrink-0">
        {pomodoroWidget ?? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 border border-gray-700 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 7v5l3 3" />
            </svg>
            25:00
          </div>
        )}
      </div>

      {/* Settings gear */}
      <button
        onClick={() => navigate('/settings')}
        className="no-drag p-1.5 rounded hover:bg-gray-800 text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0"
        title="Settings"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </header>
  );
}
