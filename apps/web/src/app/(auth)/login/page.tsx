'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/useAuthStore';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';

/* Shape stored by the public dashboard in localStorage */
interface StoredTask {
  title:        string;
  description?: string;
  priority?:    number;
  dueDate?:     string;
}

export default function LoginPage() {
  const router  = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);

  const [form,    setForm]    = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      /* ── 1. Authenticate ──────────────────────────────────────────────── */
      const { data } = await api.post('/api/auth/login', form);
      setAuth(data.data.user, data.data.token, data.data.refreshToken);
      toast.success(`Welcome back, ${data.data.user.name}!`);

      /* ── 2. Migrate any localStorage tasks → API ──────────────────────── */
      await migrateLocalTasks();

      /* ── 3. Navigate to the dashboard overview (To-Do shown first) ──── */
      router.push('/home');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
        <p className="text-sm text-slate-500 mt-1">Sign in to continue your study streak</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email" required autoFocus
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="input input-icon"
              placeholder="you@example.com"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type={showPw ? 'text' : 'password'} required
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="input input-icon pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPw(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full justify-center py-2.5 mt-2 text-sm">
          {loading ? <Spinner /> : <LogIn className="w-4 h-4" />}
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400">or</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      <p className="text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
          Create one free
        </Link>
      </p>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

/**
 * Imports tasks the user created before logging in (stored in localStorage)
 * into their account via the API. Clears localStorage on success so tasks
 * are not duplicated if the user logs in again from another device.
 */
async function migrateLocalTasks(): Promise<void> {
  try {
    const raw = localStorage.getItem('tf_tasks');
    if (!raw) return;

    const tasks: StoredTask[] = JSON.parse(raw);
    if (!tasks.length) return;

    const response = await api.post('/api/tasks/sync-local', tasks);
    localStorage.removeItem('tf_tasks');

    if (response.data.count > 0) {
      toast.success(`${response.data.count} task${response.data.count !== 1 ? 's' : ''} imported!`);
    }
  } catch (err: any) {
    console.error('Task migration failed:', err);
    // Don't show error toast - migration is not critical
  }
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
