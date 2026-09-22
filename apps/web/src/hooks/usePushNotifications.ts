'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';

interface PushState {
  supported: boolean;
  configured: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
  loading: boolean;
  error: string | null;
  dismissed: boolean;
}

const DISMISSED_KEY = 'push-notification-prompt-dismissed';

/**
 * Hook to manage push notification subscriptions.
 * Registers Service Worker and handles browser push permissions.
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushState>({
    supported: false,
    configured: false,
    permission: 'unsupported',
    subscribed: false,
    loading: true,
    error: null,
    dismissed: false,
  });

  useEffect(() => {
    const isSupported =
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;
    const dismissed = localStorage.getItem(DISMISSED_KEY) === 'true';
    const permission = isSupported ? Notification.permission : 'unsupported';
    setState(prev => ({ ...prev, supported: isSupported, permission, dismissed }));

    if (!isSupported) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    (async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        const subscription = await registration.pushManager.getSubscription();
        const { data } = await api.get('/api/notifications/vapid-key');
        const configured = typeof data.vapidPublicKey === 'string' && data.vapidPublicKey.length > 0;
        setState(prev => ({ ...prev, configured, subscribed: !!subscription, loading: false }));
      } catch (err) {
        console.error('Push notification setup failed:', err);
        setState(prev => ({ ...prev, loading: false, error: 'Push notifications are unavailable' }));
      }
    })();
  }, []);

  // Request permission and subscribe to push
  const subscribe = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      if (!state.configured) throw new Error('Push notifications are not configured');
      const permission = Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission;
      setState(prev => ({ ...prev, permission }));
      if (permission !== 'granted') {
        setState(prev => ({
          ...prev,
          error: permission === 'denied'
            ? 'Notifications are blocked in your browser settings'
            : 'Notification permission was not granted',
          loading: false,
        }));
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      if (!registration) throw new Error('Service Worker not ready');

      // Get VAPID public key from API
      const { data } = await api.get('/api/notifications/vapid-key');
      if (!data.vapidPublicKey) throw new Error('Push notifications are not configured');

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.vapidPublicKey) as unknown as ArrayBuffer,
      });

      // Send subscription to backend
      await api.post('/api/notifications/subscribe', { subscription });

      setState(prev => ({
        ...prev,
        subscribed: true,
        loading: false,
      }));

      console.log('Push notification subscribed');
    } catch (err: any) {
      console.error('Push subscription failed:', err);
      setState(prev => ({
        ...prev,
        error: err.message || 'Failed to subscribe to push notifications',
        loading: false,
      }));
    }
  }, [state.configured]);

  // Unsubscribe from push
  const unsubscribe = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        // Notify backend
        await api.post('/api/notifications/unsubscribe').catch(() => {});
      }

      setState(prev => ({
        ...prev,
        subscribed: false,
        loading: false,
      }));

      console.log('Push notification unsubscribed');
    } catch (err: any) {
      console.error('Unsubscribe failed:', err);
      setState(prev => ({
        ...prev,
        error: err.message || 'Failed to unsubscribe',
        loading: false,
      }));
    }
  }, []);

  const dismissPrompt = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setState(prev => ({ ...prev, dismissed: true }));
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
    dismissPrompt,
  };
}

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
