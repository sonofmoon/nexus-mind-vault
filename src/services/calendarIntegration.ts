import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { JournalEntry } from '../types';

/**
 * 📅 Nexus Mind Vault — Google Calendar Integration Engine
 * Strict Zero-Knowledge Privacy Architecture:
 * - ZERO PLAINTEXT EGRESS: Reflection body content is NEVER sent to Google Calendar.
 * - Schedulable via entry.reminderDate & entry.reminderTime.
 * - Dual-mode: Direct REST API sync with cached OAuth token, plus zero-setup Web Intent fallback.
 */

export interface CalendarEventResult {
  success: boolean;
  eventUrl?: string;
  mode: 'api' | 'intent';
  message: string;
}

// In-memory token cache to prevent repeated popups within the session
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Calculates start and end timestamps respecting entry reminderDate and reminderTime.
 */
export function getEventDateRange(entry: JournalEntry): { startIso: string; endIso: string } {
  let start: Date;

  if (entry.reminderDate) {
    const timeStr = entry.reminderTime || '09:00';
    const parsed = new Date(`${entry.reminderDate}T${timeStr}:00`);
    start = !isNaN(parsed.getTime()) ? parsed : new Date();
  } else {
    const created = new Date(entry.createdAt);
    // If created recently (within past hour) or in future, use it; otherwise default to now
    if (!isNaN(created.getTime()) && created.getTime() > Date.now() - 3600000) {
      start = created;
    } else {
      start = new Date();
    }
  }

  // 30-minute reminder block
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

/**
 * Constructs Option A Strict Zero-Knowledge description.
 * Reflection body content is strictly excluded to uphold STRIDE Zero Plaintext Egress.
 */
export function buildZeroKnowledgeDescription(entry: JournalEntry): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://nexus-mind-vault.web.app';
  const lines: string[] = [
    '🧠 Nexus Mind Vault — Sovereign Reflection Reminder',
    `Mood: ${entry.mood ? entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1) : 'Neutral'}`,
  ];

  if (entry.folder) {
    lines.push(`Folder: ${entry.folder}`);
  }

  if (entry.tags && entry.tags.length > 0) {
    lines.push(`Tags: ${entry.tags.map((t) => (t.startsWith('#') ? t : '#' + t)).join(' ')}`);
  }

  lines.push('');
  lines.push('🔒 Zero-Knowledge Privacy: Personal reflection body is preserved strictly inside your sovereign vault.');
  lines.push(`👉 Open Vault: ${origin}`);

  return lines.join('\n');
}

/**
 * Formats an ISO string into Google Calendar compact date format: YYYYMMDDTHHmmssZ
 */
function toGCalDateTime(isoString: string): string {
  return isoString.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Generates an instant zero-dependency Google Calendar Web Intent URL.
 * Works across all browsers, PWAs, mobile devices, with zero OAuth API configuration required.
 */
export function generateGoogleCalendarUrl(entry: JournalEntry): string {
  const { startIso, endIso } = getEventDateRange(entry);
  const summary = `🧠 Journal: ${entry.title || 'Untitled Reflection'}`;
  const description = buildZeroKnowledgeDescription(entry);
  const dates = `${toGCalDateTime(startIso)}/${toGCalDateTime(endIso)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    summary
  )}&dates=${dates}&details=${encodeURIComponent(description)}`;
}

/**
 * Creates a Google Calendar event for the given journal entry.
 * 
 * 1. Tries direct Google Calendar REST API using cached or requested OAuth access token.
 * 2. If API fails, popup is blocked, or API is disabled in Cloud Console,
 *    gracefully falls back to opening the Google Calendar Web Intent.
 */
export async function createCalendarEvent(entry: JournalEntry): Promise<CalendarEventResult> {
  const summary = `🧠 Journal: ${entry.title || 'Untitled Reflection'}`;
  const description = buildZeroKnowledgeDescription(entry);
  const { startIso, endIso } = getEventDateRange(entry);
  const timeZone =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      : 'UTC';

  const intentUrl = generateGoogleCalendarUrl(entry);

  try {
    // 1. Acquire or reuse OAuth access token with calendar.events scope
    let token = cachedAccessToken;
    if (!token || Date.now() >= tokenExpiresAt) {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      token = credential?.accessToken || null;

      if (token) {
        cachedAccessToken = token;
        tokenExpiresAt = Date.now() + 50 * 60 * 1000; // 50 minutes cache
      }
    }

    if (!token) {
      throw new Error('No Google Calendar access token granted.');
    }

    // 2. Dispatch REST API event creation
    const eventPayload = {
      summary,
      description,
      start: {
        dateTime: startIso,
        timeZone,
      },
      end: {
        dateTime: endIso,
        timeZone,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 15 },
          { method: 'email', minutes: 60 },
        ],
      },
    };

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        eventUrl: data.htmlLink || intentUrl,
        mode: 'api',
        message: '📅 Event added directly to Google Calendar!',
      };
    }

    // If token expired (401), clear cached token
    if (res.status === 401) {
      cachedAccessToken = null;
      tokenExpiresAt = 0;
    }

    console.warn(`[CalendarIntegration] REST API returned status ${res.status}. Falling back to Web Intent.`);
  } catch (err: any) {
    console.warn('[CalendarIntegration] Direct REST API error, falling back to Web Intent:', err?.message || err);
  }

  // 3. Resilient Fallback: Launch Google Calendar Web Intent
  try {
    if (typeof window !== 'undefined') {
      window.open(intentUrl, '_blank', 'noopener,noreferrer');
    }
    return {
      success: true,
      eventUrl: intentUrl,
      mode: 'intent',
      message: '📅 Opening Google Calendar to confirm your reflection reminder!',
    };
  } catch {
    return {
      success: false,
      eventUrl: intentUrl,
      mode: 'intent',
      message: 'Unable to open Google Calendar. Please check popup permissions.',
    };
  }
}
