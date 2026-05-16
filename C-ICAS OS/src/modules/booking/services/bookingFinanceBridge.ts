import { db } from '../../../shared/lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

interface BookingSnap {
  id: string;
  customerId?: string;
  customerName?: string;
  serviceId?: string;
  date: string;
  startTime: string;
  price?: number;
  staffId?: string;
  source?: string;
}

interface ServiceSnap { id: string; name: string }

export async function syncCompletedBookingToFinance(
  tenantId: string,
  booking: BookingSnap,
  service?: ServiceSnap,
): Promise<string | null> {
  const amount = booking.price ?? 0;
  if (amount <= 0) return null;

  const txRef = await addDoc(collection(db, `tenants/${tenantId}/transactions`), {
    tenantId,
    type: 'booking_income',
    amount,
    currency: 'PLN',
    description: `Wizyta: ${service?.name ?? booking.serviceId ?? 'usługa'}`,
    date: booking.date,
    customerId: booking.customerId ?? null,
    customerName: booking.customerName ?? '',
    bookingId: booking.id,
    serviceId: booking.serviceId ?? null,
    staffId: booking.staffId ?? null,
    source: 'booking',
    status: 'completed',
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, `tenants/${tenantId}/bookings`, booking.id), {
    syncedToFinance: true,
    transactionId: txRef.id,
    updatedAt: serverTimestamp(),
  });

  return txRef.id;
}

export async function generateInvoiceFromBooking(
  tenantId: string,
  booking: BookingSnap,
  service?: ServiceSnap,
): Promise<void> {
  const now = new Date();
  const num = `INV-BK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-5)}`;
  const net = booking.price ?? 0;
  const vat = Math.round(net * 0.23 * 100) / 100;

  await addDoc(collection(db, `tenants/${tenantId}/invoices`), {
    tenantId,
    invoiceNumber: num,
    type: 'booking',
    customerId: booking.customerId ?? null,
    customerName: booking.customerName ?? '',
    date: booking.date,
    dueDate: booking.date,
    bookingId: booking.id,
    lines: [{
      description: service?.name ?? 'Usługa',
      quantity: 1,
      unitPrice: net,
      vatRate: 23,
      net,
      vat,
      gross: Math.round((net + vat) * 100) / 100,
    }],
    totalNet: net,
    totalVat: vat,
    totalGross: Math.round((net + vat) * 100) / 100,
    currency: 'PLN',
    status: 'issued',
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, `tenants/${tenantId}/bookings`, booking.id), {
    invoiceGenerated: true,
    updatedAt: serverTimestamp(),
  });
}
