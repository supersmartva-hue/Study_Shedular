'use client';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { Flame, Star, Zap, Clock, BookOpen, Trophy, TrendingUp } from 'lucide-react';
import { api } from '../../../lib/api';
import { useStatsStore } from '../../../store/useStatsStore';

export default function ProgressPage() {
  const { stats, loading, setStats, setLoading } = useStatsStore();

  useEffect(() => { fetchStats(); }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const { data } = await api.get('/api/stats');
      setStats(data.data);
    } catch { toast.error('Could not load stats'); }
    finally  { setLoading(false); }
  }

  if (loading || !stats) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        {[1,2,3].map(i => <div key={i} className="skeleton h-32" />)}
      </div>
    );
  }

  const pct          = stats.xpRange > 0 ? Math.round((stats.xpProgress / stats.xpRange) * 100) : 0;
  const hoursStudied = Math.round(stats.totalMinutes / 60 * 10) / 10;
  const earnedCount  = stats.achievements.filter(a => a.earned).length;

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">

      {/* ── Level + XP hero card ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#9333ea 100%)' }}>
        {/* Background decoration */}
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle,#fff,transparent)' }} />
        <div className="absolute -left-8 -bottom-8 w-36 h-36 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle,#fff,transparent)' }} />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">Current Level</p>
              <div className="flex items-end gap-3">
                <p className="text-6xl font-black leading-none">{stats.level}</p>
                <div className="mb-1">
                  <p className="text-white/80 text-sm font-semibold">Level {stats.level}</p>
                  <p className="text-white/50 text-xs">→ Level {stats.level + 1}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">Total XP</p>
              <p className="text-4xl font-black">{stats.xp.toLocaleString()}</p>
            </div>
          </div>

          {/* XP bar */}
          <div>
            <div className="flex justify-between text-xs text-white/60 mb-2 font-medium">
              <span>{stats.xpProgress} XP earned</span>
              <span>{stats.xpRange - stats.xpProgress} XP to next level</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: 'linear-gradient(90deg,rgba(255,255,255,0.7),#fff)' }} />
            </div>
            <p className="text-right text-xs text-white/50 mt-1">{pct}%</p>
          </div>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            icon: Flame, label: 'Day Streak', value: stats.streak,
            sub: `Best: ${stats.longestStreak} days`,
            suffix: stats.streak > 0 ? '🔥' : '',
            color: '#f59e0b', iconBg: 'rgba(245,158,11,0.15)', theme: 'stat-card-amber',
          },
          {
            icon: Zap, label: 'Sessions Done', value: stats.totalSessions,
            sub: 'all time',
            suffix: '',
            color: '#6366f1', iconBg: 'rgba(99,102,241,0.15)', theme: 'stat-card-indigo',
          },
          {
            icon: Clock, label: 'Hours Studied', value: `${hoursStudied}h`,
            sub: 'total',
            suffix: '',
            color: '#10b981', iconBg: 'rgba(16,185,129,0.15)', theme: 'stat-card-green2',
          },
          {
            icon: Star, label: 'Achievements', value: `${earnedCount}/${stats.achievements.length}`,
            sub: 'unlocked',
            suffix: earnedCount === stats.achievements.length ? ' 🏆' : '',
            color: '#ec4899', iconBg: 'rgba(236,72,153,0.15)', theme: 'stat-card-pink',
          },
        ].map(({ icon: Icon, label, value, sub, suffix, color, iconBg, theme }) => (
          <div key={label} className={`stat-card-themed ${theme}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: iconBg }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <TrendingUp className="w-3 h-3 text-slate-300" />
            </div>
            <p className="text-2xl font-black text-slate-800">
              {value}{suffix}
            </p>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">{label}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Achievements ────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" /> Achievements
          </h3>
          <span className="text-xs text-slate-400">{earnedCount} of {stats.achievements.length} unlocked</span>
        </div>

        {/* Progress */}
        <div className="h-1.5 rounded-full mb-4 overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${stats.achievements.length > 0 ? (earnedCount / stats.achievements.length) * 100 : 0}%`,
              background: 'linear-gradient(90deg,#fbbf24,#f59e0b)' }} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {stats.achievements.map(a => (
            <div key={a.id}
              className={`flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200 ${
                a.earned
                  ? 'bg-white border-slate-100 shadow-card hover:-translate-y-0.5'
                  : 'bg-slate-50 border-slate-100 opacity-50 grayscale'
              }`}>
              <span className="text-2xl flex-shrink-0">{a.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-semibold ${a.earned ? 'text-slate-800' : 'text-slate-500'}`}>
                    {a.label}
                  </p>
                  {a.earned && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                      ✓ Earned
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {stats.totalSessions === 0 && (
        <div className="empty-state">
          <BookOpen className="w-10 h-10 mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">No sessions yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Head to <strong>Schedule</strong>, generate a weekly plan, and complete sessions to earn XP and achievements!
          </p>
        </div>
      )}
    </div>
  );
}
