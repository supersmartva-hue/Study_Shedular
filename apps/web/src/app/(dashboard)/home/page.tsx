'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  CheckSquare, BookOpen, Bot, Search, Flame, Zap,
  Plus, CalendarDays, Check, SkipForward, ArrowRight, Sparkles,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/useAuthStore';
import type { Task, StudySession, StudyItem, UserStats } from '../../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayISO() { return new Date().toISOString().split('T')[0]; }

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ h = 'h-20', rounded = 'rounded-2xl' }: { h?: string; rounded?: string }) {
  return <div className={`skeleton ${h} ${rounded}`} />;
}

// ── Home page ─────────────────────────────────────────────────────────────────
interface PageData {
  tasks:      Task[];
  sessions:   StudySession[];
  studyItems: StudyItem[];
  stats:      UserStats | null;
  loading:    boolean;
}

export default function HomePage() {
  const user = useAuthStore(s => s.user);
  const [d, setD] = useState<PageData>({ tasks: [], sessions: [], studyItems: [], stats: null, loading: true });

  useEffect(() => {
    const today = todayISO();
    Promise.all([
      api.get('/api/tasks'),
      api.get(`/api/sessions/week?date=${today}`),
      api.get('/api/study'),
      api.get('/api/stats'),
    ]).then(([tR, sR, stR, statR]) => {
      setD({
        tasks:      tR.data.data    ?? [],
        sessions:   sR.data.data?.sessions ?? [],
        studyItems: stR.data.data   ?? [],
        stats:      statR.data.data ?? null,
        loading:    false,
      });
    }).catch(() => {
      setD(prev => ({ ...prev, loading: false }));
      toast.error('Could not load dashboard');
    });
  }, []);

  async function completeSession(id: string) {
    try {
      const { data } = await api.post(`/api/sessions/${id}/complete`);
      setD(prev => ({
        ...prev,
        sessions: prev.sessions.map(s => s.id === id ? data.data.session : s),
        stats:    data.data.stats ?? prev.stats,
      }));
      if (data.data.xpGained > 0) toast.success(`+${data.data.xpGained} XP! 🎯`);
    } catch { toast.error('Could not complete session'); }
  }

  async function skipSession(id: string) {
    try {
      const { data } = await api.post(`/api/sessions/${id}/skip`);
      setD(prev => ({ ...prev, sessions: prev.sessions.map(s => s.id === id ? data.data : s) }));
    } catch { toast.error('Could not skip session'); }
  }

  async function toggleTask(id: string) {
    const task = d.tasks.find(t => t.id === id);
    if (!task) return;
    try {
      const { data } = task.status === 'done'
        ? await api.patch(`/api/tasks/${id}`, { status: 'pending' })
        : await api.post(`/api/tasks/${id}/complete`);
      setD(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === id ? data.data : t) }));
    } catch { toast.error('Could not update task'); }
  }

  const today         = todayISO();
  const todaySessions = d.sessions.filter(s => s.plannedDate.startsWith(today));
  const todayTasks    = d.tasks.filter(t => t.dueDate?.startsWith(today));
  const pendingSess   = todaySessions.filter(s => s.status === 'pending').length;
  const doneSess      = todaySessions.filter(s => s.status === 'completed').length;
  const pendingTasks  = todayTasks.filter(t => t.status !== 'done').length;
  const doneTasks     = todayTasks.filter(t => t.status === 'done').length;
  const sortedItems   = [...d.studyItems]
    .sort((a, b) => b.priorityPct - a.priorityPct)
    .slice(0, 5);
  const xpPct = d.stats && d.stats.xpRange > 0
    ? Math.round((d.stats.xpProgress / d.stats.xpRange) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-6">

      {/* ── Greeting ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 leading-tight">
            {greeting()}, {user?.name?.split(' ')[0] ?? 'there'}!
          </h2>
          <p className="text-sm text-slate-400 mt-1">{fmtDate(new Date())} · Here's your overview</p>
        </div>
        <Link href="/tasks" className="btn btn-primary hidden sm:flex">
          <Plus className="w-4 h-4" /> New Task
        </Link>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────────── */}
      {d.loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} h="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Tasks Today */}
          <Link href="/tasks" className="stat-card stat-card-blue group hover:-translate-y-0.5 transition-transform cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <CheckSquare className="w-4 h-4 text-blue-500" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 transition-colors" />
            </div>
            <p className="text-2xl font-black text-slate-800">{pendingTasks}</p>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">Tasks Due Today</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {doneTasks > 0 ? `${doneTasks} already done` : 'none completed yet'}
            </p>
          </Link>

          {/* Sessions Today */}
          <Link href="/schedule" className="stat-card stat-card-purple group hover:-translate-y-0.5 transition-transform cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-violet-500" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-violet-400 transition-colors" />
            </div>
            <p className="text-2xl font-black text-slate-800">{pendingSess}</p>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">Sessions Today</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {doneSess > 0 ? `${doneSess} completed` : 'none done yet'}
            </p>
          </Link>

          {/* Streak */}
          <Link href="/progress" className="stat-card stat-card-orange group hover:-translate-y-0.5 transition-transform cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Flame className="w-4 h-4 text-amber-500" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-400 transition-colors" />
            </div>
            <p className="text-2xl font-black text-slate-800">
              {d.stats?.streak ?? 0}
              {(d.stats?.streak ?? 0) > 0 && <span className="text-base ml-1">🔥</span>}
            </p>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">Day Streak</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Best: {d.stats?.longestStreak ?? 0} days
            </p>
          </Link>

          {/* Level / XP */}
          <Link href="/progress" className="stat-card stat-card-purple group hover:-translate-y-0.5 transition-transform cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-500" />
              </div>
              <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                Lv.{d.stats?.level ?? 1}
              </span>
            </div>
            <p className="text-2xl font-black text-slate-800">{(d.stats?.xp ?? 0).toLocaleString()} XP</p>
            <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${xpPct}%`, background: 'linear-gradient(90deg,#818cf8,#6366f1)' }} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{xpPct}% to next level</p>
          </Link>
        </div>
      )}

      {/* ── Today's Focus ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Sessions column */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
                <CalendarDays className="w-3.5 h-3.5 text-violet-500" />
              </div>
              <span className="text-sm font-bold text-slate-800">Today's Sessions</span>
            </div>
            <Link href="/schedule" className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1">
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-4 space-y-2.5">
            {d.loading ? (
              <><Skeleton h="h-16" /><Skeleton h="h-16" /></>
            ) : todaySessions.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-25" />
                <p className="text-xs font-medium">No sessions scheduled today</p>
                <Link href="/schedule" className="text-xs text-primary-500 hover:underline mt-1 inline-block">
                  Generate weekly schedule →
                </Link>
              </div>
            ) : (
              todaySessions.slice(0, 5).map(s => {
                const color = s.studyItem?.color ?? '#6366f1';
                return (
                  <div key={s.id}
                    className={`rounded-xl border px-4 py-3 transition-all duration-150 session-block-${s.status} ${
                      s.status === 'completed' ? 'opacity-75' : s.status === 'skipped' ? 'opacity-60' : ''
                    }`}
                    style={{ borderLeft: `3px solid ${color}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{s.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {s.startTime} – {s.endTime} · {s.durationMins} min
                        </p>
                      </div>
                      {s.status === 'completed' && (
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0">
                          +{s.xpEarned} XP ✓
                        </span>
                      )}
                      {s.status === 'skipped' && (
                        <span className="text-[10px] text-slate-400 flex-shrink-0">Skipped</span>
                      )}
                    </div>
                    {s.status === 'pending' && (
                      <div className="flex gap-1.5 mt-2">
                        <button onClick={() => completeSession(s.id)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-[11px] font-semibold transition-colors">
                          <Check className="w-3 h-3" /> Done
                        </button>
                        <button onClick={() => skipSession(s.id)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-semibold transition-colors">
                          <SkipForward className="w-3 h-3" /> Skip
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Tasks column */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <span className="text-sm font-bold text-slate-800">Due Today</span>
            </div>
            <Link href="/tasks" className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1">
              All Tasks <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="p-4 space-y-2">
            {d.loading ? (
              <><Skeleton h="h-14" /><Skeleton h="h-14" /><Skeleton h="h-14" /></>
            ) : todayTasks.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-25" />
                <p className="text-xs font-medium">No tasks due today</p>
                <Link href="/tasks" className="text-xs text-primary-500 hover:underline mt-1 inline-block">
                  Add a task →
                </Link>
              </div>
            ) : (
              todayTasks.slice(0, 6).map(t => {
                const PRIORITY_COLOR = { 1: '#10b981', 2: '#f59e0b', 3: '#ef4444' };
                const SOURCE_ICON: Record<string, string> = { study: '📚', study_sync: '📚', extension: '🔗', manual: '✏️' };
                const done = t.status === 'done';
                return (
                  <div key={t.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-150 cursor-pointer hover:bg-slate-50 ${
                      done ? 'opacity-50 border-slate-100' : 'border-slate-100 hover:border-slate-200'
                    }`}
                    onClick={() => toggleTask(t.id)}>
                    <div className={`w-4 h-4 mt-0.5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      done
                        ? 'bg-primary-500 border-primary-500'
                        : 'border-slate-300 hover:border-primary-400'
                    }`}>
                      {done && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-tight ${done ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {t.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px]">{SOURCE_ICON[t.source] ?? '✏️'}</span>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: PRIORITY_COLOR[t.priority] ?? '#94a3b8' }} />
                        <span className="text-[10px] text-slate-400">
                          {t.priority === 1 ? 'Low' : t.priority === 2 ? 'Medium' : 'High'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Study Progress ─────────────────────────────────────────────────────── */}
      {(d.loading || sortedItems.length > 0) && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <span className="text-sm font-bold text-slate-800">Study Progress</span>
            </div>
            <Link href="/study" className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1">
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {d.loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} h="h-10" rounded="rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedItems.map(item => {
                const pct = item.estimatedHours > 0
                  ? Math.round((item.hoursCompleted / item.estimatedHours) * 100) : 0;
                return (
                  <Link key={item.id} href={`/study/${item.id}`} className="flex items-center gap-3 group">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-700 truncate group-hover:text-primary-600 transition-colors">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-2 flex-shrink-0">
                          {item.hoursCompleted.toFixed(1)}h / {item.estimatedHours}h
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: item.color }} />
                      </div>
                    </div>
                    <span className="text-xs font-bold w-9 text-right flex-shrink-0"
                      style={{ color: item.color }}>{pct}%</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Quick Actions ──────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {[
            { href: '/tasks',    icon: <CheckSquare className="w-5 h-5" />, label: '+ Task',    color: '#60a5fa', bg: '#eff6ff' },
            { href: '/study',    icon: <BookOpen    className="w-5 h-5" />, label: 'Study Item', color: '#34d399', bg: '#f0fdf4' },
            { href: '/ai',       icon: <Bot         className="w-5 h-5" />, label: 'AI Chat',    color: '#f472b6', bg: '#fdf4ff' },
            { href: '/search',   icon: <Search      className="w-5 h-5" />, label: 'Search',     color: '#38bdf8', bg: '#f0f9ff' },
            { href: '/schedule', icon: <Sparkles    className="w-5 h-5" />, label: 'Schedule',   color: '#a78bfa', bg: '#faf5ff' },
          ].map(({ href, icon, label, color, bg }) => (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-100 hover:-translate-y-0.5 transition-all duration-150 group"
              style={{ background: bg }}>
              <div style={{ color }}>{icon}</div>
              <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Extension capture notice ──────────────────────────────────────────── */}
      <div className="extension-banner">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-sm flex-shrink-0">🔗</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">Browser Extension</p>
            <p className="text-xs text-slate-500 truncate">Capture tasks from any website directly into your To-Do list</p>
          </div>
        </div>
        <Link href="/settings" className="text-xs text-primary-600 font-semibold hover:underline flex-shrink-0">
          Setup →
        </Link>
      </div>

    </div>
  );
}
