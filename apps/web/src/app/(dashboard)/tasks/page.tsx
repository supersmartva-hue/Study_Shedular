'use client';
import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, Calendar, Check, Loader2,
  CheckSquare, Tag, Clock,
} from 'lucide-react';
import TaskForm from '../../../components/tasks/TaskForm';
import { api } from '../../../lib/api';
import { useTaskStore } from '../../../store/useTaskStore';
import type { Task } from '../../../types';

// ── Constants ─────────────────────────────────────────────────────────────────
type TFilter = 'all' | 'today' | 'upcoming' | 'active' | 'done';

const SOURCE_ICON:  Record<string, string> = { study: '📚', study_sync: '📚', extension: '🔗', manual: '✏️' };
const SOURCE_LABEL: Record<string, string> = { study: 'Study', study_sync: 'Study', extension: 'Extension', manual: 'Manual' };

const PRIORITY_CLR: Record<number, string> = { 1: '#10b981', 2: '#f59e0b', 3: '#ef4444' };
const PRIORITY_LBL: Record<number, string> = { 1: 'Low', 2: 'Medium', 3: 'High' };
const PRIORITY_CLS: Record<number, string> = {
  1: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  2: 'bg-amber-50   text-amber-600   border border-amber-100',
  3: 'bg-red-50     text-red-600     border border-red-100',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().split('T')[0]; }

