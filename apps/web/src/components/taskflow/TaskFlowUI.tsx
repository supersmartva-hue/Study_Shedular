'use client';
/**
 * TaskFlowUI — Shared dark glassmorphism To-Do widget.
 *
 * Used by:
 *   • app/page.tsx            (public, localStorage mode)
 *   • app/(dashboard)/tasks   (auth, API mode)
 *
 * The parent adapts its native data model to TFTask[] and provides
 * callbacks. This component is purely presentational + local UI state.
 */

import { useRef, useState } from 'react';
import { CalendarDays, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import type { TFTask, TFAddInput, TFFilter } from './types';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const PRIORITY_COLOR: Record<number, string> = {
  1: '#34d399',   // emerald  — Low
  2: '#818cf8',   // indigo   — Medium
  3: '#e879f9',   // fuchsia  — High
};
const PRIORITY_LABEL: Record<number, string> = { 1: 'Low', 2: 'Med', 3: 'High' };
const SOURCE_ICON:  Record<string, string>    = { study: '📚', study_sync: '📚', extension: '🔗', manual: '✏️' };
const SOURCE_LABEL: Record<string, string>    = { study: 'Study', study_sync: 'Study', extension: 'Extension', manual: 'Manual' };

const EMPTY_MSG: Record<TFFilter, { icon: string; text: string }> = {
  all:      { icon: '📋', text: 'No tasks yet. Add one above!' },
  today:    { icon: '☀️', text: "Nothing due today — enjoy your day!" },
  upcoming: { icon: '📅', text: 'No upcoming tasks in the next 7 days.' },
  active:   { icon: '🎉', text: 'No active tasks. All caught up!' },
  done:     { icon: '⏳', text: 'No completed tasks yet.' },
};

/* ─── Date helpers ───────────────────────────────────────────────────────── */
function parseDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}
function todayMidnight(): Date {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}
function isToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = parseDay(dateStr), t = todayMidnight();
  return d.getTime() === t.getTime();
}
function isUpcoming(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d   = parseDay(dateStr);
  const t   = todayMidnight();
  const end = new Date(t); end.setDate(end.getDate() + 7);
  return d > t && d <= end;
}
function isPast(dateStr?: string): boolean {
  if (!dateStr) return false;
  return parseDay(dateStr) < todayMidnight();
}
function fmtDueDate(dateStr: string): string {
  if (isToday(dateStr)) return 'Today';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ─── Props ──────────────────────────────────────────────────────────────── */
export interface TaskFlowUIProps {
  tasks:       TFTask[];
  loading?:    boolean;
  onAdd:       (input: TFAddInput) => void | Promise<void>;
  onToggle:    (id: string)        => void | Promise<void>;
  onDelete:    (id: string)        => void | Promise<void>;
  onClearDone: ()                  => void | Promise<void>;
  onEdit?:     (id: string)        => void;    // auth mode: open edit modal
}

/* ─── TaskFlowUI ─────────────────────────────────────────────────────────── */
export default function TaskFlowUI({
  tasks, loading = false,
  onAdd, onToggle, onDelete, onClearDone, onEdit,
}: TaskFlowUIProps) {

  const inputRef = useRef<HTMLInputElement>(null);
  const [filter,    setFilter]   = useState<TFFilter>('all');
  const [quickText, setQuick]    = useState('');
  const [priority,  setPriority] = useState<1|2|3>(2);
  const [dueDate,   setDueDate]  = useState('');
  const [showOpts,  setShowOpts] = useState(false);
  const [shake,     setShake]    = useState(false);

  /* ── Stats ────────────────────────────────────────────────────────────── */
  const total      = tasks.length;
  const doneCount  = tasks.filter(t => t.done).length;
  const activeCount= total - doneCount;
  const todayCount = tasks.filter(t => !t.done && isToday(t.dueDate)).length;
  const pct        = total === 0 ? 0 : Math.round((doneCount / total) * 100);
  const remaining  = activeCount === 0 && total > 0
    ? 'All tasks complete! 🎉'
    : `${activeCount} task${activeCount !== 1 ? 's' : ''} remaining`;

  /* ── Filtered list ────────────────────────────────────────────────────── */
  const filtered = tasks.filter(t => {
    switch (filter) {
      case 'today':    return !t.done && isToday(t.dueDate);
      case 'upcoming': return !t.done && isUpcoming(t.dueDate);
      case 'active':   return !t.done;
      case 'done':     return  t.done;
      default:         return true;
    }
  });

  /* ── Quick add ────────────────────────────────────────────────────────── */
  async function handleAdd() {
    const title = quickText.trim();
    if (!title) {
      setShake(true); setTimeout(() => setShake(false), 450);
      inputRef.current?.focus(); return;
    }
    await onAdd({ title, priority, dueDate: dueDate || undefined });
    setQuick(''); setPriority(2); setDueDate(''); setShowOpts(false);
  }

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="tf-widget">

      {/* Stats bar */}
      <div className="tf-stats">
        {[
          { label: 'Total',  value: total       },
          { label: 'Active', value: activeCount  },
          { label: 'Today',  value: todayCount   },
          { label: 'Done',   value: doneCount    },
        ].map(({ label, value }, i) => (
          <div key={label} className="tf-stat-group">
            {i > 0 && <div className="tf-stat-divider" />}
            <div className="tf-stat">
              <span className="tf-stat-num">{value}</span>
              <span className="tf-stat-label">{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main glass card */}
      <div className="tf-card">

        {/* Quick-add row */}
        <div className="tf-input-row">
          <div className={`tf-input-wrap ${shake ? 'tf-shake' : ''}`}>
            <span className="tf-input-icon">+</span>
            <input
              ref={inputRef}
              className="tf-input"
              placeholder="What needs to be done?"
              autoComplete="off"
              value={quickText}
              onChange={e => setQuick(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <button
              className="tf-opts-btn"
              type="button"
              title="Set priority & due date"
              onClick={() => setShowOpts(o => !o)}>
              <ChevronDown
                size={14}
                style={{ transform: showOpts ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
              />
            </button>
          </div>
          <button className="tf-add-btn" onClick={handleAdd}>Add</button>
        </div>

        {/* Optional fields */}
        {showOpts && (
          <div className="tf-opts-row">
            {/* Priority */}
            <div className="tf-opts-field">
              <label className="tf-opts-label">Priority</label>
              <div className="tf-pri-group">
                {([1, 2, 3] as const).map(p => (
                  <button key={p} type="button"
                    className={`tf-pri-btn ${priority === p ? 'tf-pri-active' : ''}`}
                    style={priority === p ? {
                      background:  PRIORITY_COLOR[p] + '28',
                      borderColor: PRIORITY_COLOR[p],
                      color:       PRIORITY_COLOR[p],
                    } : {}}
                    onClick={() => setPriority(p)}>
                    {PRIORITY_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>
            {/* Due date */}
            <div className="tf-opts-field">
              <label className="tf-opts-label">
                <CalendarDays size={10} style={{ display: 'inline', marginRight: 4 }} />
                Due Date
              </label>
              <input
                type="date"
                className="tf-date-input"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="tf-progress-wrap">
          <div className="tf-progress-bar">
            <div className="tf-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="tf-progress-label">{pct}% complete</span>
        </div>

        {/* Filter tabs */}
        <div className="tf-filters" role="tablist">
          {(['all', 'today', 'upcoming', 'active', 'done'] as TFFilter[]).map(f => (
            <button key={f} role="tab"
              className={`tf-filter-btn ${filter === f ? 'tf-filter-active' : ''}`}
              onClick={() => setFilter(f)}>
              {f === 'today' && todayCount > 0
                ? <><span>Today</span><span className="tf-today-dot">{todayCount}</span></>
                : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Task list */}
        {loading ? (
          <ul className="tf-list">
            {[1, 2, 3, 4].map(i => <li key={i} className="tf-skeleton" />)}
          </ul>
        ) : filtered.length === 0 ? (
          <div className="tf-empty">
            <span className="tf-empty-icon">{EMPTY_MSG[filter].icon}</span>
            <span className="tf-empty-text">{EMPTY_MSG[filter].text}</span>
          </div>
        ) : (
          <ul className="tf-list">
            {filtered.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={onToggle}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))}
          </ul>
        )}

        {/* Footer */}
        <div className="tf-footer">
          <span className="tf-count">{remaining}</span>
          <button className="tf-clear-btn" onClick={onClearDone}>
            Clear completed
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── TaskItem sub-component ─────────────────────────────────────────────── */
function TaskItem({
  task, onToggle, onDelete, onEdit,
}: {
  task:     TFTask;
  onToggle: (id: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onEdit?:  (id: string) => void;
}) {
  const color   = PRIORITY_COLOR[task.priority] ?? '#818cf8';
  const overdue = !!task.dueDate && isPast(task.dueDate) && !task.done;
  const dueToday = isToday(task.dueDate);

  return (
    <li className={`tf-item ${task.done ? 'tf-item-done' : ''}`}>
      {/* Gradient checkbox */}
      <input
        type="checkbox"
        className="tf-checkbox"
        id={`tf-${task.id}`}
        checked={task.done}
        onChange={() => onToggle(task.id)}
      />

      {/* Body */}
      <div className="tf-item-body">
        <label htmlFor={`tf-${task.id}`} className="tf-item-label">
          {task.title}
        </label>

        {task.description && (
          <p className="tf-item-desc">{task.description}</p>
        )}

        {/* Meta badges */}
        <div className="tf-item-meta">
          {/* Priority */}
          <span className="tf-badge"
            style={{ color, background: color + '22' }}>
            {PRIORITY_LABEL[task.priority]}
          </span>

          {/* Source — only shown for non-manual */}
          {task.source && task.source !== 'manual' && (
            <span className="tf-badge tf-source-badge">
              {SOURCE_ICON[task.source]} {SOURCE_LABEL[task.source]}
            </span>
          )}

          {/* Due date */}
          {task.dueDate && (
            <span className={`tf-badge tf-date-badge ${
              overdue  ? 'tf-overdue'
              : dueToday ? 'tf-today-badge'
              : ''
            }`}>
              <CalendarDays size={9} style={{ display: 'inline', marginRight: 3 }} />
              {fmtDueDate(task.dueDate)}
            </span>
          )}

          {/* Tags */}
          {task.tags?.slice(0, 2).map(tag => (
            <span key={tag} className="tf-badge">{tag}</span>
          ))}
        </div>
      </div>

      {/* Action buttons (visible on hover) */}
      <div className="tf-actions">
        {onEdit && (
          <button className="tf-action-btn" onClick={() => onEdit(task.id)} title="Edit">
            <Pencil size={11} />
          </button>
        )}
        <button
          className="tf-action-btn tf-action-del"
          onClick={() => onDelete(task.id)}
          title="Delete">
          <Trash2 size={11} />
        </button>
      </div>
    </li>
  );
}
