'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/useAuthStore';
import { User, Mail, Lock, UserPlus, Eye, EyeOff } from 'lucide-react';

/* Shape stored by the public dashboard in localStorage */
interface StoredTask {
  title:        string;
  description?: string;
  priority?:    number;
  dueDate?:     string;
}

export default function RegisterPage() {
  const router  = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);

  const [form,    setForm]    = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 8)       { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      /* ── 1. Create account ────────────────────────────────────────────── */
      const { data } = await api.post('/api/auth/register', {
        name:     form.name,
        email:    form.email,
        password: form.password,
      });
      setAuth(data.data.user, data.data.token, data.data.refreshToken);
      toast.success('Account created! Welcome 🎉');

      /* ── 2. Migrate any localStorage tasks → API ──────────────────────── */
      await migrateLocalTasks();

      /* ── 3. Navigate to the dashboard overview ───────────────────────── */
      router.push('/home');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  const strength =
    form.password.length === 0 ? 0
    : form.password.length < 8 ? 1
    : form.password.length < 10 ? 2
    : 3;
  const strengthLabel = ['', 'Weak', 'Good', 'Strong'];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#10b981'];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h2>
        <p className="text-sm text-slate-500 mt-1">Start your productivity journey for free</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" required autoFocus
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input input-icon"
              placeholder="Your name"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email" required
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
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPw(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {/* Strength bar */}
          {form.password.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${(strength / 3) * 100}%`, background: strengthColor[strength] }}
                />
              </div>
              <span className="text-[11px] font-medium" style={{ color: strengthColor[strength] }}>
                {strengthLabel[strength]}
              </span>
            </div>
          )}
        </div>

        {/* Confirm */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type={showPw ? 'text' : 'password'} required
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              className={`input input-icon ${
                form.confirm && form.confirm !== form.password
                  ? 'border-red-300 focus:!ring-red-200 focus:!border-red-400'
                  : ''
              }`}
              placeholder="Repeat password"
            />
          </div>
          {form.confirm && form.confirm !== form.password && (
            <p className="text-[11px] text-red-500 mt-1">Passwords don&apos;t match</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full justify-center py-2.5 mt-2 text-sm">
          {loading ? <Spinner /> : <UserPlus className="w-4 h-4" />}
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400">or</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

/**
 * Imports tasks the user created before registering (stored in localStorage)
 * into their new account via the API. Clears localStorage on success.
 */
async function migrateLocalTasks(): Promise<void> {
  try {
    const raw = localStorage.getItem('tf_tasks');
    if (!raw) return;

    const tasks: StoredTask[] = JSON.parse(raw);
    if (!tasks.length) return;

    await Promise.all(
      tasks.map(t =>
        api.post('/api/tasks', {
          title:       t.title,
          description: t.description,
          priority:    t.priority ?? 2,
          dueDate:     t.dueDate,
        })
      )
    );

    localStorage.removeItem('tf_tasks');
    toast.success(
      `${tasks.length} local task${tasks.length !== 1 ? 's' : ''} synced to your account`
    );
  } catch {
    /* Silent — tasks stay in localStorage; user can re-add manually */
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
