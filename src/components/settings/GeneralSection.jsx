import React, { useState } from 'react';

function Field({ label, hint, children }) {
  return (
    <div className="flex items-start gap-6">
      <div className="w-48 flex-shrink-0 pt-0.5">
        <p className="text-sm font-medium text-gray-200">{label}</p>
        {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export default function GeneralSection({ settings, onSave }) {
  const [name,       setName]       = useState(settings.reviewer_name    ?? '');
  const [dataDir,    setDataDir]    = useState(settings.data_dir         ?? '');
  const [splitDir,   setSplitDir]   = useState(settings.split_direction  ?? 'horizontal');
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);

  const handlePickDir = async () => {
    const chosen = await window.api.dialog.openDirectory();
    if (chosen) setDataDir(chosen);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      reviewer_name:   name,
      data_dir:        dataDir,
      split_direction: splitDir,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Field label="Reviewer name" hint="Used in note YAML frontmatter">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Alice Smith"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
        />
      </Field>

      <Field label="Data folder" hint="Where PDFs, notes, and exports are stored">
        <div className="flex gap-2">
          <input
            type="text"
            value={dataDir}
            onChange={e => setDataDir(e.target.value)}
            placeholder="Default: app data folder"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <button
            onClick={handlePickDir}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 text-sm rounded-lg transition-colors flex-shrink-0"
          >
            Browse…
          </button>
        </div>
      </Field>

      <Field label="Reader split" hint="Default panel layout in the reader">
        <div className="flex gap-2">
          {[
            { value: 'horizontal', label: 'Side by side' },
            { value: 'vertical',   label: 'Stacked' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setSplitDir(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                splitDir === opt.value
                  ? 'bg-brand-600 border-brand-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Field>

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