function fmtDue(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function taskOverdue(t: Task) {
  if (!t.dueDate || t.status === 'done') return false;
  const d = new Date(t.dueDate);
  const now = new Date();
  return d < now && !t.dueDate.startsWith(todayStr());
}

function taskIsToday(t: Task)    { return !!t.dueDate?.startsWith(todayStr()); }
function taskUpcoming(t: Task)   {
  if (!t.dueDate || t.status === 'done') return false;
  return new Date(t.dueDate) > new Date() && !taskIsToday(t);
}

// ── TaskCard ──────────────────────────────────────────────────────────────────
function TaskCard({ task, onToggle, onEdit, onDelete }: {
  task:     Task;
  onToggle: (id: string) => void;
  onEdit:   (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const done    = task.status === 'done';
  const overdue = taskOverdue(task);
  const today   = taskIsToday(task);

  return (
    <div className={`group flex items-start gap-3 card p-4 transition-all duration-150 ${
      done ? 'opacity-60' : 'hover:shadow-sm'
    }`}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className={`w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all duration-150 ${
          done
            ? 'bg-primary-500 border-primary-500'
            : 'border-slate-300 hover:border-primary-400 hover:bg-primary-50'
        }`}
      >
        {done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </button>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2.5">
          {/* Priority accent */}
          <div className="w-0.5 self-stretch rounded-full flex-shrink-0 mt-0.5"
            style={{ background: done ? '#e2e8f0' : PRIORITY_CLR[task.priority] }} />

          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium leading-snug ${done ? 'line-through text-slate-400' : 'text-slate-800'}`}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 leading-relaxed">{task.description}</p>
            )}

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {/* Source */}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 border border-slate-100 text-slate-500">
                {SOURCE_ICON[task.source] ?? '✏️'} {SOURCE_LABEL[task.source] ?? 'Manual'}
              </span>
              {/* Priority */}
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${PRIORITY_CLS[task.priority]}`}>
                {PRIORITY_LBL[task.priority]}
              </span>
              {/* Due date */}
              {task.dueDate && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${
                  overdue
                    ? 'bg-red-50 text-red-500 border-red-100'
                    : today
                      ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                      : 'bg-slate-50 text-slate-500 border-slate-100'
                }`}>
                  <Calendar className="w-2.5 h-2.5" />
                  {overdue ? 'Overdue · ' : today ? 'Today · ' : ''}
                  {fmtDue(task.dueDate)}
                </span>
              )}
              {/* Tags */}
              {task.tags.slice(0, 2).map(tag => (
                <span key={tag}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-violet-50 text-violet-600 border border-violet-100">
                  <Tag className="w-2 h-2" />#{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions — appear on hover */}
      <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button onClick={() => onEdit(task.id)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDelete(task.id)}
          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TasksDashboard() {
  const { tasks, setTasks, addTask, updateTask, removeTask, loading, setLoading } = useTaskStore();

  const [filter,        setFilter]        = useState<TFilter>('all');
  const [showForm,      setShowForm]      = useState(false);
  const [editing,       setEditing]       = useState<Task | null>(null);
  const [quickTitle,    setQuickTitle]    = useState('');
  const [quickPriority, setQuickPriority] = useState<1 | 2 | 3>(2);
  const [quickDate,     setQuickDate]     = useState('');
  const [adding,        setAdding]        = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchTasks(); }, []);

  async function fetchTasks() {
    setLoading(true);
    try {
      const { data } = await api.get('/api/tasks');
      setTasks(data.data);
    } catch { toast.error('Failed to load tasks'); }
    finally  { setLoading(false); }
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTitle.trim()) { inputRef.current?.focus(); return; }
    setAdding(true);
    try {
      const { data } = await api.post('/api/tasks', {
        title:    quickTitle.trim(),
        priority: quickPriority,
        dueDate:  quickDate ? new Date(quickDate + 'T23:59:00').toISOString() : undefined,
      });
      addTask(data.data);
      setQuickTitle('');
      setQuickDate('');
      inputRef.current?.focus();
    } catch { toast.error('Failed to add task'); }
    finally  { setAdding(false); }
  }

  async function handleToggle(id: string) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    try {
      const { data } = task.status === 'done'
        ? await api.patch(`/api/tasks/${id}`, { status: 'pending' })
        : await api.post(`/api/tasks/${id}/complete`);
      updateTask(id, data.data);
    } catch { toast.error('Could not update task'); }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/api/tasks/${id}`);
      removeTask(id);
    } catch { toast.error('Could not delete task'); }
  }

  async function handleClearDone() {
    const done = tasks.filter(t => t.status === 'done');
    try {
      await Promise.all(done.map(t => api.delete(`/api/tasks/${t.id}`)));
      setTasks(tasks.filter(t => t.status !== 'done'));
      toast.success(`Cleared ${done.length} completed task${done.length !== 1 ? 's' : ''}`);
    } catch { toast.error('Could not clear completed tasks'); }
  }

  async function handleCreate(payload: Partial<Task>) {
    try {
      const { data } = await api.post('/api/tasks', payload);
      addTask(data.data);
      toast.success('Task created!');
    } catch { toast.error('Failed to create task'); }
  }

  async function handleUpdate(payload: Partial<Task>) {
    if (!editing) return;
    try {
      const { data } = await api.patch(`/api/tasks/${editing.id}`, payload);
      updateTask(editing.id, data.data);
      setEditing(null);
      toast.success('Task updated!');
    } catch { toast.error('Failed to update task'); }
  }

  function openEdit(id: string) {
    const task = tasks.find(t => t.id === id);
    if (task) { setEditing(task); setShowForm(true); }
  }

  // ── Filter counts ──────────────────────────────────────────────────────────
  const today = todayStr();
  const counts: Record<TFilter, number> = {
    all:      tasks.length,
    today:    tasks.filter(taskIsToday).length,
    upcoming: tasks.filter(taskUpcoming).length,
    active:   tasks.filter(t => t.status !== 'done').length,
    done:     tasks.filter(t => t.status === 'done').length,
  };

  const filtered = tasks.filter(t => {
    switch (filter) {
      case 'today':    return taskIsToday(t);
      case 'upcoming': return taskUpcoming(t);
      case 'active':   return t.status !== 'done';
      case 'done':     return t.status === 'done';
      default:         return true;
    }
  });

  const donePct = tasks.length > 0 ? Math.round((counts.done / tasks.length) * 100) : 0;

  const FILTERS: { key: TFilter; label: string }[] = [
    { key: 'all',      label: 'All'      },
    { key: 'today',    label: 'Today'    },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'active',   label: 'Active'   },
    { key: 'done',     label: 'Done'     },
  ];

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h2 className="page-title">My Tasks</h2>
          <p className="page-sub">
            {counts.active} active · {counts.done} completed
            {tasks.length > 0 && <span className="ml-2 text-primary-500 font-semibold">{donePct}% done</span>}
          </p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn btn-primary">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* ── Quick-add ─────────────────────────────────────────────────────────── */}
      <form onSubmit={handleQuickAdd}
        className="card p-4 mb-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            placeholder="Quick add a task and press Enter…"
            className="input flex-1 text-sm"
          />
          {/* Priority mini-buttons */}
          <div className="flex gap-1">
            {([1, 2, 3] as const).map(p => (
              <button key={p} type="button" onClick={() => setQuickPriority(p)}
                title={PRIORITY_LBL[p]}
                className="w-8 h-[38px] rounded-lg border text-xs font-bold transition-all duration-150"
                style={quickPriority === p
                  ? { background: PRIORITY_CLR[p], color: '#fff', border: `2px solid ${PRIORITY_CLR[p]}` }
                  : { background: '#fff', color: '#94a3b8', borderColor: '#e2e8f0' }
                }>
                {p === 1 ? 'L' : p === 2 ? 'M' : 'H'}
              </button>
            ))}
          </div>
          {/* Optional due date */}
          <input
            type="date"
            value={quickDate}
            onChange={e => setQuickDate(e.target.value)}
            min={today}
            className="input w-36 text-xs hidden sm:block"
          />
          <button type="submit" disabled={!quickTitle.trim() || adding}
            className="btn btn-primary px-4">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>

        {/* Completion progress bar */}
        {tasks.length > 0 && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${donePct}%`, background: 'linear-gradient(90deg,#818cf8,#6366f1)' }} />
            </div>
            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
              {counts.done}/{tasks.length} done
            </span>
          </div>
        )}
      </form>

      {/* ── Filter tabs ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border rounded-xl p-1 mb-4 overflow-x-auto" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        {FILTERS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`flex items-center gap-1.5 flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap min-w-fit ${
              filter === key ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
            style={filter === key ? { background: 'linear-gradient(135deg,#818cf8,#6366f1)' } : {}}>
            {label}
            {counts[key] > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                filter === key ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
              }`}>{counts[key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Task list ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2.5">
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <CheckSquare className="w-10 h-10 mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">
            {filter === 'all' ? 'No tasks yet' : `No ${filter} tasks`}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs text-center leading-relaxed">
            {filter === 'all'
              ? 'Type above to quick-add, or click "New Task" for full details.'
              : filter === 'today'
                ? 'No tasks are due today. Great job staying on top of things!'
                : filter === 'done'
                  ? 'Complete some tasks to see them here.'
                  : ''}
          </p>
          {filter === 'all' && (
            <button onClick={() => inputRef.current?.focus()}
              className="btn btn-primary mt-4 text-xs">
              <Plus className="w-3.5 h-3.5" /> Add your first task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={handleToggle}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      {counts.done > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {counts.done} completed task{counts.done !== 1 ? 's' : ''}
          </p>
          <button onClick={handleClearDone}
            className="text-xs text-red-400 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
            Clear completed
          </button>
        </div>
      )}

      {/* ── TaskForm modal ─────────────────────────────────────────────────────── */}
      {showForm && (
        <TaskForm
          initial={editing ?? undefined}
          onSubmit={editing ? handleUpdate : handleCreate}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
