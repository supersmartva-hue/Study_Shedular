'use client';
import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday } from 'date-fns';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../../lib/api';
import type { Task } from '../../../types';

const PRIORITY_COLOR: Record<number, string> = {
  1: 'bg-green-400', 2: 'bg-yellow-400', 3: 'bg-red-400',
};

export default function CalendarPage() {
  const [current,  setCurrent]  = useState(new Date());
  const [grouped,  setGrouped]  = useState<Record<string, Task[]>>({});
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const y = current.getFullYear();
    const m = current.getMonth() + 1;
    api.get(`/api/tasks/calendar?year=${y}&month=${m}`)
      .then(({ data }) => setGrouped(data.data))
      .catch(() => toast.error('Could not load calendar'));
  }, [current]);

  const days     = eachDayOfInterval({ start: startOfMonth(current), end: endOfMonth(current) });
  const startPad = getDay(startOfMonth(current));

  const selectedTasks = selected ? (grouped[selected] ?? []) : [];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800">{format(current, 'MMMM yyyy')}</h2>
        <div className="flex gap-2">
          <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="btn btn-secondary p-2">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => { setCurrent(new Date()); setSelected(format(new Date(), 'yyyy-MM-dd')); }}
            className="btn btn-secondary text-xs px-3">
            Today
          </button>
          <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            className="btn btn-secondary p-2">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="card overflow-hidden mb-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border)' }}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} className="h-20 border-b border-r" style={{ borderColor: 'var(--border)' }} />
          ))}

          {days.map(day => {
            const key    = format(day, 'yyyy-MM-dd');
            const tasks  = grouped[key] ?? [];
            const today  = isToday(day);
            const active = selected === key;

            return (
              <div key={key} onClick={() => setSelected(active ? null : key)}
                className={`h-20 p-1.5 border-b border-r cursor-pointer transition-colors hover:bg-slate-50 ${
                  active ? 'bg-primary-50' : today ? 'bg-indigo-50' : ''
                }`}
                style={{ borderColor: 'var(--border)' }}>

                <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1 ${
                  today ? 'bg-primary-500 text-white' : 'text-slate-700'
                }`}>
                  {format(day, 'd')}
                </div>

                <div className="space-y-0.5">
                  {tasks.slice(0, 3).map(t => (
                    <div key={t.id} className="flex items-center gap-1 truncate">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_COLOR[t.priority]}`} />
                      <span className="text-xs text-slate-600 truncate">{t.title}</span>
                    </div>
                  ))}
                  {tasks.length > 3 && <p className="text-xs text-slate-400">+{tasks.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selected && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">
            {format(new Date(selected + 'T00:00:00'), 'EEEE, MMMM d')} — {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}
          </h3>
          {selectedTasks.length === 0 ? (
            <p className="text-xs text-slate-400">No tasks due this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedTasks.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_COLOR[t.priority]}`} />
                  <span className={`text-sm flex-1 ${t.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    {t.title}
                  </span>
                  {t.dueDate && (
                    <span className="text-xs text-slate-400">{format(new Date(t.dueDate), 'h:mm a')}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
