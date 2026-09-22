'use client';
import Link from 'next/link';
import { format } from 'date-fns';
import { StickyNote, Paperclip, CalendarDays, ArrowRight, Pencil, Trash2, Clock } from 'lucide-react';
import type { StudyItem } from '../../types';

interface Props {
  item:     StudyItem;
  onEdit:   (item: StudyItem) => void;
  onDelete: (id: string) => void;
}

const TYPE_ICON: Record<string, string> = {
  subject:  '📚',
  book:     '📖',
  course:   '🎓',
  language: '🌐',
};

const TYPE_COLOR: Record<string, string> = {
  subject:  '#6366f1',
  book:     '#10b981',
  course:   '#f59e0b',
  language: '#ec4899',
};

export default function StudyItemCard({ item, onEdit, onDelete }: Props) {
  const pct          = Math.min(100, Math.max(0, item.priorityPct));
  const iconColor    = item.color || TYPE_COLOR[item.type] || '#6366f1';
  const hoursLeft    = Math.max(0, item.estimatedHours - item.hoursCompleted);
  const progressPct  = item.estimatedHours > 0
    ? Math.round((item.hoursCompleted / item.estimatedHours) * 100)
    : 0;

  return (
    <div className="card card-interactive p-4 group animate-fade-in relative overflow-hidden">
      {/* Color strip */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
        style={{ background: iconColor }} />

      <div className="flex items-start gap-3 pl-2">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
          style={{ background: iconColor + '15', border: `1px solid ${iconColor}25` }}>
          {TYPE_ICON[item.type] ?? '📚'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ background: iconColor + '15', color: iconColor }}>
                  {item.type}
                </span>
                {item.difficulty && (
                  <span className="text-[10px] text-slate-400">
                    {'★'.repeat(item.difficulty)}{'☆'.repeat(5 - item.difficulty)}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-slate-800 text-sm mt-1 leading-snug">{item.title}</h3>
              {item.description && (
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.description}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(item)}
                className="p-1.5 rounded-lg hover:bg-primary-50 text-slate-400 hover:text-primary-600 transition-all">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(item.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {item.estimatedHours > 0 && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-400 font-medium">
                  {item.hoursCompleted}h / {item.estimatedHours}h
                </span>
                <span className="text-[10px] font-bold" style={{ color: iconColor }}>{progressPct}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%`, background: iconColor }} />
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 mt-2.5">
            <div className="flex items-center gap-1">
              <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: iconColor }} />
              </div>
              <span className="text-[10px] font-bold" style={{ color: iconColor }}>{pct}%</span>
            </div>

            {item._count && (
              <>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <StickyNote className="w-3 h-3" /> {item._count.notes}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Paperclip className="w-3 h-3" /> {item._count.resources}
                </span>
              </>
            )}

            {hoursLeft > 0 && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3 h-3" /> {hoursLeft}h left
              </span>
            )}

            {item.deadline && (
              <span className={`flex items-center gap-1 text-xs ${
                new Date(item.deadline) < new Date() ? 'text-red-500' : 'text-slate-400'
              }`}>
                <CalendarDays className="w-3 h-3" />
                {format(new Date(item.deadline), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <Link href={`/study/${item.id}`}
          className="flex-shrink-0 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-105"
          style={{ background: iconColor + '10', color: iconColor }}>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
