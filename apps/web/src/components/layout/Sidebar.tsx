'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { LogoMark } from '../ui/Logo';
import {
  CheckSquare, BookOpen, Bot, Search, Calendar,
  Settings, LogOut, CalendarDays, LayoutGrid, Trophy,
  Sun, Moon, X, ChevronLeft, ChevronRight,
} from 'lucide-react';

interface NavItem {
  href:   string;
  label:  string;
  Icon:   React.ElementType;
  color:  string;
  exact?: boolean;
}

const NAV_GROUPS: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [
      { href: '/home',  label: 'Overview', Icon: LayoutGrid,   color: '#818cf8', exact: true },
      { href: '/tasks', label: 'To-Do',    Icon: CheckSquare,  color: '#60a5fa' },
    ],
  },
  {
    label: 'Learning',
    items: [
      { href: '/study',    label: 'Study Planner', Icon: BookOpen,     color: '#34d399' },
      { href: '/schedule', label: 'Schedule',      Icon: CalendarDays, color: '#a78bfa' },
    ],
  },
  {
    label: 'AI Tools',
    items: [
      { href: '/ai',     label: 'AI Chat',  Icon: Bot,    color: '#f472b6' },
      { href: '/search', label: 'Research', Icon: Search, color: '#38bdf8' },
    ],
  },
  {
    label: 'More',
    items: [
      { href: '/calendar', label: 'Calendar', Icon: Calendar, color: '#fb923c' },
      { href: '/progress', label: 'Progress', Icon: Trophy,   color: '#fbbf24' },
    ],
  },
];

interface SidebarProps {
  onClose?:   () => void;
  collapsed?: boolean;
  onToggle?:  () => void;
}

export default function Sidebar({ onClose, collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout }       = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  function isActive({ href, exact }: NavItem) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

  function handleLogout() {
    logout();
    router.push('/login');
  }

  // ── Collapsed (icon-only) sidebar ──────────────────────────────────────────
  if (collapsed) {
    return (
      <aside className="w-14 h-full flex flex-col flex-shrink-0 sidebar">
        {/* Logo icon */}
        <div className="h-16 flex items-center justify-center sidebar-border-b flex-shrink-0">
          <Link href="/home" title="Home">
            <LogoMark size={28} className="hover:scale-105 transition-transform duration-200" />
          </Link>
        </div>

        {/* Nav icons */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto flex flex-col items-center gap-1 scrollbar-thin">
          {NAV_GROUPS.flatMap(g => g.items).map(item => {
            const active   = isActive(item);
            const { Icon } = item;
            return (
              <Link key={item.href} href={item.href} title={item.label}
                className={`p-2.5 rounded-xl transition-all duration-150 ${
                  active
                    ? 'nav-item-active'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}>
                <Icon className="w-4 h-4" style={{ color: active ? item.color : undefined }} />
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-2 sidebar-border-t flex flex-col items-center gap-1 flex-shrink-0">
          <button onClick={toggleTheme} title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            className="p-2.5 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all duration-150">
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link href="/settings" title="Settings"
            className={`p-2.5 rounded-xl transition-all duration-150 ${
              pathname === '/settings' ? 'nav-item-active' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}>
            <Settings className="w-4 h-4" style={{ color: pathname === '/settings' ? '#94a3b8' : undefined }} />
          </Link>
          <button onClick={onToggle} title="Expand sidebar"
            className="p-2.5 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all duration-150">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  // ── Full expanded sidebar ──────────────────────────────────────────────────
  return (
    <aside className="w-60 h-full flex flex-col flex-shrink-0 sidebar">

      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 sidebar-border-b flex-shrink-0">
        <Link href="/home" className="flex items-center gap-3 flex-1 min-w-0 group">
          <LogoMark size={32} className="flex-shrink-0 group-hover:scale-105 transition-transform duration-200" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight truncate tracking-tight">
              Smart Productivity
            </p>
            <p className="text-[10px] text-slate-500 leading-tight">AI-powered learning</p>
          </div>
        </Link>
        {/* Mobile close */}
        <button onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors flex-shrink-0"
          aria-label="Close menu">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4 scrollbar-thin">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div className="flex items-center gap-2.5 px-3 mb-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 whitespace-nowrap">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active   = isActive(item);
                const { Icon } = item;
                return (
                  <Link key={item.href} href={item.href}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                      active ? 'nav-item-active' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                    }`}>
                    <Icon className="w-4 h-4 flex-shrink-0 transition-transform duration-150 group-hover:scale-110"
                      style={{ color: active ? item.color : undefined }} />
                    <span className="flex-1 leading-none">{item.label}</span>
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="p-3 sidebar-border-t space-y-0.5 flex-shrink-0">
        <button onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all duration-150"
          aria-label="Toggle theme">
          {theme === 'dark'
            ? <Sun className="w-3.5 h-3.5 text-amber-400" />
            : <Moon className="w-3.5 h-3.5 text-slate-400" />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        <Link href="/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
            pathname === '/settings' ? 'nav-item-active' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
          }`}>
          <Settings className="w-3.5 h-3.5" style={{ color: pathname === '/settings' ? '#94a3b8' : undefined }} />
          Settings
        </Link>

        {/* User card */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/4 mt-1">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#818cf8,#c084fc)' }}>
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate leading-tight">{user?.name}</p>
            <p className="text-[10px] text-slate-500 truncate leading-tight">{user?.email}</p>
          </div>
        </div>

        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150 mt-0.5">
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>

        {/* Collapse toggle */}
        <button onClick={onToggle}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all duration-150">
          <ChevronLeft className="w-3.5 h-3.5" />
          Collapse sidebar
        </button>
      </div>
    </aside>
  );
}
