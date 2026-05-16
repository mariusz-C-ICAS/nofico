import { db } from '../../../shared/lib/firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, where } from 'firebase/firestore';

interface CompletedBooking {
  id: string;
  customerId?: string;
  serviceId?: string;
  date: string;
  startTime: string;
  price?: number;
  staffId?: string;
}

interface BookingService {
  id: string;
  name: string;
}

export async function syncBookingToActivity(
  tenantId: string,
  booking: CompletedBooking,
  service?: BookingService,
): Promise<void> {
  if (!booking.customerId) return;
  await addDoc(collection(db, `tenants/${tenantId}/crmActivities`), {
    tenantId,
    customerId: booking.customerId,
    type: 'visit',
    title: `Wizyta: ${service?.name ?? booking.serviceId ?? 'usługa'}`,
    description: `${booking.date} o ${booking.startTime}${booking.price ? ` · ${booking.price} PLN` : ''}`,
    source: 'booking',
    bookingId: booking.id,
    createdAt: serverTimestamp(),
  });
}

export function subscribeAndBridgeCompletedBookings(tenantId: string): () => void {
  const q = query(
    collection(db, `tenants/${tenantId}/bookings`),
    where('tenantId', '==', tenantId),
    where('status', '==', 'completed'),
    where('bridgedToCrm', '==', false),
  );
  return onSnapshot(q, snap => {
    snap.docChanges()
      .filter(c => c.type === 'added')
      .forEach(async c => {
        const booking = { id: c.doc.id, ...c.doc.data() } as CompletedBooking;
        await syncBookingToActivity(tenantId, booking);
      });
  });
}
