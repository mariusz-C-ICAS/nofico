import { getRemoteConfig, fetchAndActivate, getString, getBoolean } from 'firebase/remote-config';
import { getApp } from 'firebase/app';

const FUNCTIONS_BASE = import.meta.env.VITE_FUNCTIONS_URL ?? 'https://europe-west1-cicas-os.cloudfunctions.net';
const POLL_INTERVAL_MS = 5 * 60 * 1000;

let _pollTimer: ReturnType<typeof setInterval> | null = null;
let _currentStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE' = 'ONLINE';
const _listeners = new Set<(status: typeof _currentStatus) => void>();

export function onKsefStatusChange(cb: (status: typeof _currentStatus) => void): () => void {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

export function getKsefStatus(): typeof _currentStatus {
  return _currentStatus;
}

export function isKsefOfflineMode(): boolean {
  try {
    const rc = getRemoteConfig(getApp());
    return getBoolean(rc, 'ksef_offline_mode');
  } catch {
    return _currentStatus !== 'ONLINE';
  }
}

async function checkKsefHealth(): Promise<void> {
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/healthCheck`, { method: 'GET' });
    const data = await res.json();

    const kseStatus = data.services?.ksef ?? 'unknown';
    let newStatus: typeof _currentStatus;

    if (!res.ok || kseStatus === 'down') {
      newStatus = 'OFFLINE';
    } else if (kseStatus === 'degraded' || data.dbLatencyMs > 2000) {
      newStatus = 'DEGRADED';
    } else {
      newStatus = 'ONLINE';
    }

    if (newStatus !== _currentStatus) {
      _currentStatus = newStatus;
      _listeners.forEach(cb => cb(newStatus));
      window.dispatchEvent(new CustomEvent('cicas:ksef-status-changed', { detail: { status: newStatus } }));
    }
  } catch {
    if (_currentStatus !== 'OFFLINE') {
      _currentStatus = 'OFFLINE';
      _listeners.forEach(cb => cb('OFFLINE'));
      window.dispatchEvent(new CustomEvent('cicas:ksef-status-changed', { detail: { status: 'OFFLINE' } }));
    }
  }
}

export function startKsefMonitor(): void {
  if (_pollTimer) return;
  checkKsefHealth();
  _pollTimer = setInterval(checkKsefHealth, POLL_INTERVAL_MS);
}

export function stopKsefMonitor(): void {
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
}
