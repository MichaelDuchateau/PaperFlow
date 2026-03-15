import React from 'react';
import { useNavigate } from 'react-router-dom';

const SKILLS = [
  { key: 'mindmap',    label: 'Mind Map',   icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-10l6-3m6 16l-6 3V7l6-3v16z' },
  { key: 'summary',    label: 'Summary',    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { key: 'flashcards', label: 'Flashcards', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { key: 'test',       label: 'Test',       icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
];

function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  );
}

export default function AIActionBar({ paper, generating = {}, onGenerate }) {
  const navigate = useNavigate();
  const anyGenerating = Object.values(generating).some(Boolean);

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-800 bg-gray-900 flex-shrink-0">
      <span className="text-xs text-gray-600 mr-1">Generate:</span>

      {SKILLS.map(({ key, label, icon }) => {
        const isGenerating = generating[key];
        // Indicate if content already exists (dim the button differently)
        const exists = !!(
          key === 'mindmap'    ? paper?.mindmap_path    :
          key === 'summary'    ? paper?.summary         :
          key === 'flashcards' ? paper?.flashcards_path :
          key === 'test'       ? paper?.test_path       : false
        );

        return (
          <button
            key={key}
            onClick={() => !anyGenerating && onGenerate?.(key)}
            disabled={anyGenerating}
            title={exists ? `Regenerate ${label}` : `Generate ${label}`}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors border ${
              isGenerating
                ? 'bg-brand-900/40 border-brand-700 text-brand-300 cursor-wait'
                : anyGenerating
                ? 'opacity-40 cursor-not-allowed bg-gray-800 border-gray-700 text-gray-500'
                : exists
                ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                : 'bg-brand-600/20 border-brand-700/50 text-brand-300 hover:bg-brand-600/30'
            }`}
          >
            {isGenerating ? (
              <Spinner />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
              </svg>
            )}
            {isGenerating ? `${label}…` : label}
            {exists && !isGenerating && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" title="Already generated" />
            )}
          </button>
        );
      })}

      {/* Quick-access: review flashcards */}
      {paper?.flashcards_path && (
        <button
          onClick={() => navigate(`/flashcards/${paper.id}`)}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-emerald-900/30 border border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Review flashcards
        </button>
      )}
    </div>
  );
}
