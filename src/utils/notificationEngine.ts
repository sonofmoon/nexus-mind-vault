/**
 * 🔔 Nexus Mind Vault — Native Desktop & In-App Notification Engine
 */
import { JournalEntry } from '../types';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
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
  if (!('Notification' in window) || Notification.permission !== 'granted') {
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
