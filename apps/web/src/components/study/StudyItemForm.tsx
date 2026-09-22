'use client';
import { useState } from 'react';
import { X, BookOpen, Book, GraduationCap, Globe, Save } from 'lucide-react';
import type { StudyItem } from '../../types';

interface Props {
  initial?: Partial<StudyItem>;
  onSubmit: (data: Partial<StudyItem>) => Promise<void>;
  onClose:  () => void;
}

const TYPES = [
  { value: 'subject',  label: 'Subject',  Icon: BookOpen,      color: '#6366f1' },
  { value: 'book',     label: 'Book',     Icon: Book,          color: '#10b981' },
  { value: 'course',   label: 'Course',   Icon: GraduationCap, color: '#f59e0b' },
  { value: 'language', label: 'Language', Icon: Globe,         color: '#ec4899' },
] as const;

const COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444',
  '#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#06b6d4',
];

const HOUR_PRESETS = [0.5, 1, 2, 5, 10, 20, 40];

export default function StudyItemForm({ initial, onSubmit, onClose }: Props) {
  const isEdit = !!initial?.id;

  const [form, setForm] = useState({
    type:           initial?.type           ?? 'subject',
    title:          initial?.title          ?? '',
    description:    initial?.description    ?? '',
    priorityPct:    initial?.priorityPct    ?? 50,
    color:          initial?.color          ?? COLORS[0],
    deadline:       initial?.deadline       ? initial.deadline.slice(0, 10) : '',
    estimatedHours: initial?.estimatedHours ?? 0,
    difficulty:     initial?.difficulty     ?? 3,
  });
  const [customHrs, setCustomHrs] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  const activeType = TYPES.find(t => t.value === form.type) ?? TYPES[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        type:           form.type as StudyItem['type'],
        title:          form.title.trim(),
        description:    form.description.trim() || undefined,
        priorityPct:    Number(form.priorityPct),
        color:          form.color,
        deadline:       form.deadline ? new Date(form.deadline).toISOString() : undefined,
        estimatedHours: Number(form.estimatedHours),
        difficulty:     Number(form.difficulty),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  /* ── Shared inline style helpers using CSS variables ─────────────── */
  const inactiveBtn = {
    background: 'var(--bg-card-alt)',
    border: `1.5px solid var(--border)`,
    color: 'var(--text-muted)',
    cursor: 'pointer' as const,
    fontFamily: 'inherit',
    transition: 'all .12s',
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="modal-content"
        style={{ maxWidth: 480, padding: 0 }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 border-b"
          style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: activeType.color + '18', border: `1.5px solid ${activeType.color}35` }}>
              <activeType.Icon size={16} color={activeType.color} />
            </div>
            <span className="font-bold text-[.95rem]" style={{ color: 'var(--text-primary)' }}>
              {isEdit ? 'Edit Study Item' : 'Add Study Item'}
            </span>
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-slate-200">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '20px 24px 4px' }}>

          {/* Type selector */}
          <Field label="Type">
            <div className="grid grid-cols-4 gap-2">
              {TYPES.map(t => {
                const active = form.type === t.value;
                return (
                  <button key={t.value} type="button"
                    onClick={() => setForm(f => ({ ...f, type: t.value, color: t.color }))}
                    style={active
                      ? { background: t.color + '15', border: `2px solid ${t.color}`, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', borderRadius: 12 }
                      : { ...inactiveBtn, border: `2px solid var(--border)`, borderRadius: 12 }
                    }
                    className="py-2.5 flex flex-col items-center gap-1.5">
                    <t.Icon size={16} color={active ? t.color : undefined}
                      style={active ? undefined : { color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '.68rem', fontWeight: 600, color: active ? t.color : 'var(--text-muted)' }}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Title */}
          <Field label={form.type === 'subject' ? 'Subject Name *' : 'Title *'}>
            <input required autoFocus className="input" value={form.title} onChange={set('title')}
              placeholder={
                form.type === 'subject'  ? 'e.g. Data Structures' :
                form.type === 'book'     ? 'e.g. Clean Code'       :
                form.type === 'course'   ? 'e.g. Machine Learning' : 'e.g. JavaScript'
              } />
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea rows={2} className="input" style={{ resize: 'none', fontFamily: 'inherit' }}
              value={form.description} onChange={set('description')} placeholder="What will you study?" />
          </Field>

          {/* Priority slider */}
          <Field label={<>Priority <span style={{ color: activeType.color, fontWeight: 700, marginLeft: 4 }}>{form.priorityPct}%</span></>}>
            <input type="range" min={5} max={100} step={5} value={form.priorityPct}
              onChange={e => setForm(f => ({ ...f, priorityPct: Number(e.target.value) }))}
              style={{ width: '100%', accentColor: activeType.color, marginTop: 6 }} />
            <div className="flex justify-between mt-1">
              <span className="text-[.67rem]" style={{ color: 'var(--text-muted)' }}>Low</span>
              <span className="text-[.67rem]" style={{ color: 'var(--text-muted)' }}>High</span>
            </div>
          </Field>

          {/* Estimated hours */}
          <Field label={<>Estimated Hours {form.estimatedHours > 0 && <span style={{ color: activeType.color, marginLeft: 6, fontWeight: 700 }}>— {form.estimatedHours}h</span>}</>}>
            <div className="flex flex-wrap gap-1.5">
              {HOUR_PRESETS.map(h => {
                const active = form.estimatedHours === h;
                return (
                  <button key={h} type="button"
                    onClick={() => { setForm(f => ({ ...f, estimatedHours: h })); setCustomHrs(''); }}
                    style={active
                      ? { background: activeType.color + '15', border: `1.5px solid ${activeType.color}`, color: activeType.color, borderRadius: 8, fontSize: '.78rem', fontWeight: 600, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s' }
                      : { ...inactiveBtn, borderRadius: 8, fontSize: '.78rem', fontWeight: 600, padding: '5px 12px' }
                    }>
                    {h < 1 ? `${h * 60}m` : `${h}h`}
                  </button>
                );
              })}
              <input type="number" min="0" max="9999" step="0.5" className="input"
                style={{ width: 80, padding: '5px 10px', fontSize: '.8rem' }}
                placeholder="Custom" value={customHrs}
                onChange={e => {
                  setCustomHrs(e.target.value);
                  const n = parseFloat(e.target.value);
                  if (!isNaN(n) && n >= 0) setForm(f => ({ ...f, estimatedHours: n }));
                }} />
            </div>
          </Field>

          {/* Difficulty */}
          <Field label={<>Difficulty <span style={{ color: activeType.color, fontWeight: 700, marginLeft: 6 }}>— {['','Very Easy','Easy','Moderate','Hard','Very Hard'][form.difficulty]}</span></>}>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map(d => (
                <button key={d} type="button" onClick={() => setForm(f => ({ ...f, difficulty: d }))}
                  style={d <= form.difficulty
                    ? { flex: 1, padding: '7px 2px', borderRadius: 10, fontSize: '1.1rem', border: `1.5px solid ${activeType.color}50`, background: activeType.color + '15', color: activeType.color, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .1s' }
                    : { ...inactiveBtn, flex: 1, padding: '7px 2px', borderRadius: 10, fontSize: '1.1rem' }
                  }>
                  ★
                </button>
              ))}
            </div>
          </Field>

          {/* Deadline */}
          <Field label="Deadline">
            <input type="date" className="input" value={form.deadline} onChange={set('deadline')} />
          </Field>

          {/* Color palette */}
          <Field label="Color">
            <div className="flex gap-2 flex-wrap mt-1">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: c, border: 'none', cursor: 'pointer',
                    transform: form.color === c ? 'scale(1.25)' : 'scale(1)',
                    outline: form.color === c ? `2.5px solid ${c}` : 'none',
                    outlineOffset: 2, transition: 'transform .12s',
                  }} />
              ))}
            </div>
          </Field>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-6 py-4 flex-shrink-0 border-t" style={{ borderColor: 'var(--border)' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1 justify-center">
            Cancel
          </button>
          <button type="submit" disabled={saving || !form.title.trim()} className="btn btn-primary flex-1 justify-center"
            style={saving || !form.title.trim() ? {} : {
              background: `linear-gradient(135deg, ${activeType.color}, ${activeType.color}cc)`,
              boxShadow: `0 4px 14px ${activeType.color}40`,
            }}>
            <Save size={14} />
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="flex items-center gap-1 text-[.73rem] font-semibold uppercase tracking-wide mb-1.5"
        style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}
