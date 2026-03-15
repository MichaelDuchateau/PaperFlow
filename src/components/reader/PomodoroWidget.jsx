import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Constants ──────────────────────────────────────────────────────
const ST = { IDLE: 'idle', RUNNING: 'running', PAUSED: 'paused', BREAK: 'break', BREAK_DONE: 'break_done' };

// ── Helpers ────────────────────────────────────────────────────────
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// ── Circular progress indicator ────────────────────────────────────
function Ring({ progress, size = 32, color = '#6366f1', bg = '#374151' }) {
  const cx   = size / 2;
  const r    = cx - 3;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={bg}    strokeWidth={2.5} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={2.5}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - Math.max(0, Math.min(1, progress)))}
        strokeLinecap="round"
        style={{ transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cx}px`, transition: 'stroke-dashoffset 0.4s linear' }}
      />
    </svg>
  );
}

// ── Settings popover ───────────────────────────────────────────────
function SettingsPopover({ workMin, breakMin, enabled, onSave, onClose }) {
  const [w, setW] = useState(workMin);
  const [b, setB] = useState(breakMin);
  const [en, setEn] = useState(enabled);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const NumInput = ({ label, value, onChange, min = 1, max = 90 }) => (
    <label className="flex items-center justify-between gap-4">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(Math.max(min, value - 1))}
          className="w-5 h-5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 text-xs flex items-center justify-center">−</button>
        <span className="w-8 text-center text-sm font-mono text-gray-200">{value}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))}
          className="w-5 h-5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 text-xs flex items-center justify-center">+</button>
      </div>
    </label>
  );

  return (
    <div ref={ref}
      className="absolute right-0 top-9 z-40 w-52 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-3 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pomodoro Settings</p>

      {/* Enable toggle */}
      <label className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Enable timer</span>
        <button onClick={() => setEn(v => !v)}
          className={`relative w-9 h-5 rounded-full transition-colors ${en ? 'bg-brand-600' : 'bg-gray-700'}`}>
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${en ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </label>

      <div className={`space-y-2 ${!en ? 'opacity-40 pointer-events-none' : ''}`}>
        <NumInput label="Work (min)"  value={w} onChange={setW} />
        <NumInput label="Break (min)" value={b} onChange={setB} />
      </div>

      <button onClick={() => { onSave({ w, b, en }); onClose(); }}
        className="w-full py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs rounded-lg transition-colors">
        Save
      </button>
    </div>
  );
}

// ── Session-end overlay ────────────────────────────────────────────
function SessionEndOverlay({ type, onAction }) {
  // type: 'work' | 'break'
  const isWork = type === 'work';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-xs w-full mx-4 shadow-2xl text-center space-y-4">
        <div className="text-4xl">{isWork ? '🎉' : '⏰'}</div>
        <h2 className="text-lg font-bold text-gray-100">
          {isWork ? 'Pomodoro complete!' : 'Break over!'}
        </h2>
        <p className="text-sm text-gray-400">
          {isWork ? "Time for a well-earned break." : "Ready to focus again?"}
        </p>
        <div className="flex gap-2 justify-center pt-2">
          {isWork && (
            <button onClick={() => onAction('start_break')}
              className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-lg transition-colors font-medium">
              Start Break
            </button>
          )}
          <button onClick={() => onAction(isWork ? 'skip_break' : 'done')}
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors">
            {isWork ? 'Skip Break' : 'Back to Work'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────────
export default function PomodoroWidget({ paperId, settings = {}, onSettingsChange }) {
  const workMin  = settings.pomodoro_work_minutes  ?? 25;
  const breakMin = settings.pomodoro_break_minutes ?? 5;
  const enabled  = settings.pomodoro_enabled       ?? true;

  const workSec  = workMin  * 60;
  const breakSec = breakMin * 60;

  const [timerState, setTimerState] = useState(ST.IDLE);
  const [timeLeft,   setTimeLeft]   = useState(workSec);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayType, setOverlayType] = useState(null); // 'work' | 'break'
  const [showSettings, setShowSettings] = useState(false);

  const startTimeRef   = useRef(null);
  const intervalRef    = useRef(null);

  // ── Reset when settings change ───────────────────────────────
  useEffect(() => {
    if (timerState === ST.IDLE) setTimeLeft(workSec);
  }, [workSec, timerState]);

  // ── Tick ─────────────────────────────────────────────────────
  const stopInterval = () => { clearInterval(intervalRef.current); intervalRef.current = null; };

  useEffect(() => {
    if (timerState !== ST.RUNNING && timerState !== ST.BREAK) { stopInterval(); return; }

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          stopInterval();
          if (timerState === ST.RUNNING) {
            // Work session ended
            const now = new Date().toISOString();
            window.api.pomodoro.log({
              paperId:         paperId || null,
              durationMinutes: workMin,
              startedAt:       startTimeRef.current || now,
              endedAt:         now,
            });
            setTimerState(ST.IDLE);
            setOverlayType('work');
            setShowOverlay(true);
          } else {
            // Break ended
            setTimerState(ST.BREAK_DONE);
            setOverlayType('break');
            setShowOverlay(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return stopInterval;
  }, [timerState, workMin, paperId]);

  // ── Actions ───────────────────────────────────────────────────
  const start = () => {
    if (!enabled) return;
    startTimeRef.current = new Date().toISOString();
    setTimeLeft(workSec);
    setTimerState(ST.RUNNING);
  };

  const pause  = () => setTimerState(ST.PAUSED);
  const resume = () => setTimerState(ST.RUNNING);
  const stop   = () => { setTimerState(ST.IDLE); setTimeLeft(workSec); };

  const handleOverlayAction = (action) => {
    setShowOverlay(false);
    if (action === 'start_break') {
      setTimeLeft(breakSec);
      setTimerState(ST.BREAK);
    } else {
      // skip_break or done — back to idle
      setTimeLeft(workSec);
      setTimerState(ST.IDLE);
    }
  };

  const handleSettingsSave = ({ w, b, en }) => {
    onSettingsChange?.({
      pomodoro_work_minutes:  w,
      pomodoro_break_minutes: b,
      pomodoro_enabled:       en,
    });
  };

  // ── Derived values for display ────────────────────────────────
  const totalSec  = timerState === ST.BREAK ? breakSec : workSec;
  const progress  = totalSec > 0 ? timeLeft / totalSec : 1;
  const ringColor =
    timerState === ST.BREAK   ? '#f59e0b' :
    timerState === ST.PAUSED  ? '#6b7280' :
    timerState === ST.RUNNING ? '#6366f1' : '#4b5563';

  const isRunning = timerState === ST.RUNNING;
  const isPaused  = timerState === ST.PAUSED;
  const isBreak   = timerState === ST.BREAK;
  const isIdle    = timerState === ST.IDLE || timerState === ST.BREAK_DONE;

  if (!enabled && isIdle) {
    return (
      <div className="relative">
        <button onClick={() => setShowSettings(v => !v)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-800/60 border border-gray-700/60 text-xs text-gray-600 hover:text-gray-400 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeWidth={1.5}/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 7v5l3 3"/>
          </svg>
          Pomodoro off
        </button>
        {showSettings && (
          <SettingsPopover workMin={workMin} breakMin={breakMin} enabled={enabled}
            onSave={handleSettingsSave} onClose={() => setShowSettings(false)} />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="relative flex items-center gap-1">
        {/* Ring + time */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-800 border border-gray-700">
          <Ring progress={progress} size={22} color={ringColor} />
          <span className={`text-xs font-mono font-medium tabular-nums ${
            isBreak ? 'text-amber-400' : isRunning ? 'text-brand-300' : 'text-gray-400'
          }`}>
            {fmt(timeLeft)}
          </span>
          {isBreak && <span className="text-xs text-amber-500">Break</span>}
        </div>

        {/* Controls */}
        {isIdle ? (
          <button onClick={start} title="Start Pomodoro"
            className="p-1.5 rounded-md bg-brand-600/20 border border-brand-700/50 text-brand-400 hover:bg-brand-600/30 transition-colors">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        ) : isRunning || isBreak ? (
          <>
            {!isBreak && (
              <button onClick={pause} title="Pause"
                className="p-1.5 rounded-md bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200 transition-colors">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              </button>
            )}
            <button onClick={stop} title="Stop & reset"
              className="p-1.5 rounded-md bg-gray-800 border border-gray-700 text-gray-500 hover:text-red-400 transition-colors">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z"/>
              </svg>
            </button>
          </>
        ) : isPaused ? (
          <>
            <button onClick={resume} title="Resume"
              className="p-1.5 rounded-md bg-brand-600/20 border border-brand-700/50 text-brand-400 hover:bg-brand-600/30 transition-colors">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
            <button onClick={stop} title="Stop & reset"
              className="p-1.5 rounded-md bg-gray-800 border border-gray-700 text-gray-500 hover:text-red-400 transition-colors">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z"/>
              </svg>
            </button>
          </>
        ) : null}

        {/* Settings gear */}
        <button onClick={() => setShowSettings(v => !v)} title="Pomodoro settings"
          className="p-1.5 rounded-md text-gray-600 hover:text-gray-400 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {showSettings && (
          <SettingsPopover workMin={workMin} breakMin={breakMin} enabled={enabled}
            onSave={handleSettingsSave} onClose={() => setShowSettings(false)} />
        )}
      </div>

      {/* Session-end overlay */}
      {showOverlay && (
        <SessionEndOverlay type={overlayType} onAction={handleOverlayAction} />
      )}
    </>
  );
}
