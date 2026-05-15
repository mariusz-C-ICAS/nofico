import {
  doc, setDoc, getDoc, serverTimestamp, collection, addDoc,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import type { GpsPosition, GpsConsent } from '../types';

const consentPath  = (t: string, uid: string) => `tenants/${t}/gpsConsents/${uid}`;
const positionPath = (t: string, uid: string) => `tenants/${t}/gpsPositions/${uid}`;
const historyPath  = (t: string, uid: string) => `tenants/${t}/gpsHistory/${uid}/tracks`;

// ── Consent management ────────────────────────────────────────────────────────

export async function getGpsConsent(tenantId: string, workerId: string): Promise<GpsConsent | null> {
  const snap = await getDoc(doc(db, consentPath(tenantId, workerId)));
  if (!snap.exists()) return null;
  return snap.data() as GpsConsent;
}

export async function saveGpsConsent(
  tenantId: string,
  workerId: string,
  hasConsent: boolean
): Promise<void> {
  await setDoc(doc(db, consentPath(tenantId, workerId)), {
    workerId,
    tenantId,
    hasConsent,
    ...(hasConsent ? { consentDate: serverTimestamp() } : { revokedDate: serverTimestamp() }),
  });
}

// ── GPS position publishing ───────────────────────────────────────────────────

let watchId: number | null = null;

export function startTracking(
  tenantId: string,
  workerId: string,
  workerEmail: string,
  workerName: string,
  eventId?: string
): () => void {
  if (!('geolocation' in navigator)) return () => {};

  watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      const position: Omit<GpsPosition, 'timestamp'> & { timestamp: any } = {
        workerId,
        workerEmail,
        workerName,
        tenantId,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: serverTimestamp(),
        eventId,
      };
      // Update live position
      await setDoc(doc(db, positionPath(tenantId, workerId)), position);
      // Append to history (every 60s only — throttled externally)
    },
    (err) => console.warn('GPS error:', err.message),
    { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
  );

  return () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  };
}

export async function publishPositionOnce(
  tenantId: string,
  workerId: string,
  workerEmail: string,
  workerName: string,
  eventId?: string
): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const data: Omit<GpsPosition, 'timestamp'> & { timestamp: any } = {
          workerId, workerEmail, workerName, tenantId, lat, lng, accuracy,
          timestamp: serverTimestamp(),
          eventId,
        };
        await setDoc(doc(db, positionPath(tenantId, workerId)), data);
        // Append to history
        await addDoc(collection(db, historyPath(tenantId, workerId)), data).catch(() => {});
        resolve({ lat, lng });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

// ── Travel time estimation ────────────────────────────────────────────────────

export function buildMapsNavUrl(address: string): string {
  return `https://maps.google.com/?daddr=${encodeURIComponent(address)}`;
}

export function buildCallWithEtaMessage(
  clientPhone: string,
  etaMinutes: number
): string {
  return `tel:${clientPhone}`;
}

export function buildSmsEtaMessage(clientPhone: string, etaMinutes: number): string {
  const text = encodeURIComponent(
    `Dzień dobry! Będę u Państwa za około ${etaMinutes} minut. Pozdrawiam.`
  );
  return `sms:${clientPhone}?body=${text}`;
}

export function estimateTravelTime(
  workerLat: number,
  workerLng: number,
  destLat: number,
  destLng: number
): number {
  // Haversine distance in km
  const R = 6371;
  const dLat = ((destLat - workerLat) * Math.PI) / 180;
  const dLng = ((destLng - workerLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((workerLat * Math.PI) / 180) *
      Math.cos((destLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Assume avg 40 km/h in urban + 15 min buffer
  return Math.round((km / 40) * 60 + 15);
}
