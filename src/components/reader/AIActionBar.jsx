import React, { useState, useRef, useEffect } from 'react';

const SKILLS = [
  { key: 'mindmap',    label: 'Mind Map'   },
  { key: 'summary',    label: 'Summary'    },
  { key: 'flashcards', label: 'Flashcards' },
  { key: 'test',       label: 'Test'       },
];

function Spinner() {
  return (
    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
    </svg>
  );
}

export default function AIActionBar({ paper, generating = {}, onGenerate, customSkills = [], customGenerating = {}, onCustomGenerate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const anyGenerating = Object.values(generating).some(Boolean) || Object.values(customGenerating).some(Boolean);
  const activeLabel   = anyGenerating
    ? [...SKILLS.map(s => generating[s.key] && s.label), ...customSkills.map(s => customGenerating[s.id] && s.name)].find(Boolean)
    : null;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSkill = (fn) => {
    if (anyGenerating) return;
    setOpen(false);
    fn();
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-800 bg-gray-900 flex-shrink-0">
      <div ref={ref} className="relative">
        <button
          onClick={() => !anyGenerating && setOpen(o => !o)}
          disabled={anyGenerating}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-colors ${
            anyGenerating
              ? 'bg-brand-900/40 border-brand-700 text-brand-300 cursor-wait'
              : open
              ? 'bg-gray-700 border-gray-600 text-gray-200'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
          }`}
        >
          {anyGenerating ? <Spinner /> : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
          {anyGenerating ? `Generating ${activeLabel}…` : 'Generate'}
          {!anyGenerating && (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>

        {open && (
          <div className="absolute left-0 bottom-9 z-30 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1">
            {/* Built-in skills */}
            {SKILLS.map(({ key, label }) => {
              const exists = !!(
                key === 'mindmap'    ? paper?.mindmap_path    :
                key === 'summary'    ? paper?.summary         :
                key === 'flashcards' ? paper?.flashcards_path :
                key === 'test'       ? paper?.test_path       : false
              );
              return (
                <button
                  key={key}
                  onClick={() => handleSkill(() => onGenerate?.(key))}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center justify-between"
                >
                  {label}
                  {exists && <span className="text-gray-600 text-[10px]">regenerate</span>}
                </button>
              );
            })}

            {/* Custom skills */}
            {customSkills.filter(s => s.enabled).length > 0 && (
              <>
                <div className="border-t border-gray-700 my-1" />
                {customSkills.filter(s => s.enabled).map(skill => (
                  <button
                    key={skill.id}
                    onClick={() => handleSkill(() => onCustomGenerate?.(skill.id))}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    {skill.name}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
