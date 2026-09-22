'use client';
import { format } from 'date-fns';
import { Clock, Bell, Tag, Pencil, Trash2, CheckCircle2, Circle } from 'lucide-react';
import type { Task } from '../../types';

interface Props {
  task:       Task;
  onComplete: (id: string) => void;
  onEdit:     (task: Task) => void;
  onDelete:   (id: string) => void;
}

const PRIORITY: Record<number, { label: string; dot: string; cls: string }> = {
  1: { label: 'Low',    dot: '#10b981', cls: 'badge-low'    },
  2: { label: 'Medium', dot: '#f59e0b', cls: 'badge-medium' },
  3: { label: 'High',   dot: '#ef4444', cls: 'badge-high'   },
};

const SOURCE_CLS: Record<string, string> = {
  manual:     'bg-slate-100 text-slate-600',
  study_sync: 'bg-blue-50 text-blue-600 border border-blue-100',
  extension:  'bg-violet-50 text-violet-600 border border-violet-100',
};

export default function TaskCard({ task, onComplete, onEdit, onDelete }: Props) {
  const done     = task.status === 'done';
  const priority = PRIORITY[task.priority] ?? PRIORITY[2];

  return (
    <div className={`card card-interactive p-4 group animate-fade-in ${done ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button onClick={() => onComplete(task.id)}
          className="mt-0.5 flex-shrink-0 transition-all duration-200 hover:scale-110">
          {done
            ? <CheckCircle2 className="w-5 h-5 text-green-500 drop-shadow-sm" />
            : <Circle className="w-5 h-5 text-slate-300 hover:text-primary-400 transition-colors" />
          }
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`text-sm font-semibold text-slate-800 leading-snug ${done ? 'line-through text-slate-400' : ''}`}>
              {task.title}
            </h3>
            {/* Actions */}
            <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(task)}
                className="p-1.5 rounded-lg hover:bg-primary-50 text-slate-400 hover:text-primary-600 transition-all">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(task.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {task.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{task.description}</p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {/* Priority */}
            <span className={`badge ${priority.cls}`}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: priority.dot }} />
              {priority.label}
            </span>

            {/* Source */}
            <span className={`badge ${SOURCE_CLS[task.source] ?? SOURCE_CLS.manual}`}>
              {task.source === 'study_sync' ? 'Study' : task.source === 'extension' ? 'Extension' : 'Manual'}
            </span>

            {/* Due date */}
            {task.dueDate && (
              <span className={`badge ${new Date(task.dueDate) < new Date() && !done ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                <Clock className="w-3 h-3" />
                {format(new Date(task.dueDate), 'MMM d, h:mm a')}
              </span>
            )}

            {/* Reminder */}
            {task.reminderAt && (
              <span className="badge bg-amber-50 text-amber-600 border border-amber-100">
                <Bell className="w-3 h-3" />
                {format(new Date(task.reminderAt), 'MMM d')}
              </span>
            )}

            {/* Tags */}
            {task.tags.slice(0, 3).map(tag => (
              <span key={tag} className="badge bg-slate-50 text-slate-500 border border-slate-100">
                <Tag className="w-2.5 h-2.5" /> {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Priority accent line */}
      <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r"
        style={{ background: priority.dot, opacity: done ? 0.3 : 0.7 }} />
    </div>
  );
}
