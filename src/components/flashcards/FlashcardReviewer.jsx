import React, { useState, useEffect, useCallback } from 'react';

// ── Parser ─────────────────────────────────────────────────────────
// Parses the AI-generated flashcard Markdown:
//   ## Card N
//   **Q:** question text
//   **A:** answer text
export function parseFlashcards(markdown) {
  if (!markdown) return [];
  const blocks = markdown.split(/^##\s+Card\s+\d+/m).filter(Boolean);
  return blocks.reduce((acc, block, idx) => {
    const qMatch = block.match(/\*\*Q:\*\*\s*([\s\S]+?)(?=\n\*\*A:\*\*)/);
    const aMatch = block.match(/\*\*A:\*\*\s*([\s\S]+?)(?=\n##|\s*$)/);
    if (qMatch && aMatch) {
      acc.push({
        id:       idx,
        question: qMatch[1].trim(),
        answer:   aMatch[1].trim(),
      });
    }
    return acc;
  }, []);
}

// ── Confidence buttons ─────────────────────────────────────────────
const CONFIDENCE = [
  { key: 'again', label: 'Again', bg: 'bg-red-900/40 border-red-700/60 text-red-300 hover:bg-red-900/70',     shortcut: '1' },
  { key: 'hard',  label: 'Hard',  bg: 'bg-amber-900/40 border-amber-700/60 text-amber-300 hover:bg-amber-900/70', shortcut: '2' },
  { key: 'good',  label: 'Good',  bg: 'bg-emerald-900/40 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/70', shortcut: '3' },
  { key: 'easy',  label: 'Easy',  bg: 'bg-brand-900/40 border-brand-700/60 text-brand-300 hover:bg-brand-900/70',  shortcut: '4' },
];

// ── Single card with flip animation ───────────────────────────────
function FlipCard({ card, flipped, onFlip }) {
  return (
    <div
      onClick={onFlip}
      className="relative w-full cursor-pointer select-none"
      style={{ perspective: '1200px', minHeight: '260px' }}
    >
      <div
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          position: 'relative',
          width: '100%',
          height: '100%',
        }}
      >
        {/* Front — Question */}
        <div
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-gray-900 border border-gray-700 p-8 shadow-2xl"
        >
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-6">Question</p>
          <p className="text-lg font-medium text-gray-100 text-center leading-relaxed whitespace-pre-wrap">
            {card.question}
          </p>
          <p className="mt-8 text-xs text-gray-700">Click or press Space to reveal answer</p>
        </div>

        {/* Back — Answer */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
          className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-gray-800 border border-brand-700/40 p-8 shadow-2xl"
        >
          <p className="text-xs font-semibold text-brand-500 uppercase tracking-widest mb-6">Answer</p>
          <p className="text-lg font-medium text-gray-100 text-center leading-relaxed whitespace-pre-wrap">
            {card.answer}
          </p>
          <p className="mt-8 text-xs text-gray-600">Press 1–4 or click a button to continue</p>
        </div>
      </div>
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────
function ProgressBar({ current, total }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>Card {current} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Done screen ────────────────────────────────────────────────────
function DoneScreen({ total, ratings, onRestart, onExport }) {
  const counts = CONFIDENCE.reduce((acc, c) => {
    acc[c.key] = ratings.filter(r => r === c.key).length;
    return acc;
  }, {});

  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center py-12">
      <div className="text-5xl">🎉</div>
      <div>
        <h2 className="text-xl font-bold text-gray-100 mb-1">Deck complete!</h2>
        <p className="text-sm text-gray-500">{total} cards reviewed</p>
      </div>

      {/* Rating breakdown */}
      <div className="flex gap-4">
        {CONFIDENCE.map(c => (
          <div key={c.key} className="text-center">
            <p className="text-xl font-bold text-gray-200">{counts[c.key] ?? 0}</p>
            <p className="text-xs text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRestart}
          className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Review again
        </button>
        <button
          onClick={onExport}
          className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-xl transition-colors"
        >
          Export to Anki
        </button>
      </div>
    </div>
  );
}

// ── Main reviewer ──────────────────────────────────────────────────
export default function FlashcardReviewer({ cards, paperId, onExport }) {
  const [queue,    setQueue]    = useState(() => [...cards]);
  const [index,    setIndex]    = useState(0);
  const [flipped,  setFlipped]  = useState(false);
  const [ratings,  setRatings]  = useState([]);
  const [done,     setDone]     = useState(false);

  // Reset when cards change (e.g. deck regenerated)
  useEffect(() => {
    setQueue([...cards]);
    setIndex(0);
    setFlipped(false);
    setRatings([]);
    setDone(false);
  }, [cards]);

  const currentCard = queue[index];

  const advance = useCallback((confidence) => {
    const newRatings = [...ratings, confidence];
    setRatings(newRatings);

    // "Again" = re-queue at end
    let newQueue = queue;
    if (confidence === 'again') {
      newQueue = [...queue, queue[index]];
      setQueue(newQueue);
    }

    const nextIndex = index + 1;
    if (nextIndex >= newQueue.length) {
      setDone(true);
    } else {
      setIndex(nextIndex);
      setFlipped(false);
    }
  }, [queue, index, ratings]);

  const handleFlip = () => setFlipped(f => !f);

  const handleRestart = () => {
    setQueue([...cards]);
    setIndex(0);
    setFlipped(false);
    setRatings([]);
    setDone(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      // Ignore when typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!done) {
          if (!flipped) handleFlip();
          else advance('good');
        }
      }
      if (flipped && !done) {
        if (e.key === '1') advance('again');
        if (e.key === '2') advance('hard');
        if (e.key === '3') advance('good');
        if (e.key === '4') advance('easy');
      }
      if (e.key === 'ArrowRight' && flipped && !done) advance('good');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, done, advance, handleFlip]);

  if (done) {
    return (
      <DoneScreen
        total={cards.length}
        ratings={ratings}
        onRestart={handleRestart}
        onExport={onExport}
      />
    );
  }

  // ── Calculate "original" index for the progress bar ──────────────
  // We show position among the ORIGINAL cards, not the re-queued ones.
  const originalTotal    = cards.length;
  // Count how many original-card slots have been passed (excluding re-queues)
  const originalPassed   = Math.min(index, originalTotal);

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      <ProgressBar current={originalPassed} total={originalTotal} />

      <FlipCard card={currentCard} flipped={flipped} onFlip={handleFlip} />

      {/* Confidence buttons — only shown after flip */}
      <div className={`grid grid-cols-4 gap-3 transition-opacity duration-200 ${flipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {CONFIDENCE.map(c => (
          <button
            key={c.key}
            onClick={() => advance(c.key)}
            className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${c.bg}`}
          >
            <span className="block text-xs opacity-60 mb-0.5">[{c.shortcut}]</span>
            {c.label}
          </button>
        ))}
      </div>

      {/* Hint when not yet flipped */}
      {!flipped && (
        <p className="text-center text-xs text-gray-700">
          Space / Enter / click card to reveal
        </p>
      )}
    </div>
  );
}
