'use client';
/**
 * Public task dashboard — the main page, visible before AND after login.
 * Uses unified task system: localStorage before login, database after login.
 * Tasks automatically sync to database on login.
 *
 * Features:
 *   • Quick-add via inline input
 *   • Full "New Task" modal with title, description, date/time, priority
 *   • Edit existing tasks via the pencil icon
 *   • Filter: All / Today / Upcoming / Active / Done
 *   • Mark complete, delete, clear completed
 *   • Dark glassmorphism design consistent with auth dashboard
 */

import { useEffect, useState } from 'react';
import Link                    from 'next/link';
import { ChevronRight, Zap }   from 'lucide-react';
import TaskFlowUI from '../components/taskflow/TaskFlowUI';
import TaskForm   from '../components/tasks/TaskForm';
import { useAuthStore }        from '../store/useAuthStore';
import { useUnifiedTasks }     from '../hooks/useUnifiedTasks';
import type { TFAddInput }     from '../components/taskflow/types';
import type { Task }           from '../types';

export default function PublicPage() {
  const isAuth  = useAuthStore(s => s.isAuth);
  const { tasks, loading, addTask, updateTask, deleteTask, toggleTask } = useUnifiedTasks();

  const [hydrated,  setHydrated] = useState(false);
  const [showForm,  setShowForm] = useState(false);
  const [editing,   setEditing]  = useState<Partial<Task> | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  function handleAdd(input: TFAddInput) {
    addTask({
      title:    input.title,
      priority: input.priority,
      dueDate:  input.dueDate,
    });
  }

  async function handleCreate(payload: Partial<Task>) {
    addTask(payload);
    setShowForm(false);
  }

  async function handleUpdate(payload: Partial<Task>) {
    if (!editing?.id) return;
    updateTask(editing.id, payload);
    setEditing(null);
    setShowForm(false);
  }

  function handleToggle(id: string) {
    toggleTask(id);
  }

  function handleDelete(id: string) {
    deleteTask(id);
  }

  function handleClearDone() {
    tasks.filter(t => (t as any).done || (t as any).status === 'done').forEach(t => {
      deleteTask(t.id);
    });
  }

  function openEdit(id: string) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      setEditing({
        id: task.id,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        priority: task.priority,
        status: (task as any).done ? 'done' : (task as any).status,
        tags: (task as any).tags || [],
      });
      setShowForm(true);
    }
  }

  if (!hydrated) return null;

  // Derived values
  const activeCount = tasks.filter(t => !((t as any).done || (t as any).status === 'done')).length;
  const dateStr     = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  const subtitleStr = activeCount === 0 && tasks.length > 0
    ? 'All done! 🎉'
    : activeCount === 0
      ? 'No tasks yet — add one below'
      : `${activeCount} task${activeCount !== 1 ? 's' : ''} remaining`;

  // Convert tasks to TaskFlowUI format
  const tfTasks = tasks.map(t => ({
    id:          t.id,
    title:       t.title,
    description: t.description,
    done:        (t as any).done || (t as any).status === 'done',
    priority:    t.priority || 2,
    dueDate:     t.dueDate,
    source:      'manual' as const,
  }));

  return (
    <div className="tf-page-public">
      {/* Background blobs */}
      <div className="tf-blob tf-blob-1" />
      <div className="tf-blob tf-blob-2" />
      <div className="tf-blob tf-blob-3" />
      <div className="tf-overlay" />

      <div className="tf-page-wrapper">

        {/* ── Navigation ─────────────────────────────────────────────────── */}
        <nav className="tf-nav">
          <Link href="/" className="tf-logo">
            <div className="tf-logo-icon"><Zap size={16} /></div>
            <span className="tf-logo-text">TaskFlow</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isAuth && <Link href="/login" className="tf-nav-link">Sign in</Link>}
            <Link href={isAuth ? '/study' : '/login'} className="tf-nav-cta">
              Continue to Study Planner <ChevronRight size={13} />
            </Link>
          </div>
        </nav>

        {/* ── Dashboard header ───────────────────────────────────────────── */}
        <div className="tf-auth-header">
          <div>
            <h1 className="tf-auth-title">My Tasks</h1>
            <p className="tf-auth-subtitle">{dateStr}</p>
          </div>
        </div>

        {/* ── Task UI ──────────────────────────────────────────────────────── */}
        <TaskFlowUI
          tasks={tfTasks}
          onAdd={handleAdd}
          onToggle={handleToggle}
          onEdit={openEdit}
          onDelete={handleDelete}
          onClearDone={handleClearDone}
          loading={loading}
        />

        {/* ── Task Form Modal ──────────────────────────────────────────────── */}
        {showForm && (
          <TaskForm
            initial={editing ?? undefined}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSubmit={editing ? handleUpdate : handleCreate}
          />
        )}
      </div>
    </div>
  );
}
