'use client';
import { useEffect, useState } from 'react';
import { Bell, Trash2, Check } from 'lucide-react';
import { api } from '../../lib/api';
import type { Notification } from '../../types';

interface NotifWithType extends Notification {
  icon?: string;
  color?: string;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotifWithType[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, []);

  async function fetchNotifications() {
    try {
      const { data } = await api.get('/api/notifications');
      if (Array.isArray(data.data)) {
        setNotifications(
          data.data.map((n: any) => ({
            ...n,
            icon: n.type === 'alarm' ? '⏰' : n.type === 'warning' ? '⚠️' : '📋',
            color: n.type === 'alarm' ? 'red' : n.type === 'warning' ? 'yellow' : 'blue',
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: string) {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications(n =>
        n.map(notif => (notif.id === id ? { ...notif, read: true } : notif))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }

  async function markAllRead() {
    try {
      await api.patch('/api/notifications/read-all');
      setNotifications(n => n.map(notif => ({ ...notif, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      {/* Notification bell icon */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 inline-flex items-center justify-center h-5 w-5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification panel */}
      {expanded && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell size={32} className="mx-auto mb-2 opacity-20" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`px-4 py-3 border-b hover:bg-gray-50 transition cursor-pointer ${
                    !notif.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => !notif.read && markRead(notif.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">{notif.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {notif.title}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {notif.body}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {!notif.read && (
                      <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="bg-gray-50 px-4 py-2 border-t text-center">
              <a
                href="/tasks"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all tasks
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
