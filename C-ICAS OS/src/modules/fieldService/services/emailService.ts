import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import type { ServiceEvent } from '../types';

function fmtDT(ts: any): string {
  const d = ts?.toDate ? ts.toDate() : new Date(ts ?? Date.now());
  return d.toLocaleString('pl-PL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function buildHtml(event: ServiceEvent, portalUrl: string, companyName: string): string {
  const color   = event.serviceTypeColor || '#10b981';
  const details: { label: string; value: string }[] = [
    { label: 'Usługa',        value: event.serviceTypeName },
    { label: 'Termin',        value: fmtDT(event.scheduledStart) },
    { label: 'Adres',         value: `${event.location.address}, ${event.location.postalCode} ${event.location.city}` },
    { label: 'Czas trwania',  value: `ok. ${event.estimatedDurationMinutes} minut` },
    ...(event.price ? [{ label: 'Cena', value: `${event.price.toLocaleString('pl-PL')} ${event.currency}` }] : []),
  ];

  const rows = details.map(r => `
    <tr>
      <td style="padding:5px 0;font-size:13px;color:#64748b;width:40%;vertical-align:top">${r.label}:</td>
      <td style="padding:5px 0;font-size:13px;font-weight:700;color:#0f172a">${r.value}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Wizyta serwisowa</title></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:24px 16px;">
  <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <!-- Header -->
    <div style="background:${color};padding:32px">
      <p style="margin:0 0 4px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.15em;color:rgba(255,255,255,.7)">Potwierdzenie wizyty</p>
      <h1 style="margin:0;font-size:26px;font-weight:900;color:#fff;letter-spacing:-.5px">${companyName}</h1>
    </div>
    <!-- Body -->
    <div style="padding:32px">
      <p style="font-size:15px;color:#0f172a;font-weight:700;margin:0 0 20px">
        Szanowni Państwo, dziękujemy za zaufanie.
      </p>
      <!-- Event details -->
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 12px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#64748b">Szczegóły wizyty</p>
        <table style="width:100%;border-collapse:collapse">${rows}</table>
      </div>
      <!-- CTA -->
      <p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:24px">
        Jeśli potrzebują Państwo <strong>zmienić termin wizyty</strong> lub <strong>adres wykonania usługi</strong>,
        prosimy kliknąć przycisk poniżej. Link jest ważny przez <strong>14 dni</strong>.
      </p>
      <div style="text-align:center;margin-bottom:32px">
        <a href="${portalUrl}"
          style="display:inline-block;background:${color};color:#fff;text-decoration:none;
                 font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:.1em;
                 padding:16px 40px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.15)">
          Zarządzaj wizytą →
        </a>
      </div>
      ${event.location.accessNotes ? `
      <div style="background:#f0fdf4;border-radius:10px;padding:14px;margin-bottom:20px">
        <p style="margin:0;font-size:12px;color:#15803d"><strong>Informacja o dostępie:</strong><br>${event.location.accessNotes}</p>
      </div>` : ''}
      <!-- Footer -->
      <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0">
      <p style="font-size:11px;color:#94a3b8;line-height:1.6;margin:0">
        Ta wiadomość została wygenerowana automatycznie przez system C-ICAS OS.<br>
        Link do portalu klienta wygasa po 14 dniach i jest powiązany wyłącznie z tą wizytą.<br>
        W razie pytań prosimy o bezpośredni kontakt z naszym biurem.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendClientPortalEmail(
  tenantId: string,
  event: ServiceEvent,
  clientEmail: string,
  portalUrl: string,
  companyName = 'Serwis'
): Promise<void> {
  if (!clientEmail?.trim()) throw new Error('Adres e-mail klienta jest wymagany.');

  const subject = `Wizyta serwisowa: ${event.serviceTypeName} — ${fmtDT(event.scheduledStart)}`;

  await addDoc(collection(db, `tenants/${tenantId}/emailQueue`), {
    to: clientEmail.trim(),
    subject,
    html: buildHtml(event, portalUrl, companyName),
    bodyText: [
      `Wizyta serwisowa: ${event.serviceTypeName}`,
      `Termin: ${fmtDT(event.scheduledStart)}`,
      `Adres: ${event.location.address}, ${event.location.postalCode} ${event.location.city}`,
      `Czas trwania: ok. ${event.estimatedDurationMinutes} minut`,
      ``,
      `Aby zmienić termin lub adres, odwiedź: ${portalUrl}`,
      `Link ważny 14 dni.`,
    ].join('\n'),
    type: 'CLIENT_PORTAL_INVITE',
    eventId: event.id,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}
