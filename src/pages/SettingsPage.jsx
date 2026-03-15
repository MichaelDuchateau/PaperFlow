import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import GeneralSection    from '../components/settings/GeneralSection.jsx';
import TagsSection       from '../components/settings/TagsSection.jsx';
import TemplatesSection  from '../components/settings/TemplatesSection.jsx';
import PomodoroSection   from '../components/settings/PomodoroSection.jsx';
import AISkillsSection   from '../components/settings/AISkillsSection.jsx';
import GoalsSection      from '../components/settings/GoalsSection.jsx';

// ── Nav items ──────────────────────────────────────────────────────
const NAV = [
  { id: 'general',   label: 'General',       icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'tags',      label: 'Tags',          icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
  { id: 'templates', label: 'Note Templates',icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'pomodoro',  label: 'Pomodoro',      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'ai',        label: 'AI Skills',     icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { id: 'goals',     label: 'Goals',         icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
];

export default function SettingsPage() {
  const navigate             = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initSection          = searchParams.get('section') ?? 'general';

  const [activeSection, setActiveSection] = useState(initSection);
  const [settings,      setSettings]      = useState({});
  const [tags,          setTags]          = useState([]);

  const loadData = useCallback(async () => {
    const [s, t] = await Promise.all([
      window.api.settings.getAll(),
      window.api.tags.getAll(),
    ]);
    setSettings(s ?? {});
    setTags(t ?? []);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleNav = (id) => {
    setActiveSection(id);
    setSearchParams({ section: id });
  };

  // Generic settings save — merges updates into local state and persists
  const handleSaveSettings = useCallback(async (updates) => {
    for (const [key, value] of Object.entries(updates)) {
      await window.api.settings.set(key, value);
    }
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-950">
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 border-b border-gray-800 bg-gray-900 flex-shrink-0"
        style={{ paddingTop: '10px', paddingBottom: '10px', WebkitAppRegion: 'drag' }}
      >
        <button
          onClick={() => navigate('/')}
          style={{ WebkitAppRegion: 'no-drag' }}
          className="flex items-center gap-1.5 text-gray-400 hover:text-gray-200 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
        <h1 className="text-sm font-semibold text-gray-100" style={{ WebkitAppRegion: 'no-drag' }}>Settings</h1>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ── Sidebar nav ────────────────────────────────────── */}
        <nav className="w-48 flex-shrink-0 bg-gray-900 border-r border-gray-800 py-4 overflow-y-auto">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors text-left ${
                activeSection === item.id
                  ? 'bg-brand-600/15 text-brand-300 border-r-2 border-brand-500'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </nav>

        {/* ── Section content ─────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-8 min-w-0">
          <SectionHeading nav={NAV.find(n => n.id === activeSection)} />
          <div className="mt-6 max-w-2xl">
            {activeSection === 'general' && (
              <GeneralSection settings={settings} onSave={handleSaveSettings} />
            )}
            {activeSection === 'tags' && (
              <TagsSection tags={tags} onRefresh={loadData} />
            )}
            {activeSection === 'templates' && (
              <TemplatesSection settings={settings} onSave={handleSaveSettings} />
            )}
            {activeSection === 'pomodoro' && (
              <PomodoroSection settings={settings} onSave={handleSaveSettings} />
            )}
            {activeSection === 'ai' && (
              <AISkillsSection settings={settings} />
            )}
            {activeSection === 'goals' && (
              <GoalsSection settings={settings} onSave={handleSaveSettings} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function SectionHeading({ nav }) {
  if (!nav) return null;
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-brand-600/15 flex items-center justify-center">
        <svg className="w-4 h-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={nav.icon} />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-100">{nav.label}</h2>
    </div>
  );
}
