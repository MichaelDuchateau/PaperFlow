import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FlashcardReviewer, { parseFlashcards } from '../components/flashcards/FlashcardReviewer.jsx';

export default function FlashcardsPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [paper,   setPaper]   = useState(null);
  const [cards,   setCards]   = useState(null);  // null = loading, [] = empty
  const [error,   setError]   = useState(null);
  const [toast,   setToast]   = useState(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      window.api.papers.getById(id),
      window.api.flashcards.get(id),
    ]).then(([p, md]) => {
      setPaper(p);
      if (!md) {
        setCards([]);
      } else {
        const parsed = parseFlashcards(md);
        setCards(parsed);
      }
    }).catch(err => setError(err.message));
  }, [id]);

  const handleExport = async () => {
    const result = await window.api.export.anki(id);
    if (result?.success) {
      showToast('success', `Exported ${result.cardCount} cards to Anki file`);
    } else if (result?.canceled) {
      // do nothing
    } else {
      showToast('error', result?.error ?? 'Export failed');
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Top bar ────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 border-b border-gray-800 bg-gray-900 flex-shrink-0"
        style={{ paddingTop: '10px', paddingBottom: '10px', WebkitAppRegion: 'drag' }}
      >
        <button
          onClick={() => navigate(`/reader/${id}`)}
          style={{ WebkitAppRegion: 'no-drag' }}
          className="flex items-center gap-1.5 text-gray-400 hover:text-gray-200 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to reader
        </button>
        <span className="text-gray-700">|</span>
        <span className="text-sm font-medium text-gray-300 truncate max-w-xs" style={{ WebkitAppRegion: 'no-drag' }}>
          {paper?.title ?? '…'}
        </span>
        <span className="flex-1" />
        {cards?.length > 0 && (
          <button
            onClick={handleExport}
            style={{ WebkitAppRegion: 'no-drag' }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 text-xs rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export to Anki
          </button>
        )}
      </div>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-8">
        {error && (
          <div className="text-red-400 text-sm">{error}</div>
        )}

        {!error && cards === null && (
          <p className="text-gray-600 text-sm">Loading flashcards…</p>
        )}

        {!error && cards !== null && cards.length === 0 && (
          <div className="flex flex-col items-center gap-4 text-center">
            <svg className="w-16 h-16 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-gray-500 text-sm">No flashcards yet.</p>
            <p className="text-gray-600 text-xs">
              Go back to the reader and click <span className="text-brand-400">Generate Flashcards</span> in the AI bar.
            </p>
            <button
              onClick={() => navigate(`/reader/${id}`)}
              className="mt-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-xl transition-colors"
            >
              Back to reader
            </button>
          </div>
        )}

        {!error && cards !== null && cards.length > 0 && (
          <FlashcardReviewer cards={cards} paperId={id} onExport={handleExport} />
        )}
      </div>

      {/* ── Toast ─────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl text-sm font-medium ${
          toast.type === 'error'   ? 'bg-red-900/90 text-red-200 border border-red-700'            :
          toast.type === 'success' ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-700' :
                                     'bg-gray-800 text-gray-200 border border-gray-700'
        }`}>
          {toast.type === 'error' ? '✕' : '✓'} {toast.message}
        </div>
      )}
    </div>
  );
}
