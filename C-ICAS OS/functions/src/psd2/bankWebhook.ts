import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface BankTransaction {
  transactionId: string;
  amount: number;
  currency: string;
  bookingDate: string;
  valueDate: string;
  creditorName?: string;
  debtorName?: string;
  remittanceInfo?: string;
  iban?: string;
}

export const handleBankWebhook = functions
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const tenantId = (req.query.tenantId ?? req.body?.tenantId) as string | undefined;
    if (!tenantId) { res.status(400).json({ error: 'tenantId required' }); return; }

    const provider     = (req.headers['x-bank-provider'] as string) ?? 'UNKNOWN';
    const transactions = req.body?.transactions as BankTransaction[] | undefined;

    if (!transactions?.length) { res.json({ received: 0 }); return; }

    const db    = admin.firestore();
    let newCount = 0;

    const writeBatch = db.batch();
    for (const tx of transactions) {
      const ref      = db.collection(`tenants/${tenantId}/bankTransactions`).doc(tx.transactionId);
      const existing = await ref.get();
      if (existing.exists) continue;

      writeBatch.set(ref, {
        tenantId,
        transactionId:   tx.transactionId,
        amount:          tx.amount,
        currency:        tx.currency,
        bookingDate:     tx.bookingDate,
        valueDate:       tx.valueDate,
        creditorName:    tx.creditorName ?? null,
        debtorName:      tx.debtorName ?? null,
        remittanceInfo:  tx.remittanceInfo ?? null,
        iban:            tx.iban ?? null,
        provider,
        matchedInvoiceId: null,
        matchStatus:     'UNMATCHED',
        importedAt:      admin.firestore.FieldValue.serverTimestamp(),
      });
      newCount++;
    }

    if (newCount > 0) await writeBatch.commit();

    functions.logger.info('bankWebhook processed', { tenantId, provider, newCount });
    res.json({ received: newCount });
  });
