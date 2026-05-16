import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const KSEF_BASE = process.env.KSEF_URL ?? 'https://ksef-test.mf.gov.pl/api';

interface KsefInvoiceHeader {
  ksefReferenceNumber: string;
  invoiceHash?: { hashSHA?: { value?: string } };
  invoiceInstitution?: { issuedBy?: { nip?: string } };
}

export const syncKsefInvoices = functions
  .region('europe-west1')
  .pubsub.schedule('every 4 hours')
  .onRun(async () => {
    const db = admin.firestore();
    const tenantsSnap = await db.collection('tenants').where('ksefEnabled', '==', true).get();
    let totalSynced = 0;

    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId   = tenantDoc.id;
      const ksefConfig = tenantDoc.data().ksefConfig as {
        sessionToken?: string;
        lastSyncAt?: admin.firestore.Timestamp;
      } | undefined;

      if (!ksefConfig?.sessionToken) continue;

      try {
        const lastSyncAt = ksefConfig.lastSyncAt?.toDate() ?? new Date(Date.now() - 7 * 86400_000);

        const resp = await fetch(`${KSEF_BASE}/invoices/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ksefConfig.sessionToken}`,
          },
          body: JSON.stringify({
            queryCriteria: {
              type: 'incremental',
              acquisitionTimestampThresholdFrom: lastSyncAt.toISOString(),
              subjectType: 'subject2',
            },
          }),
        });

        if (!resp.ok) {
          functions.logger.warn('KSeF sync HTTP error', { tenantId, status: resp.status });
          continue;
        }

        const data = await resp.json() as { invoiceHeaderList?: KsefInvoiceHeader[] };
        const invoices = data.invoiceHeaderList ?? [];

        let batchDocs: admin.firestore.DocumentReference[] = [];
        let batchData: object[] = [];

        for (const inv of invoices) {
          const ref = db.collection(`tenants/${tenantId}/ksefInvoices`).doc(inv.ksefReferenceNumber);
          const existing = await ref.get();
          if (existing.exists) continue;
          batchDocs.push(ref);
          batchData.push({
            tenantId,
            ksefReferenceNumber: inv.ksefReferenceNumber,
            hashSHA: inv.invoiceHash?.hashSHA?.value ?? '',
            issuerNip: inv.invoiceInstitution?.issuedBy?.nip ?? '',
            syncedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'SYNCED',
          });
        }

        // Write in batches of 500
        for (let i = 0; i < batchDocs.length; i += 500) {
          const batch = db.batch();
          batchDocs.slice(i, i + 500).forEach((ref, j) => batch.set(ref, batchData[i + j]));
          await batch.commit();
        }

        await tenantDoc.ref.update({ 'ksefConfig.lastSyncAt': admin.firestore.FieldValue.serverTimestamp() });
        totalSynced += invoices.length;
        functions.logger.info('KSeF sync tenant done', { tenantId, count: invoices.length });
      } catch (err) {
        functions.logger.error('KSeF sync error', { tenantId, err });
      }
    }

    functions.logger.info('syncKsefInvoices complete', { totalSynced });
  });
