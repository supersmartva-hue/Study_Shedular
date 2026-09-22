'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Plus, Trash2, Link as LinkIcon, Pencil, Check, X,
  RefreshCw, Calendar, Flag, Bot,
} from 'lucide-react';
import { api } from '../../../../lib/api';
import type { StudyItem, Note, Resource } from '../../../../types';
import StudySearch        from '../../../../components/study/StudySearch';
import PdfNotesGenerator from '../../../../components/study/PdfNotesGenerator';
import ContextAiPanel    from '../../../../components/ai/ContextAiPanel';

// ---------- Sync Modal ----------
interface SyncSuggestion {
  title:       string;
  description: string;
  dueDate:     string;
  priority:    1 | 2 | 3;
}

function SyncModal({
  suggestion,
  onConfirm,
  onClose,
}: {
  suggestion: SyncSuggestion;
  onConfirm:  (data: SyncSuggestion) => Promise<void>;
  onClose:    () => void;
}) {
  const [form, setForm] = useState({
    title:       suggestion.title,
    description: suggestion.description,
    dueDate:     suggestion.dueDate ? new Date(suggestion.dueDate).toISOString().slice(0, 16) : '',
    priority:    suggestion.priority,
  });
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    try {
      await onConfirm({
        title:       form.title,
        description: form.description,
        dueDate:     form.dueDate ? new Date(form.dueDate).toISOString() : suggestion.dueDate,
        priority:    form.priority,
      });
    } finally {
      setSaving(false);
    }
  }

  const PRIORITY_OPTS = [
    { value: 1 as const, label: 'Low',    cls: 'bg-green-100 text-green-700 border-green-300'   },
    { value: 2 as const, label: 'Medium', cls: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    { value: 3 as const, label: 'High',   cls: 'bg-red-100 text-red-700 border-red-300'          },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-green-600" /> Sync to To-Do
          </h2>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-slate-500 rounded-lg p-3" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border)' }}>
            Review and edit the suggested task before adding it to your To-Do list.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Task Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="input" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
            <textarea rows={2} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="input" style={{ resize: 'none', fontFamily: 'inherit' }} />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
              <Calendar className="w-3.5 h-3.5" /> Due Date
            </label>
            <input type="datetime-local" value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              className="input" />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
              <Flag className="w-3.5 h-3.5" /> Priority
            </label>
            <div className="flex gap-2">
              {PRIORITY_OPTS.map(p => (
                <button key={p.value} type="button"
                  onClick={() => setForm(f => ({ ...f, priority: p.value }))}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    form.priority === p.value ? p.cls : 'border-slate-200 text-slate-400 hover:border-slate-300'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="button" onClick={handleConfirm} disabled={saving || !form.title.trim()}
              className="btn flex-1 justify-center bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white">
              <Check className="w-4 h-4" />
              {saving ? 'Adding…' : 'Add to To-Do'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Main Page ----------
export default function StudyDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const [item,    setItem]    = useState<StudyItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiOpen,  setAiOpen]  = useState(false);

  // Sync modal
  const [syncSuggestion, setSyncSuggestion] = useState<SyncSuggestion | null>(null);
  const [syncLoading,    setSyncLoading]    = useState(false);

  // Notes
  const [noteContent, setNoteContent] = useState('');
  const [noteTitle,   setNoteTitle]   = useState('');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Resources
  const [linkUrl,   setLinkUrl]   = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  useEffect(() => { fetchItem(); }, [id]);

  async function fetchItem() {
    try {
      const { data } = await api.get(`/api/study/${id}`);
      setItem(data.data);
    } catch { toast.error('Study item not found'); router.push('/study'); }
    finally  { setLoading(false); }
  }

  async function addNote() {
    if (!noteContent.trim()) return;
    const { data } = await api.post(`/api/study/${id}/notes`, {
      title: noteTitle || undefined, content: noteContent,
    });
    setItem(prev => prev ? { ...prev, notes: [data.data, ...(prev.notes ?? [])] } : prev);
    setNoteContent(''); setNoteTitle('');
    toast.success('Note added!');
  }

  async function saveEditNote(nid: string) {
    const { data } = await api.patch(`/api/study/${id}/notes/${nid}`, { content: editContent });
    setItem(prev => prev ? {
      ...prev,
      notes: (prev.notes ?? []).map(n => n.id === nid ? { ...n, content: data.data.content } : n),
    } : prev);
    setEditingNote(null);
    toast.success('Note saved!');
  }

  async function deleteNote(nid: string) {
    await api.delete(`/api/study/${id}/notes/${nid}`);
    setItem(prev => prev ? { ...prev, notes: (prev.notes ?? []).filter(n => n.id !== nid) } : prev);
    toast.success('Note deleted');
  }

  async function addLink() {
    if (!linkUrl.trim()) return;
    const { data } = await api.post(`/api/study/${id}/resources`, {
      type: 'link', url: linkUrl, title: linkTitle || undefined,
    });
    setItem(prev => prev ? { ...prev, resources: [...(prev.resources ?? []), data.data] } : prev);
    setLinkUrl(''); setLinkTitle('');
    toast.success('Link added!');
  }

  async function deleteResource(rid: string) {
    await api.delete(`/api/study/${id}/resources/${rid}`);
    setItem(prev => prev ? { ...prev, resources: (prev.resources ?? []).filter(r => r.id !== rid) } : prev);
    toast.success('Removed');
  }

  async function openSyncModal() {
    setSyncLoading(true);
    try {
      const { data: s } = await api.get(`/api/study/${id}/sync-task`);
      setSyncSuggestion(s.data);
    } catch { toast.error('Could not fetch sync suggestion'); }
    finally  { setSyncLoading(false); }
  }

  async function confirmSync(override: SyncSuggestion) {
    await api.post(`/api/study/${id}/confirm-sync`, override);
    setSyncSuggestion(null);
    toast.success('Task added to To-Do!');
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
    </div>
  );
  if (!item) return null;

  // Build AI context from study item content
  const aiContext = [
    `Study item: ${item.title}`,
    `Type: ${item.type}`,
    item.description ? `Description: ${item.description}` : '',
    '',
    (item.notes?.length ?? 0) > 0
      ? `Notes:\n${item.notes!.slice(0, 5).map(n =>
          `${n.title ? `## ${n.title}\n` : ''}${n.content.slice(0, 800)}`
        ).join('\n---\n')}`
      : 'No notes yet.',
  ].filter(Boolean).join('\n');

  return (
    <div className="max-w-2xl mx-auto relative">
      {syncSuggestion && (
        <SyncModal
          suggestion={syncSuggestion}
          onConfirm={confirmSync}
          onClose={() => setSyncSuggestion(null)}
        />
      )}

      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/study')} className="btn btn-secondary p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <span className="text-xs text-slate-400 capitalize">{item.type}</span>
          <h2 className="text-xl font-bold text-slate-800">{item.title}</h2>
        </div>
        <button
          onClick={openSyncModal}
          disabled={syncLoading}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
          {syncLoading ? 'Loading…' : 'Sync to To-Do'}
        </button>
      </div>

      {item.description && (
        <p className="text-sm text-slate-600 mb-6 card p-4">
          {item.description}
        </p>
      )}

      {/* Notes Section */}
      <section className="mb-8">
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">Notes</h3>

        <PdfNotesGenerator studyItemId={id} onNoteSaved={fetchItem} />

        <div className="card p-4 mb-3 space-y-2">
          <input value={noteTitle} onChange={e => setNoteTitle(e.target.value)}
            className="input text-sm" placeholder="Note title (optional)" />
          <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)}
            rows={3} className="input text-sm" style={{ resize: 'none', fontFamily: 'inherit' }}
            placeholder="Write a note…" />
          <button onClick={addNote} className="btn btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Note
          </button>
        </div>

        <div className="space-y-2">
          {(item.notes ?? []).map(note => (
            <div key={note.id} className="card p-4">
              {editingNote === note.id ? (
                <div>
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                    rows={3} className="input text-sm w-full mb-2"
                    style={{ resize: 'none', fontFamily: 'inherit' }} />
                  <div className="flex gap-2">
                    <button onClick={() => saveEditNote(note.id)}
                      className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-lg text-xs font-semibold">
                      <Check className="w-3 h-3" /> Save
                    </button>
                    <button onClick={() => setEditingNote(null)} className="btn btn-secondary text-xs px-3 py-1">
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {note.title && <p className="text-xs font-semibold text-slate-700 mb-1">{note.title}</p>}
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{note.content}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setEditingNote(note.id); setEditContent(note.content); }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                      <Pencil className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button onClick={() => deleteNote(note.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Search Section */}
      <section className="mb-8">
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">Find Books & Materials</h3>
        <StudySearch studyItemId={id} initialQuery={item.title}
          onResourceAdded={(res) =>
            setItem(prev => prev ? { ...prev, resources: [...(prev.resources ?? []), res] } : prev)
          } />
      </section>

      {/* Resources Section */}
      <section>
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">Resources & Links</h3>
        <div className="card p-4 mb-3">
          <div className="flex gap-2">
            <input value={linkTitle} onChange={e => setLinkTitle(e.target.value)}
              className="input text-sm w-1/3" placeholder="Title (optional)" />
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
              className="input text-sm flex-1" placeholder="https://..." />
            <button onClick={addLink} className="btn btn-primary text-sm px-3">
              <LinkIcon className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {(item.resources ?? []).map(res => (
            <div key={res.id} className="card p-3 flex items-center justify-between">
              <a href={res.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary-600 hover:underline truncate">
                <LinkIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{res.title || res.url}</span>
              </a>
              <button onClick={() => deleteResource(res.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Floating AI assistant button ───────────────────────────────── */}
      <button
        onClick={() => setAiOpen(true)}
        title="Open AI assistant"
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl shadow-lg transition-all ${
          aiOpen ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100'
        }`}
      >
        <Bot className="w-4 h-4" />
        <span className="text-sm font-semibold">AI Assistant</span>
      </button>

      {/* ── AI drawer panel ────────────────────────────────────────────── */}
      <ContextAiPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        context={aiContext}
        contextLabel={item.title}
        language="english"
        placeholder={`Ask about ${item.title}…`}
        variant="drawer"
      />
    </div>
  );
}
