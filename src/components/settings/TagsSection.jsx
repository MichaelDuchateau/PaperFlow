import React, { useState } from 'react';
import TagPill from '../shared/TagPill.jsx';

// Preset palette for quick colour picking
const PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

function ColorDot({ color, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ background: color }}
      className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${selected ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900' : ''}`}
    />
  );
}

function TagRow({ tag, onUpdate, onDelete }) {
  const [editing, setEditing]   = useState(false);
  const [name,    setName]      = useState(tag.name);
  const [color,   setColor]     = useState(tag.color);
  const [saving,  setSaving]    = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onUpdate({ ...tag, name: name.trim(), color });
    setSaving(false);
    setEditing(false);
  };

  const cancel = () => {
    setName(tag.name);
    setColor(tag.color);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-800/60 group">
        <TagPill tag={tag} />
        <span className="flex-1" />
        <button
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover:opacity-100 text-xs text-gray-500 hover:text-gray-300 transition-all"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(tag.id)}
          className="opacity-0 group-hover:opacity-100 text-xs text-red-600 hover:text-red-400 transition-all ml-2"
        >
          Delete
        </button>
      </div>
    );
  }

  return (
    <div className="py-2 px-3 bg-gray-800/60 rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
          className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
        />
        <button onClick={save} disabled={saving}
          className="px-2 py-1 bg-brand-600 hover:bg-brand-500 text-white text-xs rounded transition-colors disabled:opacity-50">
          {saving ? '…' : 'Save'}
        </button>
        <button onClick={cancel}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-400 text-xs rounded transition-colors">
          Cancel
        </button>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {PALETTE.map(c => (
          <ColorDot key={c} color={c} selected={color === c} onClick={() => setColor(c)} />
        ))}
        <input
          type="color"
          value={color}
          onChange={e => setColor(e.target.value)}
          className="w-5 h-5 rounded-full cursor-pointer bg-transparent border-0 p-0"
          title="Custom colour"
        />
      </div>
      <div className="text-xs text-gray-500">Preview: <TagPill tag={{ ...tag, name, color }} /></div>
    </div>
  );
}

export default function TagsSection({ tags, onRefresh }) {
  const [newName,  setNewName]  = useState('');
  const [newColor, setNewColor] = useState(PALETTE[0]);
  const [adding,   setAdding]   = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    await window.api.tags.add({ name: newName.trim(), color: newColor });
    setNewName('');
    setNewColor(PALETTE[0]);
    setAdding(false);
    onRefresh();
  };

  const handleUpdate = async (tag) => {
    await window.api.tags.update(tag);
    onRefresh();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this tag? It will be removed from all papers.')) return;
    await window.api.tags.delete(id);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Existing tags */}
      {tags.length === 0 ? (
        <p className="text-sm text-gray-600 italic">No tags yet. Add one below.</p>
      ) : (
        <div className="space-y-0.5">
          {tags.map(tag => (
            <TagRow key={tag.id} tag={tag} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Add new tag */}
      <div className="pt-2 border-t border-gray-800">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Add tag</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="Tag name"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <div className="flex gap-1">
            {PALETTE.slice(0, 6).map(c => (
              <ColorDot key={c} color={c} selected={newColor === c} onClick={() => setNewColor(c)} />
            ))}
            <input
              type="color"
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
              className="w-5 h-5 rounded-full cursor-pointer bg-transparent border-0 p-0"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-sm rounded-lg transition-colors flex-shrink-0"
          >
            {adding ? '…' : '+ Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
