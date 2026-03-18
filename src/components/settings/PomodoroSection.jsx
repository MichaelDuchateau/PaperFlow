import React, { useState } from 'react';

function NumStepper({ label, hint, value, onChange, min = 1, max = 120 }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm text-gray-200">{label}</p>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-bold flex items-center justify-center transition-colors"
        >
          −
        </button>
        <span className="w-10 text-center text-sm font-mono text-gray-100 tabular-nums">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-bold flex items-center justify-center transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function PomodoroSection({ settings, onSave }) {
  const [enabled,  setEnabled]  = useState(settings.pomodoro_enabled        ?? true);
  const [workMin,  setWorkMin]  = useState(settings.pomodoro_work_minutes   ?? 25);
  const [breakMin, setBreakMin] = useState(settings.pomodoro_break_minutes  ?? 5);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      pomodoro_enabled:        enabled,
      pomodoro_work_minutes:   workMin,
      pomodoro_break_minutes:  breakMin,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Enable toggle */}
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm text-gray-200">Enable Pomodoro timer</p>
          <p className="text-xs text-gray-500">Show the timer widget in the reader toolbar</p>
        </div>
        <button
          onClick={() => setEnabled(v => !v)}
          className={`relative w-11 h-6 rounded-full overflow-hidden transition-colors ${enabled ? 'bg-brand-600' : 'bg-gray-700'}`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className={`space-y-0 divide-y divide-gray-800/60 ${!enabled ? 'opacity-40 pointer-events-none' : ''}`}>
        <NumStepper
          label="Work session"
          hint="Minutes of focused work"
          value={workMin}
          onChange={setWorkMin}
          min={1}
          max={90}
        />
        <NumStepper
          label="Short break"
          hint="Minutes of rest after each session"
          value={breakMin}
          onChange={setBreakMin}
          min={1}
          max={30}
        />
      </div>

      <div className="pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
