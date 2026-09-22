'use client';
import { Bell, X } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';

/**
 * Component to request push notification permission.
 * Shows banner if notifications are supported but not subscribed.
 */
export default function NotificationPermission() {
  const { supported, configured, permission, subscribed, loading, subscribe, dismissPrompt, dismissed } = usePushNotifications();

  if (!supported || !configured || permission === 'denied' || subscribed || dismissed || loading) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-slideUp">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-xl p-4">
        <div className="flex items-start gap-3">
          <Bell className="mt-1 flex-shrink-0" size={20} />
          <div className="flex-1">
            <h3 className="font-semibold">Get Task Reminders</h3>
            <p className="text-sm text-blue-100 mt-1">
              Enable notifications to receive reminders when your tasks are due
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => subscribe()}
                className="px-3 py-1.5 text-sm font-medium bg-white text-blue-600 rounded hover:bg-blue-50 transition"
              >
                Enable Notifications
              </button>
              <button
                onClick={dismissPrompt}
                className="px-3 py-1.5 text-sm font-medium text-blue-100 hover:text-white transition"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={dismissPrompt}
            className="flex-shrink-0 text-blue-100 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
