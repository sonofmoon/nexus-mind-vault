/**
 * 🔔 Nexus Mind Vault — Native Desktop & Server-Side Web Push Notification Engine
 * - Manages Browser Push Subscriptions via W3C PushManager (RFC 8291 / VAPID)
 * - Persists device endpoints to Cloud Firestore via /api/notifications/subscribe
 * - Coordinates scheduled reflection reminders and background dispatch
 */
import { JournalEntry } from '../types';
import { authenticatedFetch } from '../services/apiClient';

// Sovereign Public VAPID Key (RFC 8292 Web Push Application Server Key)
export const DEFAULT_VAPID_PUBLIC_KEY =
  'BFxdF_jvygQI0M8MX84-fEujfGOtDNyzaGTnT3wz8rypEu2nIMIvx5iOKarM_-UJwy9LJOQUwCGG8bbdBBlngAE';

/**
 * Converts a base64 string to a Uint8Array for PushManager subscription
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

export function showDesktopNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const defaultOptions: NotificationOptions = {
    icon: '/nmv-logo.png',
    badge: '/nmv-logo.png',
    silent: false,
    ...options,
  };

  try {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, defaultOptions);
      });
    } else {
      new Notification(title, defaultOptions);
    }
  } catch (err) {
    console.warn('[Notification] Could not display native notification:', err);
  }
}

/**
 * 🚀 Registers and saves a Web Push subscription with the server for background pushes
 */
export async function subscribeToPushNotifications(uid: string): Promise<PushSubscription | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[PushEngine] Web Push is not supported in this environment.');
    return null;
  }

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.warn('[PushEngine] Notification permission denied.');
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(DEFAULT_VAPID_PUBLIC_KEY);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any,
      });
    }

    if (subscription) {
      // Persist subscription to server & Firestore
      await authenticatedFetch('/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
          subscribedAt: new Date().toISOString(),
        }),
      });
      console.info('[PushEngine] 🛡️ Web Push subscription registered & synced with enclave.');
    }

    return subscription;
  } catch (err) {
    console.error('[PushEngine] Failed to register push subscription:', err);
    return null;
  }
}

/**
 * Unsubscribes from server-side Web Push notifications
 */
export async function unsubscribeFromPushNotifications(uid: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      await authenticatedFetch('/api/notifications/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
    }
    return true;
  } catch (e) {
    console.warn('[PushEngine] Unsubscribe failed:', e);
    return false;
  }
}

/**
 * Returns the current push notification capabilities and subscription state
 */
export async function getPushSubscriptionStatus(): Promise<{
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
}> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { isSupported: false, isSubscribed: false, permission: 'denied' };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return {
      isSupported: true,
      isSubscribed: !!sub,
      permission: Notification.permission,
    };
  } catch {
    return { isSupported: true, isSubscribed: false, permission: Notification.permission };
  }
}

/**
 * ⏰ Schedules and checks pending reflection reminders against local entries
 */
export function initGlobalReminderMonitor(
  getEntries: () => JournalEntry[],
  showToast: (msg: string, type: 'info' | 'success') => void
): () => void {
  const triggeredMap = new Set<string>();

  const checkReminders = () => {
    const entries = getEntries();
    const now = new Date();
    const currentDateStr = now.toISOString().split('T')[0];
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    entries.forEach((entry) => {
      if (entry.reminderDate && entry.reminderDate === currentDateStr) {
        const reminderTime = entry.reminderTime || '09:00';
        const key = `${entry.id}_${entry.reminderDate}_${reminderTime}`;

        if (!triggeredMap.has(key) && reminderTime <= currentTimeStr) {
          triggeredMap.add(key);

          // 1. Show Native Desktop Notification
          showDesktopNotification(`⏰ Reflection Reminder: ${entry.title}`, {
            body: `Scheduled check-in: "${entry.title}". Open your vault to reflect.`,
            tag: key,
          });

          // 2. Show in-app Toast
          showToast(`⏰ Reminder: "${entry.title}" is due for reflection.`, 'info');
        }
      }
    });
  };

  // Run immediate check and interval every 30 seconds
  checkReminders();
  const intervalId = setInterval(checkReminders, 30000);

  return () => clearInterval(intervalId);
}
