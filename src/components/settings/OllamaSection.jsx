import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Helpers ────────────────────────────────────────────────────────
function bytes(n) {
  if (!n) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)} MB`;
  return `${n} B`;
}

function shortDate(iso) {
  return iso ? iso.slice(0, 10) : '—';
}

// ── Status dot ─────────────────────────────────────────────────────
function StatusDot({ running }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${running ? 'bg-emerald-400' : 'bg-red-500'}`} />
  );
}

// ── Inspect drawer ─────────────────────────────────────────────────
function InspectDrawer({ name, onClose }) {
  const [info, setInfo] = useState(null);
  const [err,  setErr]  = useState(null);

  useEffect(() => {
    window.api.ollama.showModel(name)
      .then(setInfo)
      .catch(e => setErr(e.message));
  }, [name]);

  return (
    <div className="mt-3 bg-gray-950 border border-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{name}</span>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-400 text-xs">✕ close</button>
      </div>
      {err && <p className="text-xs text-red-400">{err}</p>}
      {!info && !err && <p className="text-xs text-gray-500">Loading…</p>}
      {info && (
        <div className="space-y-2">
          {info.modelfile && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Modelfile</p>
              <pre className="text-xs text-gray-400 bg-gray-900 rounded p-2 overflow-x-auto max-h-40 whitespace-pre-wrap">{info.modelfile}</pre>
            </div>
          )}
          {info.parameters && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Parameters</p>
              <pre className="text-xs text-gray-400 bg-gray-900 rounded p-2 overflow-x-auto max-h-24 whitespace-pre-wrap">{info.parameters}</pre>
            </div>
          )}
          {info.template && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Template</p>
              <pre className="text-xs text-gray-400 bg-gray-900 rounded p-2 overflow-x-auto max-h-24 whitespace-pre-wrap">{info.template}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Pull form ──────────────────────────────────────────────────────
function PullForm({ onDone }) {
  const [name,      setName]      = useState('');
  const [pulling,   setPulling]   = useState(false);
  const [progress,  setProgress]  = useState(null); // { pct, status, done }
  const [error,     setError]     = useState(null);

  useEffect(() => {
    window.api.ollama.onPullProgress((chunk) => {
      const { status, completed, total } = chunk;
      if (total > 0) {
        setProgress({ pct: completed / total, status, done: status === 'success' });
      } else {
        setProgress(prev => ({ ...prev, pct: prev?.pct ?? 0, status, done: status === 'success' }));
      }
    });
    return () => window.api.ollama.offPullProgress();
  }, []);

  const handlePull = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPulling(true);
    setError(null);
    setProgress({ pct: 0, status: 'Starting…', done: false });
    try {
      await window.api.ollama.pullModel(trimmed);
      setProgress({ pct: 1, status: 'Done!', done: true });
      setName('');
      onDone?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setPulling(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handlePull()}
          placeholder="e.g. llama3.2, mistral, phi3:mini"
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-brand-500 transition-colors"
        />
        <button
          onClick={handlePull}
          disabled={pulling || !name.trim()}
          className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-sm rounded transition-colors"
        >
          {pulling ? 'Pulling…' : 'Pull'}
        </button>
      </div>
      {progress && (
        <div className="space-y-1">
          <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all ${progress.done ? 'bg-emerald-500' : 'bg-brand-500'}`}
              style={{ width: `${Math.round(progress.pct * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">{progress.status}</p>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────
export default function OllamaSection() {
  const [status,        setStatus]        = useState(null);  // { running, version? }
  const [models,        setModels]        = useState([]);
  const [running,       setRunning]       = useState([]);
  const [inspecting,    setInspecting]    = useState(null);  // model name
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [busy,          setBusy]          = useState('');    // 'start' | 'stop' | 'delete' | ''
  const [error,         setError]         = useState(null);
  const pollRef = useRef(null);

  const loadStatus = useCallback(async () => {
    try {
      const s = await window.api.ollama.status();
      setStatus(s);
      if (s.running) {
        const [m, r] = await Promise.all([
          window.api.ollama.listModelsFull().catch(() => []),
          window.api.ollama.listRunning().catch(() => []),
        ]);
        setModels(m);
        setRunning(r);
      } else {
        setModels([]);
        setRunning([]);
      }
    } catch (e) {
      setStatus({ running: false });
    }
  }, []);

  useEffect(() => {
    loadStatus();
    pollRef.current = setInterval(loadStatus, 5000);
    return () => clearInterval(pollRef.current);
  }, [loadStatus]);

  const handleStart = async () => {
    setBusy('start'); setError(null);
    const r = await window.api.ollama.startServer();
    if (!r.ok) setError(r.error ?? 'Could not start Ollama.');
    await loadStatus();
    setBusy('');
  };

  const handleStop = async () => {
    setBusy('stop'); setError(null);
    await window.api.ollama.stopServer();
    await loadStatus();
    setBusy('');
  };

  const handleDelete = async () => {
    if (!deleteTarget || !deleteConfirm) return;
    setBusy('delete'); setError(null);
    try {
      await window.api.ollama.deleteModel(deleteTarget);
    } catch (e) {
      setError(e.message);
    }
    setDeleteTarget(null);
    setDeleteConfirm(false);
    await loadStatus();
    setBusy('');
  };

  const isRunning = status?.running ?? false;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-100 mb-1">Ollama</h2>
        <p className="text-sm text-gray-500">Manage the local Ollama service and models.</p>
      </div>

      {/* ── Server status ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Server</h3>
        <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
          <StatusDot running={isRunning} />
          <span className="text-sm text-gray-200 flex-1">
            {status === null ? 'Checking…' : isRunning ? `Running — v${status.version}` : 'Not running'}
          </span>
          {isRunning ? (
            <button
              onClick={handleStop}
              disabled={busy === 'stop'}
              className="px-3 py-1 text-xs bg-gray-800 hover:bg-red-900/60 border border-gray-700 hover:border-red-700 text-gray-300 hover:text-red-300 rounded transition-colors disabled:opacity-40"
            >
              {busy === 'stop' ? 'Stopping…' : 'Stop'}
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={busy === 'start'}
              className="px-3 py-1 text-xs bg-gray-800 hover:bg-emerald-900/60 border border-gray-700 hover:border-emerald-700 text-gray-300 hover:text-emerald-300 rounded transition-colors disabled:opacity-40"
            >
              {busy === 'start' ? 'Starting…' : 'Start'}
            </button>
          )}
          <button
            onClick={loadStatus}
            title="Refresh"
            className="p-1 text-gray-600 hover:text-gray-400 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </section>

      {/* ── Models in VRAM ────────────────────────────────────────── */}
      {running.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Loaded in VRAM</h3>
          <div className="flex flex-wrap gap-3">
            {running.map(m => (
              <div key={m.name} className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 space-y-0.5 min-w-[160px]">
                <p className="text-xs font-semibold text-gray-200 truncate">{m.name}</p>
                <p className="text-xs text-gray-500">Size: {bytes(m.size)}</p>
                <p className="text-xs text-gray-500">VRAM: {bytes(m.size_vram)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Installed models ──────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          Installed models {models.length > 0 && <span className="text-gray-600 normal-case font-normal">({models.length})</span>}
        </h3>

        {!isRunning && (
          <p className="text-sm text-gray-600">Start Ollama to see installed models.</p>
        )}

        {isRunning && models.length === 0 && (
          <p className="text-sm text-gray-600">No models installed. Pull one below.</p>
        )}

        {models.length > 0 && (
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-900 border-b border-gray-800">
                  {['Name', 'Size', 'Family', 'Params', 'Quant', 'Modified', ''].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {models.map(m => {
                  const d = m.details ?? {};
                  return (
                    <React.Fragment key={m.name}>
                      <tr className="border-b border-gray-800/60 hover:bg-gray-900/40 transition-colors">
                        <td className="px-3 py-2 text-gray-200 font-medium max-w-[180px] truncate">{m.name}</td>
                        <td className="px-3 py-2 text-gray-400">{bytes(m.size)}</td>
                        <td className="px-3 py-2 text-gray-400">{d.family ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-400">{d.parameter_size ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-400">{d.quantization_level ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-500">{shortDate(m.modified_at)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setInspecting(inspecting === m.name ? null : m.name)}
                              className="text-gray-600 hover:text-brand-400 transition-colors text-xs"
                            >inspect</button>
                            <button
                              onClick={() => { setDeleteTarget(m.name); setDeleteConfirm(false); }}
                              className="text-gray-600 hover:text-red-400 transition-colors text-xs"
                            >delete</button>
                          </div>
                        </td>
                      </tr>
                      {inspecting === m.name && (
                        <tr>
                          <td colSpan={7} className="px-3 pb-3">
                            <InspectDrawer name={m.name} onClose={() => setInspecting(null)} />
                          </td>
                        </tr>
                      )}
                      {deleteTarget === m.name && (
                        <tr>
                          <td colSpan={7} className="px-3 pb-3">
                            <div className="flex items-center gap-3 bg-red-950/30 border border-red-800/40 rounded-lg px-4 py-2.5 mt-1">
                              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={deleteConfirm}
                                  onChange={e => setDeleteConfirm(e.target.checked)}
                                  className="accent-red-500"
                                />
                                I confirm I want to delete <strong>{m.name}</strong>
                              </label>
                              <button
                                onClick={handleDelete}
                                disabled={!deleteConfirm || busy === 'delete'}
                                className="px-3 py-1 text-xs bg-red-900/60 hover:bg-red-800 border border-red-700 text-red-300 rounded transition-colors disabled:opacity-40"
                              >
                                {busy === 'delete' ? 'Deleting…' : 'Delete'}
                              </button>
                              <button
                                onClick={() => setDeleteTarget(null)}
                                className="text-gray-600 hover:text-gray-400 text-xs"
                              >cancel</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Pull a model ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Pull a model</h3>
        <p className="text-xs text-gray-600">Enter any model name from <span className="text-brand-400">ollama.com/library</span></p>
        {isRunning
          ? <PullForm onDone={loadStatus} />
          : <p className="text-sm text-gray-600">Start Ollama first to pull models.</p>
        }
      </section>
    </div>
  );
}
