'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Flame, Zap, Bell, Check, X, Menu } from 'lucide-react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useStatsStore } from '../../store/useStatsStore';
import type { Notification } from '../../types';

const ROUTE_META: [string, { title: string; sub: string }][] = [
  ['/home',     { title: 'Dashboard',      sub: 'Your productivity overview'              }],
  ['/tasks',    { title: 'My Tasks',        sub: 'Track and manage your to-dos'           }],
  ['/study',    { title: 'Study Planner',   sub: 'Manage your learning subjects'          }],
  ['/schedule', { title: 'Weekly Schedule', sub: 'Your AI-generated study plan'           }],
  ['/progress', { title: 'My Progress',     sub: 'XP, levels, streaks & achievements'    }],
  ['/ai',       { title: 'AI Assistant',    sub: 'Chat and research powered by Gemini'   }],
  ['/search',   { title: 'Smart Search',    sub: 'Find handouts, papers & books'         }],
  ['/calendar', { title: 'Calendar',        sub: 'Your schedule at a glance'             }],
  ['/settings', { title: 'Settings',        sub: 'Preferences and account options'       }],
];

function getPageMeta(pathname: string) {
  const exact = ROUTE_META.find(([p]) => pathname === p);
  if (exact) return exact[1];
  const prefix = ROUTE_META.slice().sort((a, b) => b[0].length - a[0].length)
    .find(([p]) => p !== '/' && pathname.startsWith(p));
  if (prefix) return prefix[1];
  return { title: 'Smart Productivity', sub: 'AI-powered learning' };
}

function fmtNotifDate(iso: string) {
  const d    = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (diff < 1)  return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  const hrs = Math.floor(diff / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const NOTIF_ICON: Record<string, string> = {
  alarm:       '⏰',
  warning:     '⚠️',
  achievement: '🏆',
  reminder:    '🔔',
  system:      '📣',
};

interface TopBarProps {
  onMenuClick?: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const user     = useAuthStore(s => s.user);
  const { stats, setStats } = useStatsStore();

  const [notifs,     setNotifs]     = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const meta   = getPageMeta(pathname);
  const unread = notifs.filter(n => !n.read).length;

  useEffect(() => {
    if (!stats) {
      api.get('/api/stats').then(({ data }) => setStats(data.data)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    api.get('/api/notifications').then(({ data }) => setNotifs(data.data ?? [])).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function markRead(id: string) {
    await api.patch(`/api/notifications/${id}/read`).catch(() => {});
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function markAllRead() {
    await api.patch('/api/notifications/read-all').catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }

  const xpPct = stats && stats.xpRange > 0
    ? Math.round((stats.xpProgress / stats.xpRange) * 100) : 0;

  return (
    <header className="topbar h-14 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">

      {/* Left — mobile menu + page title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
            {meta.title}
          </h1>
          <p className="text-[11px] text-slate-400 leading-tight mt-0.5 hidden sm:block">{meta.sub}</p>
        </div>
      </div>

      {/* Right — stats + notifications + avatar */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">

        {/* Streak badge */}
        {stats && stats.streak > 0 && (
          <Link href="/progress"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-opacity hover:opacity-80 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-orange-600 dark:text-orange-400">{stats.streak}d</span>
          </Link>
        )}

        {/* XP + Level */}
        {stats && (
          <Link href="/progress"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-opacity hover:opacity-80 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700/40">
            <Zap className="w-3.5 h-3.5 text-primary-500" />
            <span className="font-bold text-primary-700 dark:text-primary-300">Lv.{stats.level}</span>
            <div className="xp-bar-track w-12">
              <div className="xp-bar-fill" style={{ width: `${xpPct}%` }} />
            </div>
          </Link>
        )}

        {/* Notification bell */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setShowNotifs(v => !v)}
            className="relative w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-10 w-80 notif-dropdown rounded-2xl border shadow-xl z-50 overflow-hidden animate-slide-up">
              <div className="flex items-center justify-between px-4 py-3 border-b notif-border">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Notifications{unread > 0 && <span className="text-primary-500 ml-1">({unread})</span>}
                </p>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button onClick={markAllRead}
                      className="text-[11px] text-primary-500 hover:text-primary-700 font-semibold transition-colors">
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setShowNotifs(false)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="py-10 text-center text-slate-400">
                    <Bell className="w-7 h-7 mx-auto mb-2 opacity-25" />
                    <p className="text-xs">No notifications yet</p>
                  </div>
                ) : (
                  notifs.slice(0, 20).map(n => (
                    <div key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b notif-border transition-colors ${
                        n.read ? 'notif-read' : 'notif-unread'
                      }`}>
                      <span className="text-sm flex-shrink-0 mt-0.5">
                        {NOTIF_ICON[n.type] ?? '🔔'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold leading-snug ${n.read ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>
                        )}
                        <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">
                          {fmtNotifDate(n.createdAt)}
                        </p>
                      </div>
                      {!n.read && (
                        <button onClick={() => markRead(n.id)}
                          title="Mark read"
                          className="p-1 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 text-primary-400 transition-colors flex-shrink-0">
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {notifs.length > 20 && (
                <div className="px-4 py-2.5 border-t notif-border">
                  <p className="text-[10px] text-slate-400 text-center">
                    Showing 20 of {notifs.length} notifications
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Avatar */}
        <Link href="/settings"
          className="w-8 h-8 rounded-full text-xs font-bold text-white flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105"
          style={{ background: 'linear-gradient(135deg,#818cf8,#c084fc)', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}>
          {user?.name?.[0]?.toUpperCase() ?? 'U'}
        </Link>
      </div>
    </header>
  );
}
