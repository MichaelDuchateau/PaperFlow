import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

// ── Mini progress bar ──────────────────────────────────────────────
function ProgressBar({ value, max, color = '#6366f1', label, sublabel }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-300 font-medium">{label}</span>
        <span className="text-gray-500">{value} / {max}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {sublabel && <p className="text-xs text-gray-600">{sublabel}</p>}
    </div>
  );
}

// ── Pie chart tooltip ─────────────────────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200">
      {name}: <span className="font-medium">{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function DashboardPanel({
  papers = [],
  tags   = [],
  settings = {},
  pomodoroStats = { today: 0, total: 0 },
  toThinkItems  = [],
}) {
  const navigate = useNavigate();

  // ── Derived data ────────────────────────────────────────────────
  const dailyPomGoal  = settings.daily_pomodoro_goal  ?? 4;
  const weeklyPaperGoal = settings.weekly_paper_goal  ?? 3;

  // Papers read this week (status === 'done', added within last 7 days)
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];
  const papersThisWeek = papers.filter(
    p => p.status === 'done' && p.added_at >= oneWeekAgo
  ).length;

  // Tag distribution: count papers per tag
  const tagMap = Object.fromEntries(tags.map(t => [t.id, t]));
  const tagCounts = {};
  for (const paper of papers) {
    let ids = [];
    try { ids = JSON.parse(paper.tags || '[]'); } catch { /* */ }
    for (const id of ids) {
      tagCounts[id] = (tagCounts[id] ?? 0) + 1;
    }
  }
  const pieData = tags
    .filter(t => tagCounts[t.id])
    .map(t => ({ name: t.name, value: tagCounts[t.id], color: t.color }));

  // ── Render ──────────────────────────────────────────────────────
  return (
    <aside className="w-64 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-lg font-bold text-brand-400 tracking-tight">PaperFlow</h1>
        <p className="text-xs text-gray-600 mt-0.5">{papers.length} paper{papers.length !== 1 ? 's' : ''} total</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
        {/* Pomodoro progress */}
        <section>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Today</p>
          <ProgressBar
            label="Pomodoros"
            value={pomodoroStats.today}
            max={dailyPomGoal}
            color="#f59e0b"
            sublabel={pomodoroStats.today >= dailyPomGoal ? '🎉 Goal reached!' : undefined}
          />
        </section>

        {/* Papers progress */}
        <section>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">This Week</p>
          <ProgressBar
            label="Papers done"
            value={papersThisWeek}
            max={weeklyPaperGoal}
            color="#10b981"
          />
        </section>

        {/* Tags pie chart */}
        {pieData.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">By Tag</p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={52}
                    paddingAngle={2}
                  >
                    {pieData.map(entry => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-1.5 mt-1">
              {pieData.map(entry => (
                <span key={entry.name} className="flex items-center gap-1 text-xs text-gray-400">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                  {entry.name} ({entry.value})
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ToThink list */}
        {toThinkItems.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">To Think</p>
            <ul className="space-y-2">
              {toThinkItems.map((item, i) => (
                <li key={i} className="group">
                  <button
                    onClick={() => navigate(`/reader/${item.paperId}`)}
                    className="text-left w-full"
                  >
                    <p className="text-xs text-gray-300 group-hover:text-white leading-snug">{item.text}</p>
                    <p className="text-xs text-gray-600 mt-0.5 truncate">{item.paperTitle}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Settings button */}
      <div className="px-4 py-3 border-t border-gray-800">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors w-full"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
      </div>
    </aside>
  );
}
