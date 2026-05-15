import {
  doc, getDoc, setDoc, collection, getDocs,
  serverTimestamp, query, where, onSnapshot,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import type { GpsPosition } from '../types';

// ── Tracking config (per tenant, service type, client, project) ───────────────

export interface TrackingScope {
  tenantId: string;
  serviceTypeId?: string;
  clientId?: string;
  projectId?: string;
}

export interface WorkerTrackingConfig {
  tenantId: string;
  enabled: boolean;
  windowMinutesBefore: number;   // default 60
  clientAccuracyMeters: number;  // default 1000 (1km blur)
  refreshIntervalMinutes: number; // default 5
  serviceTypeIds?: string[];     // empty = all
  clientIds?: string[];          // empty = all
  projectIds?: string[];         // empty = all
  updatedAt?: any;
}

const configPath = (t: string) => `tenants/${t}/config/workerTracking`;

export async function getTrackingConfig(tenantId: string): Promise<WorkerTrackingConfig> {
  const snap = await getDoc(doc(db, configPath(tenantId)));
  if (!snap.exists()) {
    return {
      tenantId,
      enabled: false,
      windowMinutesBefore: 60,
      clientAccuracyMeters: 1000,
      refreshIntervalMinutes: 5,
    };
  }
  return snap.data() as WorkerTrackingConfig;
}

export async function saveTrackingConfig(cfg: WorkerTrackingConfig): Promise<void> {
  await setDoc(doc(db, configPath(cfg.tenantId)), {
    ...cfg,
    updatedAt: serverTimestamp(),
  });
}

// ── Position read for manager (full accuracy) ─────────────────────────────────

const positionPath = (t: string, uid: string) => `tenants/${t}/gpsPositions/${uid}`;

export function subscribeWorkerPositions(
  tenantId: string,
  workerIds: string[],
  onUpdate: (positions: Record<string, GpsPosition>) => void
): () => void {
  const unsubs: (() => void)[] = [];
  const map: Record<string, GpsPosition> = {};

  workerIds.forEach(uid => {
    const unsub = onSnapshot(doc(db, positionPath(tenantId, uid)), snap => {
      if (snap.exists()) map[uid] = snap.data() as GpsPosition;
      else delete map[uid];
      onUpdate({ ...map });
    });
    unsubs.push(unsub);
  });

  return () => unsubs.forEach(u => u());
}

export async function getWorkerPosition(
  tenantId: string,
  workerId: string
): Promise<GpsPosition | null> {
  const snap = await getDoc(doc(db, positionPath(tenantId, workerId)));
  return snap.exists() ? (snap.data() as GpsPosition) : null;
}

// ── Position blur for client portal (1km accuracy) ───────────────────────────

const KM_PER_DEGREE = 111.32;

export function blurPosition(
  lat: number,
  lng: number,
  accuracyMeters: number
): { lat: number; lng: number } {
  const deltaDeg = (accuracyMeters / 1000) / KM_PER_DEGREE;
  // Round to nearest delta (not random — deterministic for consistent UX)
  return {
    lat: Math.round(lat / deltaDeg) * deltaDeg,
    lng: Math.round(lng / deltaDeg) * deltaDeg,
  };
}

// ── Check if client should see worker position now ───────────────────────────

export function isTrackingWindowActive(
  scheduledStartMs: number,
  windowMinutesBefore: number
): boolean {
  const now = Date.now();
  const windowStart = scheduledStartMs - windowMinutesBefore * 60_000;
  return now >= windowStart && now <= scheduledStartMs + 2 * 60 * 60_000; // up to 2h after
}
