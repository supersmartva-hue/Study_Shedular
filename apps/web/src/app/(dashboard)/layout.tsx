'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { useStatsStore } from '../../store/useStatsStore';
import { api } from '../../lib/api';
import Sidebar from '../../components/layout/Sidebar';
import TopBar  from '../../components/layout/TopBar';

const LS_SIDEBAR_KEY = 'main_sidebar_collapsed';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const isAuth   = useAuthStore(s => s.isAuth);
  const user     = useAuthStore(s => s.user);
  const setStats = useStatsStore(s => s.setStats);

  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Restore collapse state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_SIDEBAR_KEY);
      if (saved === 'true') setSidebarCollapsed(true);
    } catch {}
  }, []);

  function toggleSidebarCollapsed() {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(LS_SIDEBAR_KEY, String(next)); } catch {}
      return next;
    });
  }

  useEffect(() => { if (!isAuth) router.replace('/login'); }, [isAuth, router]);

  useEffect(() => {
    if (user?.language && !localStorage.getItem('ai_language')) {
      localStorage.setItem('ai_language', user.language);
    }
  }, [user?.language]);

  useEffect(() => {
    if (pathname === '/home' || pathname === '/progress') {
      api.get('/api/stats').then(({ data }) => setStats(data.data)).catch(() => {});
    }
    setSidebarOpen(false);
  }, [pathname]);

  if (!isAuth) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-body)]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 lg:static lg:translate-x-0 transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebarCollapsed}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 content-area">
          {children}
        </main>
      </div>
    </div>
  );
}
