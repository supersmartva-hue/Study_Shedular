'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Save, User, Globe, Clock, Bell, BellOff } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/useAuthStore';

const LANGUAGES = [
  { value: 'english',    label: 'English' },
  { value: 'urdu',       label: 'اردو (Urdu)' },
  { value: 'roman_urdu', label: 'Roman Urdu' },
];

const TIMEZONES = [
  'UTC', 'Asia/Karachi', 'Asia/Kolkata', 'America/New_York',
  'America/Los_Angeles', 'Europe/London', 'Asia/Dubai',
];

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY ?? '';

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [form, setForm]  = useState({
    name:     user?.name     ?? '',
    language: user?.language ?? 'english',
    timezone: user?.timezone ?? 'UTC',
  });
  const [saving, setSaving] = useState(false);

  // Push notification state
  const [pushSupported,  setPushSupported]  = useState(false);
  const [pushEnabled,    setPushEnabled]    = useState(false);
  const [pushLoading,    setPushLoading]    = useState(false);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY;
    setPushSupported(supported);
    if (!supported) return;

    navigator.serviceWorker.register('/sw.js').then(async reg => {
      const sub = await reg.pushManager.getSubscription();
      setPushEnabled(!!sub);
    }).catch(() => {});
  }, []);
  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  async function togglePush() {
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      if (pushEnabled) {
        const sub = await reg.pushManager.getSubscription();
        await sub?.unsubscribe();
        await api.post('/api/notifications/unsubscribe');
        setPushEnabled(false);
        toast.success('Browser notifications disabled');
      } else {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') { toast.error('Notification permission denied'); return; }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        await api.post('/api/notifications/subscribe', { subscription: sub.toJSON() });
        setPushEnabled(true);
        toast.success('Browser notifications enabled!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not update notification settings');
    } finally {
      setPushLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const { data } = await api.patch('/api/auth/me', form);
      updateUser(data.data);
      // Sync language preference to AI chat
      localStorage.setItem('ai_language', form.language);
      toast.success('Settings saved!');
    } catch { toast.error('Save failed'); }
    finally  { setSaving(false); }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="card p-6 space-y-6">

        {/* Profile */}
        <div>
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
            <User className="w-3.5 h-3.5" /> Profile
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Display Name</label>
              <input value={form.name} onChange={f('name')} className="input" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Email</label>
              <input value={user?.email ?? ''} disabled className="input opacity-60 cursor-not-allowed" />
            </div>
          </div>
        </div>

        {/* AI Language */}
        <div className="border-t pt-6" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" /> AI Language
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {LANGUAGES.map(l => (
              <button key={l.value} type="button"
                onClick={() => setForm(prev => ({ ...prev, language: l.value as 'english' | 'urdu' | 'roman_urdu' }))}
                className={`py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                  form.language === l.value
                    ? 'border-primary-500 bg-primary-50 text-primary-600'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}>
                {l.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">The AI assistant will respond in this language by default.</p>
        </div>

        {/* Timezone */}
        <div className="border-t pt-6" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" /> Timezone
          </h3>
          <select value={form.timezone} onChange={f('timezone')} className="input">
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>

        {/* Browser Notifications */}
        <div className="border-t pt-6" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Bell className="w-3.5 h-3.5" /> Browser Notifications
          </h3>
          {!pushSupported ? (
            <p className="text-xs text-slate-400">
              {VAPID_PUBLIC_KEY
                ? 'Your browser does not support push notifications.'
                : 'Push notifications require a VAPID key — set NEXT_PUBLIC_VAPID_KEY to enable.'}
            </p>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {pushEnabled ? 'Notifications are on' : 'Notifications are off'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {pushEnabled
                    ? 'You will receive task reminders in your browser.'
                    : 'Enable to get task reminders even when the app is closed.'}
                </p>
              </div>
              <button onClick={togglePush} disabled={pushLoading}
                className={`btn flex-shrink-0 ${pushEnabled ? 'btn-danger' : 'btn-secondary'}`}>
                {pushEnabled ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                {pushLoading ? 'Updating…' : pushEnabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          )}
        </div>

        <button onClick={save} disabled={saving} className="btn btn-primary w-full justify-center py-2.5">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
