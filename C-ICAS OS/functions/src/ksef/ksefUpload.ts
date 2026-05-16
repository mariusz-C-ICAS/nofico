import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { withAuth } from '../_shared/middleware';

const KSEF_BASE = process.env.KSEF_URL ?? 'https://ksef-test.mf.gov.pl/api';

export const uploadInvoiceToKsef = withAuth(async (req, res, ctx) => {
  if (!['accountant', 'admin', 'owner'].includes(ctx.role)) {
    res.status(403).json({ error: 'Insufficient role' }); return;
  }

  const { invoiceId } = req.body as { invoiceId?: string };
  if (!invoiceId) { res.status(400).json({ error: 'invoiceId required' }); return; }

  const db       = admin.firestore();
  const tenantId = ctx.tenantId;

  const tenantDoc  = await db.collection('tenants').doc(tenantId).get();
  const ksefConfig = tenantDoc.data()?.ksefConfig as { sessionToken?: string; nip?: string } | undefined;
  if (!ksefConfig?.sessionToken) {
    res.status(412).json({ error: 'KSeF session token not configured' }); return;
  }

  const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
  if (!invoiceDoc.exists || invoiceDoc.data()?.tenantId !== tenantId) {
    res.status(404).json({ error: 'Invoice not found' }); return;
  }

  const invoice = invoiceDoc.data()!;
  if (invoice.ksefReferenceNumber) {
    res.status(409).json({ error: 'Already submitted', ksefReferenceNumber: invoice.ksefReferenceNumber }); return;
  }

  const xmlContent = buildFa2Xml(invoice, ksefConfig.nip ?? '');

  const resp = await fetch(`${KSEF_BASE}/invoices/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Authorization': `Bearer ${ksefConfig.sessionToken}`,
    },
    body: Buffer.from(xmlContent, 'utf-8'),
  });

  if (!resp.ok) {
    functions.logger.error('KSeF upload failed', { invoiceId, status: resp.status });
    res.status(502).json({ error: 'KSeF API error', status: resp.status }); return;
  }

  const result = await resp.json() as { elementReferenceNumber: string };
  const ksefRef = result.elementReferenceNumber;

  await invoiceDoc.ref.update({
    ksefReferenceNumber: ksefRef,
    ksefUploadedAt: admin.firestore.FieldValue.serverTimestamp(),
    ksefUploadedBy: ctx.uid,
  });

  await db.collection('auditLogs').add({
    tenantId, userId: ctx.uid, userEmail: ctx.email,
    action: 'KSEF_UPLOAD', collection: 'invoices', entityId: invoiceId,
    details: { ksefRef }, createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  functions.logger.info('Invoice uploaded to KSeF', { invoiceId, ksefRef });
  res.json({ ksefReferenceNumber: ksefRef });
});

function buildFa2Xml(inv: admin.firestore.DocumentData, sellerNip: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<?xml version="1.0" encoding="UTF-8"?>
<Faktura xmlns="http://crd.gov.pl/wzor/2023/06/29/12648/">
  <Naglowek>
    <KodFormularza kodSystemowy="FA (2)" wersjaSchemy="1-0E">FA</KodFormularza>
    <WariantFormularza>2</WariantFormularza>
    <DataWytworzeniaFa>${new Date().toISOString()}</DataWytworzeniaFa>
    <SystemInfo>C-ICAS OS</SystemInfo>
  </Naglowek>
  <Podmiot1>
    <DaneIdentyfikacyjne>
      <NIP>${sellerNip}</NIP>
      <Nazwa>${esc(inv.sellerName ?? '')}</Nazwa>
    </DaneIdentyfikacyjne>
  </Podmiot1>
  <Fa>
    <KodWaluty>${inv.currency ?? 'PLN'}</KodWaluty>
    <P_1>${inv.issueDate ?? ''}</P_1>
    <P_2>${esc(inv.number ?? '')}</P_2>
  </Fa>
</Faktura>`;
}
