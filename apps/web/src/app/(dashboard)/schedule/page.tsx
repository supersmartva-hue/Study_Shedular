'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Sparkles, Check, SkipForward, Trash2, Loader2, CalendarDays } from 'lucide-react';
import { api } from '../../../lib/api';
import { useSessionStore } from '../../../store/useSessionStore';
import { useStatsStore } from '../../../store/useStatsStore';
import type { StudySession } from '../../../types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMonday(d: Date) {
  const day  = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon  = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtDate(d: Date) { return d.toISOString().split('T')[0]; }

function fmtDisplay(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SchedulePage() {
  const { sessions, setSessions, updateSession, removeSession, loading, setLoading } = useSessionStore();
  const setStats  = useStatsStore(s => s.setStats);
  const [generating,     setGenerating]     = useState(false);
  const [currentMonday,  setCurrentMonday]  = useState(() => getMonday(new Date()));

  useEffect(() => { fetchWeek(currentMonday); }, [currentMonday]);

  async function fetchWeek(monday: Date) {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/sessions/week?date=${fmtDate(monday)}`);
      setSessions(data.data.sessions, data.data.weekStart);
    } catch { toast.error('Could not load sessions'); }
    finally  { setLoading(false); }
  }

  async function generateSchedule() {
    setGenerating(true);
    try {
      const { data } = await api.post('/api/planning/generate', { weekStartDate: fmtDate(currentMonday) });
      setSessions(data.data.sessions, data.data.weekStart);
      toast.success(`✨ Generated ${data.data.sessions.length} sessions!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Generation failed');
    } finally { setGenerating(false); }
  }

  async function completeSession(id: string) {
    try {
      const { data } = await api.post(`/api/sessions/${id}/complete`);
      updateSession(id, data.data.session);
      if (data.data.stats)         setStats(data.data.stats);
      if (data.data.xpGained > 0)  toast.success(`+${data.data.xpGained} XP earned! 🎯`);
      if (data.data.leveledUp)     toast.success(`Level up! Now level ${data.data.newLevel} 🚀`, { duration: 4000 });
      data.data.newAchievements?.forEach(() => toast.success('Achievement unlocked! 🏆', { duration: 4000 }));
    } catch { toast.error('Could not complete session'); }
  }

  async function skipSession(id: string) {
    try {
      const { data } = await api.post(`/api/sessions/${id}/skip`);
      updateSession(id, data.data);
    } catch { toast.error('Could not skip session'); }
  }

  async function deleteSession(id: string) {
    try {
      await api.delete(`/api/sessions/${id}`);
      removeSession(id);
    } catch { toast.error('Could not delete session'); }
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentMonday, i));
  const todayStr = fmtDate(new Date());
  const byDay    = weekDays.reduce<Record<string, StudySession[]>>((acc, d) => {
    acc[fmtDate(d)] = sessions.filter(s => s.plannedDate.startsWith(fmtDate(d)));
    return acc;
  }, {});

  const pending   = sessions.filter(s => s.status === 'pending').length;
  const completed = sessions.filter(s => s.status === 'completed').length;
  const totalXp   = sessions.filter(s => s.status === 'completed').reduce((s, x) => s + x.xpEarned, 0);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Weekly Schedule</h2>
          <p className="page-sub">
            {fmtDisplay(fmtDate(currentMonday))} – {fmtDisplay(fmtDate(addDays(currentMonday, 6)))}
            {sessions.length > 0 && (
              <span className="ml-2 text-primary-500 font-semibold">{completed}/{pending + completed} done</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonday(m => addDays(m, -7))}
            className="btn btn-secondary p-2">
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <button onClick={() => setCurrentMonday(getMonday(new Date()))}
            className="btn btn-secondary text-xs px-3">
            Today
          </button>
          <button onClick={() => setCurrentMonday(m => addDays(m, 7))}
            className="btn btn-secondary p-2">
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
          <button onClick={generateSchedule} disabled={generating} className="btn btn-primary ml-1">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'Generating…' : 'AI Schedule'}
          </button>
        </div>
      </div>

      {/* Summary row */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="stat-card stat-card-purple">
            <p className="text-2xl font-black text-slate-800">{sessions.length}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Total Sessions</p>
          </div>
          <div className="stat-card stat-card-green">
            <p className="text-2xl font-black text-slate-800">{completed}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Completed</p>
          </div>
          <div className="stat-card stat-card-orange">
            <p className="text-2xl font-black text-slate-800">{totalXp}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">XP Earned</p>
          </div>
        </div>
      )}

      {/* Week grid */}
      {loading ? (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="skeleton h-44 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
          {weekDays.map((day, i) => {
            const key     = fmtDate(day);
            const daySess = byDay[key] || [];
            const isToday = key === todayStr;
            const done    = daySess.filter(s => s.status === 'completed').length;

            return (
              <div key={key}
                className={`rounded-2xl border p-3 min-h-[160px] transition-all duration-200 schedule-day ${
                  isToday
                    ? 'schedule-day-today shadow-sm'
                    : 'border-slate-100 hover:border-slate-200 hover:shadow-card'
                }`}>

                {/* Day header */}
                <div className="flex items-center justify-between mb-2.5">
                  <p className={`text-xs font-bold uppercase tracking-wide ${isToday ? 'text-primary-600' : 'text-slate-400'}`}>
                    {DAYS[i]}
                  </p>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isToday ? 'bg-primary-500 text-white shadow-glow-sm' : 'text-slate-400'
                  }`}>
                    {day.getDate()}
                  </div>
                </div>

                {/* Sessions */}
                {daySess.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 text-slate-300 dark:text-slate-600">
                    <CalendarDays className="w-5 h-5 mb-1 opacity-50" />
                    <p className="text-[10px]">Free</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {daySess.map(s => (
                      <SessionBlock key={s.id} session={s}
                        onComplete={completeSession} onSkip={skipSession} onDelete={deleteSession} />
                    ))}
                    {done > 0 && (
                      <p className="text-[10px] text-center text-slate-400 mt-1">{done}/{daySess.length} done</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && sessions.length === 0 && (
        <div className="empty-state mt-4">
          <Sparkles className="w-10 h-10 mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">No sessions this week</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Add subjects in <strong>Study</strong>, then click <strong>AI Schedule</strong> to auto-generate your week.
          </p>
          <button onClick={generateSchedule} disabled={generating}
            className="btn btn-primary mt-4 text-xs">
            <Sparkles className="w-3.5 h-3.5" /> Generate Now
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Session block ─────────────────────────────────────────────────────────────
function SessionBlock({ session, onComplete, onSkip, onDelete }: {
  session:    StudySession;
  onComplete: (id: string) => void;
  onSkip:     (id: string) => void;
  onDelete:   (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const color = session.studyItem?.color ?? '#6366f1';
  const statusClass = `session-block-${session.status}` as const;

  return (
    <div
      className={`rounded-xl border px-2 py-1.5 text-xs cursor-pointer transition-all duration-150 hover:-translate-y-px ${statusClass}`}
      style={{ borderLeft: `3px solid ${color}` }}
      onClick={() => setOpen(o => !o)}
    >
      <p className="font-semibold leading-tight line-clamp-1 text-[11px]">{session.title}</p>
      <p className="opacity-60 mt-0.5 text-[10px]">{session.startTime} · {session.durationMins}m</p>

      {open && session.status === 'pending' && (
        <div className="flex gap-1 mt-1.5" onClick={e => e.stopPropagation()}>
          <button onClick={() => onComplete(session.id)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-md text-[10px] font-semibold transition-colors">
            <Check className="w-2.5 h-2.5" /> Done
          </button>
          <button onClick={() => onSkip(session.id)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[10px] font-semibold transition-colors">
            <SkipForward className="w-2.5 h-2.5" /> Skip
          </button>
          <button onClick={() => onDelete(session.id)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-md text-[10px] font-semibold transition-colors ml-auto">
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>
      )}

      {session.status === 'completed' && (
        <p className="mt-0.5 font-bold text-[10px]">+{session.xpEarned} XP ✓</p>
      )}
    </div>
  );
}
