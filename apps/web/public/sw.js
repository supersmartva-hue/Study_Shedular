self.addEventListener('push', event => {
  let payload = { title: 'Smart Productivity', body: 'You have a reminder.', data: {} };
  try { payload = event.data?.json() ?? payload; } catch {}

  const options = {
    body:    payload.body,
    icon:    '/icon-192.png',
    badge:   '/icon-192.png',
    data:    payload.data ?? {},
    actions: [
      { action: 'open', title: 'View Task' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    requireInteraction: payload.data?.type === 'alarm',
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/tasks';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        return existing.navigate(url);
      }
      return clients.openWindow(url);
    })
  );
});
