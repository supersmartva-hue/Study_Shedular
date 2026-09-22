'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, BookOpen, Sparkles } from 'lucide-react';
import { api } from '../../../lib/api';
import { useStudyStore } from '../../../store/useStudyStore';
import StudyItemCard from '../../../components/study/StudyItemCard';
import StudyItemForm from '../../../components/study/StudyItemForm';
import type { StudyItem } from '../../../types';

const TYPE_FILTERS = ['all', 'subject', 'book', 'course', 'language'] as const;
const TYPE_EMOJI: Record<string, string> = {
  all: '📚', subject: '📖', book: '📗', course: '🎓', language: '🌐',
};

export default function StudyPage() {
  const router = useRouter();
  const { items, setItems, addItem, updateItem, removeItem, loading, setLoading } = useStudyStore();
  const [typeFilter,   setTypeFilter]   = useState<string>('all');
  const [showForm,     setShowForm]     = useState(false);
  const [editing,      setEditing]      = useState<StudyItem | null>(null);
  const [schedule,     setSchedule]     = useState<any[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [loadingSched, setLoadingSched] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    try {
      const { data } = await api.get('/api/study');
      setItems(data.data);
    } catch { toast.error('Failed to load study items'); }
    finally  { setLoading(false); }
  }

  async function handleCreate(payload: Partial<StudyItem>) {
    try {
      const { data } = await api.post('/api/study', payload);
      addItem(data.data);
      toast.success('Subject saved!');
    } catch (err) {
      toast.error('Failed to save. Please try again.');
      throw err;
    }
  }

  async function handleUpdate(payload: Partial<StudyItem>) {
    if (!editing) return;
    try {
      const { data } = await api.patch(`/api/study/${editing.id}`, payload);
      updateItem(editing.id, data.data);
      setEditing(null);
      toast.success('Saved!');
    } catch (err) {
      toast.error('Failed to update. Please try again.');
      throw err;
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this study item? All linked sessions will also be removed.')) return;
    await api.delete(`/api/study/${id}`);
    removeItem(id);
    toast.success('Deleted');
  }

  async function loadSchedule() {
    setLoadingSched(true);
    try {
      const { data } = await api.get('/api/planning/schedule?hours=6');
      setSchedule(data.data);
      setShowSchedule(true);
    } catch { toast.error('Could not generate schedule'); }
    finally { setLoadingSched(false); }
  }

  const filtered = typeFilter === 'all' ? items : items.filter(i => i.type === typeFilter);

  const totalHours  = items.reduce((s, i) => s + i.estimatedHours, 0);
  const doneHours   = items.reduce((s, i) => s + i.hoursCompleted, 0);
  const pct         = totalHours > 0 ? Math.round((doneHours / totalHours) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Study Scheduler</h2>
          <p className="page-sub">
            {items.length} item{items.length !== 1 ? 's' : ''} · sorted by priority
            {doneHours > 0 && <span className="ml-2 text-primary-500 font-semibold">{doneHours.toFixed(1)}h completed</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadSchedule} disabled={loadingSched}
            className="btn btn-secondary">
            {loadingSched
              ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin inline-block" />
              : <Sparkles className="w-4 h-4" />}
            Smart Plan
          </button>
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            className="btn btn-primary">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* ── Overall progress ───────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="card p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600">Overall Study Progress</span>
            <span className="text-xs font-bold text-primary-600">{pct}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#818cf8,#6366f1)' }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-slate-400">{doneHours.toFixed(1)}h done</span>
            <span className="text-[10px] text-slate-400">{(totalHours - doneHours).toFixed(1)}h remaining</span>
          </div>
        </div>
      )}

      {/* ── Type filters ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 mb-5 border rounded-xl p-1 overflow-x-auto" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        {TYPE_FILTERS.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`flex items-center gap-1.5 flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
              typeFilter === t
                ? 'text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-white/5'
            }`}
            style={typeFilter === t ? { background: 'linear-gradient(135deg,#818cf8,#6366f1)' } : {}}>
            <span>{TYPE_EMOJI[t]}</span>
            <span className="capitalize">{t === 'all' ? `All (${items.length})` : t}</span>
          </button>
        ))}
      </div>

      {/* ── List ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <BookOpen className="w-10 h-10 mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">
            {typeFilter === 'all' ? 'No study items yet' : `No ${typeFilter} items`}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">
            Add subjects, books, courses or languages to start building your schedule.
          </p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary mt-4 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add your first item
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <StudyItemCard
              key={item.id}
              item={item}
              onEdit={i => { setEditing(i); setShowForm(true); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── Smart Schedule modal ────────────────────────────────────────── */}
      {showSchedule && (
        <div className="modal-backdrop" onClick={() => setShowSchedule(false)}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-500" /> Today's Smart Plan (6 hrs)
              </h3>
              <button onClick={() => setShowSchedule(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors text-lg leading-none">
                ×
              </button>
            </div>

            {schedule.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No schedule data.</p>
            ) : (
              <div className="space-y-2.5">
                {schedule.map((s: any) => (
                  <div key={s.studyItemId}
                    className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{s.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {s.priorityLabel} priority
                        {s.daysLeft !== undefined && (
                          <span> · {s.daysLeft > 0 ? `${s.daysLeft} days left` : 'Deadline passed'}</span>
                        )}
                      </p>
                    </div>
                    <span className="text-primary-600 font-bold text-sm ml-3 flex-shrink-0">{s.dailyHours}h</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={() => setShowSchedule(false)}
                className="btn btn-secondary justify-center">Close</button>
              <button
                onClick={() => { setShowSchedule(false); router.push('/schedule'); }}
                className="btn btn-primary justify-center">
                <Sparkles className="w-3.5 h-3.5" /> Go to Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Form modal ──────────────────────────────────────────────────── */}
      {showForm && (
        <StudyItemForm
          initial={editing ?? undefined}
          onSubmit={editing ? handleUpdate : handleCreate}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
