import { api } from './api';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
  if (!vapidKey) return;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly:      true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  await api.post('/api/notifications/subscribe', { subscription: sub.toJSON() });
  return sub;
}
