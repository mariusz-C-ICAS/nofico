import { db } from '../../../shared/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface BookingRef {
  customerName: string;
  customerEmail?: string | null;
  date: string;
  startTime: string;
  endTime?: string;
  price?: number;
}

interface ServiceRef { name: string }
interface BusinessRef { businessName?: string; confirmationMessage?: string }

function fmtDate(date: string): string {
  return new Date(date + 'T12:00').toLocaleDateString('pl-PL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export async function queueConfirmationEmail(
  tenantId: string,
  booking: BookingRef,
  service: ServiceRef,
  settings: BusinessRef = {},
): Promise<void> {
  if (!booking.customerEmail) return;
  await addDoc(collection(db, `tenants/${tenantId}/emailQueue`), {
    tenantId,
    to: booking.customerEmail,
    subject: `Potwierdzenie rezerwacji — ${service.name}`,
    template: 'booking_confirmation',
    data: {
      customerName: booking.customerName,
      serviceName: service.name,
      date: fmtDate(booking.date),
      time: booking.startTime,
      price: booking.price ?? 0,
      businessName: settings.businessName ?? '',
      message: settings.confirmationMessage ?? 'Dziękujemy za rezerwację!',
    },
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function queueReminderEmail(
  tenantId: string,
  booking: BookingRef & { id: string },
  service: ServiceRef,
  settings: BusinessRef = {},
): Promise<void> {
  if (!booking.customerEmail) return;
  await addDoc(collection(db, `tenants/${tenantId}/emailQueue`), {
    tenantId,
    to: booking.customerEmail,
    subject: `Przypomnienie — jutro wizyta: ${service.name}`,
    template: 'booking_reminder',
    data: {
      customerName: booking.customerName,
      serviceName: service.name,
      date: fmtDate(booking.date),
      time: booking.startTime,
      businessName: settings.businessName ?? '',
    },
    bookingId: booking.id,
    scheduledFor: booking.date,
    status: 'scheduled',
    createdAt: serverTimestamp(),
  });
}

export async function queueReviewRequest(
  tenantId: string,
  booking: BookingRef & { id: string },
  service: ServiceRef,
  reviewToken: string,
): Promise<void> {
  if (!booking.customerEmail) return;
  const reviewUrl = `${window.location.origin}/review/${tenantId}/${reviewToken}`;
  await addDoc(collection(db, `tenants/${tenantId}/emailQueue`), {
    tenantId,
    to: booking.customerEmail,
    subject: `Jak oceniasz wizytę? — ${service.name}`,
    template: 'review_request',
    data: {
      customerName: booking.customerName,
      serviceName: service.name,
      reviewUrl,
    },
    bookingId: booking.id,
    reviewToken,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function queueWaitlistNotification(
  tenantId: string,
  entry: { customerName: string; customerEmail?: string | null; date: string; startTime: string },
  service: ServiceRef,
  publicUrl: string,
): Promise<void> {
  if (!entry.customerEmail) return;
  await addDoc(collection(db, `tenants/${tenantId}/emailQueue`), {
    tenantId,
    to: entry.customerEmail,
    subject: `Slot się zwolnił! — ${service.name} ${entry.startTime}`,
    template: 'waitlist_notify',
    data: {
      customerName: entry.customerName,
      serviceName: service.name,
      date: fmtDate(entry.date),
      time: entry.startTime,
      bookUrl: publicUrl,
    },
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}
