/**
 * videoMeetingService.ts
 * Zoom i MS Teams — tworzenie spotkań video i przypisanie do bookingu.
 */
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../../core/firebase/config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ZoomMeeting {
  id: number;
  joinUrl: string;
  password: string;
  hostUrl: string;
}

export interface TeamsMeeting {
  id: string;
  joinUrl: string;
}

export type VideoMeeting =
  | ({ provider: 'zoom' } & ZoomMeeting)
  | ({ provider: 'teams' } & TeamsMeeting);

interface ProviderConfig {
  apiKey: string;
}

// ---------------------------------------------------------------------------
// Config readers
// ---------------------------------------------------------------------------

/**
 * Czyta JWT token / OAuth token Zoom z kolekcji integrations.
 * Pole: config.apiKey, providerId: 'zoom'
 */
export async function getZoomConfig(tenantId: string): Promise<ProviderConfig | null> {
  const q = query(
    collection(db, 'integrations'),
    where('tenantId', '==', tenantId),
    where('providerId', '==', 'zoom'),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const apiKey: string | undefined = snap.docs[0].data()?.config?.apiKey;
  if (!apiKey) return null;
  return { apiKey };
}

/**
 * Czyta MS365 OAuth token z kolekcji integrations.
 * Pole: config.apiKey, providerId: 'ms365'
 */
export async function getTeamsConfig(tenantId: string): Promise<ProviderConfig | null> {
  const q = query(
    collection(db, 'integrations'),
    where('tenantId', '==', tenantId),
    where('providerId', '==', 'ms365'),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const apiKey: string | undefined = snap.docs[0].data()?.config?.apiKey;
  if (!apiKey) return null;
  return { apiKey };
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/**
 * POST https://api.zoom.us/v2/users/me/meetings
 * Zwraca id, joinUrl, password, hostUrl.
 */
export async function createZoomMeeting(
  token: string,
  title: string,
  startTime: string,
  durationMin: number,
): Promise<ZoomMeeting> {
  const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic: title,
      type: 2, // scheduled
      start_time: startTime,
      duration: durationMin,
      settings: {
        join_before_host: true,
        waiting_room: false,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Zoom API error ${response.status}: ${err}`);
  }

  const data = await response.json();

  return {
    id: data.id as number,
    joinUrl: data.join_url as string,
    password: (data.password ?? '') as string,
    hostUrl: (data.start_url ?? '') as string,
  };
}

/**
 * POST https://graph.microsoft.com/v1.0/me/onlineMeetings
 * Zwraca id i joinUrl.
 */
export async function createTeamsMeeting(
  token: string,
  title: string,
  startTime: string,
  durationMin: number,
): Promise<TeamsMeeting> {
  const startDate = new Date(startTime);
  const endDate = new Date(startDate.getTime() + durationMin * 60_000);

  const response = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subject: title,
      startDateTime: startDate.toISOString(),
      endDateTime: endDate.toISOString(),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Teams API error ${response.status}: ${err}`);
  }

  const data = await response.json();

  return {
    id: data.id as string,
    joinUrl: data.joinWebUrl as string,
  };
}

// ---------------------------------------------------------------------------
// Attach to booking
// ---------------------------------------------------------------------------

/**
 * Zapisuje dane spotkania video do bookings/{tenantId}/items/{bookingId}
 * w polu videoMeeting.
 */
export async function attachMeetingToBooking(
  tenantId: string,
  bookingId: string,
  meetingData: VideoMeeting,
): Promise<void> {
  const bookingRef = doc(db, 'bookings', tenantId, 'items', bookingId);
  await updateDoc(bookingRef, { videoMeeting: meetingData });
}
