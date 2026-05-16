import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const ALLOWED_CATEGORIES = [
  'FINANCIAL_FRAUD', 'CORRUPTION', 'HARASSMENT', 'SAFETY_VIOLATION',
  'DATA_BREACH', 'LEGAL_BREACH', 'OTHER',
] as const;

export const submitWhistleblowerReport = functions
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN ?? '*');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const { tenantId, category, description, evidence } = req.body as {
      tenantId?: string;
      category?: string;
      description?: string;
      evidence?: string;
    };

    if (!tenantId || !category || !description) {
      res.status(400).json({ error: 'tenantId, category and description required' });
      return;
    }

    if (!ALLOWED_CATEGORIES.includes(category as any)) {
      res.status(400).json({ error: `Invalid category. Allowed: ${ALLOWED_CATEGORIES.join(', ')}` });
      return;
    }

    if (description.length > 5000) {
      res.status(400).json({ error: 'description max 5000 chars' });
      return;
    }

    const referenceId = `WB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const db = admin.firestore();

    await db.collection(`tenants/${tenantId}/documentInstances`).add({
      tenantId,
      type: 'WHISTLEBLOWER',
      status: 'UNDER_INVESTIGATION',
      isAnonymous: true,
      submittedBy: 'ANONYMOUS',
      submittedByEmail: 'anonymous@noreply',
      metadata: {
        referenceId,
        category,
        description,
        evidenceDescription: evidence ?? null,
        submittedAt: new Date().toISOString(),
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const ownerId = tenantDoc.data()?.ownerId;
    if (ownerId) {
      await db.collection(`tenants/${tenantId}/notifications`).add({
        tenantId,
        recipientId: ownerId,
        documentTitle: 'Nowe zgłoszenie Sygnalisty',
        type: 'WHISTLEBLOWER_NEW',
        message: `Nowe anonimowe zgłoszenie (ref: ${referenceId}, kategoria: ${category}).`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        actionUrl: '/compliance',
      });
    }

    functions.logger.info('Whistleblower report received', { tenantId, referenceId, category });
    res.json({ referenceId, message: 'Zgłoszenie przyjęte anonimowo.' });
  });
