/**
 * 💻 Nexus Mind Vault — Multi-Device Session Footprint & Revocation Manager
 */

export interface DeviceSession {
  sessionId: string;
  deviceId: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ipPlaceholder: string;
  isCurrentDevice: boolean;
  firstSeenAt: string;
  lastActiveAt: string;
}

const DEVICE_ID_KEY = 'vault_unique_device_id';
const SESSIONS_STORAGE_KEY = 'vault_registered_device_sessions';

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function detectPlatform(): { browser: string; os: string; deviceType: 'desktop' | 'mobile' | 'tablet' } {
  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';
  if (ua.includes('Chrome')) browser = 'Google Chrome';
  else if (ua.includes('Safari')) browser = 'Apple Safari';
  else if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
  else if (ua.includes('Edg')) browser = 'Microsoft Edge';

  let os = 'Unknown OS';
  if (ua.includes('Windows')) os = 'Windows 11 / 10';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS Sonoma';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const deviceType = isMobile ? (ua.includes('iPad') ? 'tablet' : 'mobile') : 'desktop';

  return { browser, os, deviceType };
}

export function registerCurrentDeviceSession(userId: string): DeviceSession {
  const deviceId = getOrCreateDeviceId();
  const { browser, os, deviceType } = detectPlatform();
  const now = new Date().toISOString();

  let sessions: DeviceSession[] = JSON.parse(localStorage.getItem(`${SESSIONS_STORAGE_KEY}_${userId}`) || '[]');

  let current = sessions.find(s => s.deviceId === deviceId);
  if (current) {
    current.lastActiveAt = now;
    current.isCurrentDevice = true;
  } else {
    current = {
      sessionId: 'sess_' + Date.now().toString(36),
      deviceId,
      deviceType,
      browser,
      os,
      ipPlaceholder: 'Local Enclave / Encrypted Loopback',
      isCurrentDevice: true,
      firstSeenAt: now,
      lastActiveAt: now,
    };
    sessions.push(current);
  }

  // Ensure only this device is marked current
  sessions = sessions.map(s => ({
    ...s,
    isCurrentDevice: s.deviceId === deviceId,
  }));

  localStorage.setItem(`${SESSIONS_STORAGE_KEY}_${userId}`, JSON.stringify(sessions));
  return current;
}

export function getActiveDeviceSessions(userId: string): DeviceSession[] {
  registerCurrentDeviceSession(userId);
  const sessions: DeviceSession[] = JSON.parse(localStorage.getItem(`${SESSIONS_STORAGE_KEY}_${userId}`) || '[]');
  return sessions.sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());
}

export function revokeDeviceSession(userId: string, sessionId: string): DeviceSession[] {
  const currentDeviceId = getOrCreateDeviceId();
  let sessions: DeviceSession[] = JSON.parse(localStorage.getItem(`${SESSIONS_STORAGE_KEY}_${userId}`) || '[]');
  sessions = sessions.filter(s => s.sessionId !== sessionId);
  localStorage.setItem(`${SESSIONS_STORAGE_KEY}_${userId}`, JSON.stringify(sessions));
  return sessions;
}

export function revokeAllOtherDeviceSessions(userId: string): DeviceSession[] {
  const currentDeviceId = getOrCreateDeviceId();
  let sessions: DeviceSession[] = JSON.parse(localStorage.getItem(`${SESSIONS_STORAGE_KEY}_${userId}`) || '[]');
  sessions = sessions.filter(s => s.deviceId === currentDeviceId);
  localStorage.setItem(`${SESSIONS_STORAGE_KEY}_${userId}`, JSON.stringify(sessions));
  return sessions;
}
