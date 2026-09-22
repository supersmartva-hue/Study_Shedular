'use client';
import { useState } from 'react';
import { X, AlignLeft, CalendarDays, Bell, Tag, Zap } from 'lucide-react';
import type { Task } from '../../types';

interface Props {
  initial?:  Partial<Task>;
  onSubmit:  (data: Partial<Task>) => Promise<void>;
  onClose:   () => void;
}

const PRIORITY_OPTS = [
  { value: 1, label: 'Low',    color: '#34d399', activeClass: 'border-emerald-300 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400' },
  { value: 2, label: 'Medium', color: '#818cf8', activeClass: 'border-indigo-300 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-400' },
  { value: 3, label: 'High',   color: '#e879f9', activeClass: 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:border-fuchsia-700 dark:text-fuchsia-400' },
] as const;

const SOURCE_LABEL: Record<string, string> = {
  manual:     '✏️ Manual',
  study_sync: '📚 Study Scheduler',
  extension:  '🔗 Browser Extension',
};

export default function TaskForm({ initial, onSubmit, onClose }: Props) {
  const isEdit = !!initial?.id;

  const [form, setForm] = useState({
    title:       initial?.title       ?? '',
    description: initial?.description ?? '',
    dueDate:     initial?.dueDate     ? fmtDatetimeLocal(initial.dueDate)    : '',
    reminderAt:  initial?.reminderAt  ? fmtDatetimeLocal(initial.reminderAt) : '',
    priority:    initial?.priority    ?? 2,
    tags:        initial?.tags?.join(', ') ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  function set(key: string, value: unknown) {
    setForm(f => ({ ...f, [key]: value }));
    if (error) setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    try {
      await onSubmit({
        title:       form.title.trim(),
        description: form.description.trim() || undefined,
        dueDate:     form.dueDate    ? new Date(form.dueDate).toISOString()    : undefined,
        reminderAt:  form.reminderAt ? new Date(form.reminderAt).toISOString() : undefined,
        priority:    form.priority as 1 | 2 | 3,
        tags:        form.tags
          ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
          : [],
      });
      onClose();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 460, padding: 0 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#e879f9,#818cf8)' }}>
              <Zap size={14} color="#fff" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white text-[.95rem]">
              {isEdit ? 'Edit Task' : 'New Task'}
            </span>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Source badge (edit only) */}
        {isEdit && initial?.source && (
          <div className="px-6 pt-3">
            <span className="inline-flex items-center text-[.73rem] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              {SOURCE_LABEL[initial.source] ?? initial.source}
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-5 space-y-4">

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl px-4 py-3 text-[.82rem] text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Title */}
          <FormField label="Title" required icon={<Zap size={13} color="#818cf8" />}>
            <input
              autoFocus required
              className="input"
              placeholder="What needs to be done?"
              value={form.title}
              onChange={e => set('title', e.target.value)}
            />
          </FormField>

          {/* Description */}
          <FormField label="Description" icon={<AlignLeft size={13} color="#94a3b8" />}>
            <textarea
              rows={2}
              className="input"
              style={{ resize: 'none', fontFamily: 'inherit' }}
              placeholder="Optional notes or context…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </FormField>

          {/* Date & Reminder */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date & Time" icon={<CalendarDays size={13} color="#34d399" />}>
              <input type="datetime-local" className="input text-sm" value={form.dueDate}
                onChange={e => set('dueDate', e.target.value)} />
            </FormField>
            <FormField label="Reminder" icon={<Bell size={13} color="#f59e0b" />}>
              <input type="datetime-local" className="input text-sm" value={form.reminderAt}
                onChange={e => set('reminderAt', e.target.value)} />
            </FormField>
          </div>

          {/* Priority */}
          <FormField label="Priority" icon={<Zap size={13} color="#e879f9" />}>
            <div className="flex gap-2">
              {PRIORITY_OPTS.map(p => (
                <button key={p.value} type="button" onClick={() => set('priority', p.value)}
                  className={`flex-1 py-2 rounded-xl text-[.8rem] font-semibold border-2 transition-all duration-150 ${
                    form.priority === p.value
                      ? p.activeClass
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </FormField>

          {/* Tags */}
          <FormField label="Tags" icon={<Tag size={13} color="#94a3b8" />}>
            <input className="input" placeholder="math, revision, urgent (comma-separated)"
              value={form.tags} onChange={e => set('tags', e.target.value)} />
          </FormField>

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center"
              style={{ background: 'linear-gradient(135deg,#e879f9,#818cf8)' }}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({ label, required, icon, children }: {
  label: string; required?: boolean; icon?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[.73rem] font-semibold uppercase tracking-wide mb-1.5"
        style={{ color: 'var(--text-secondary)' }}>
        {icon} {label}
        {required && <span className="text-fuchsia-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function fmtDatetimeLocal(iso: string): string {
  try { return new Date(iso).toISOString().slice(0, 16); }
  catch { return ''; }
}
