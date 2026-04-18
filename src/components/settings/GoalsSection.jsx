import React, { useState } from 'react';

function NumStepper({ label, hint, value, onChange, min = 0, max = 50 }) {
  return (
    <div className="flex items-center justify-between py-3">
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

export default function GoalsSection({ settings, onSave }) {
  const [weeklyPapers, setWeeklyPapers] = useState(settings.goal_weekly_papers ?? 3);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ goal_weekly_papers: weeklyPapers });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-0 divide-y divide-gray-800/60">
      <NumStepper
        label="Weekly paper goal"
        hint="Papers to finish reading per week"
        value={weeklyPapers}
        onChange={setWeeklyPapers}
        min={0}
        max={20}
      />
      <div className="pt-4">
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
