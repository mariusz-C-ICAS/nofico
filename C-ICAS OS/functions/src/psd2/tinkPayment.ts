/**
 * Tink PSD2 PISP (Payment Initiation Service Provider) integration.
 * Config via Firebase Functions config:
 *   firebase functions:config:set tink.client_id="..." tink.client_secret="..." tink.redirect_uri="https://app-c-icas-os.web.app/payment-callback" tink.environment="test"
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type { Request, Response } from 'express';
import { withAuth } from '../_shared/middleware';

const TINK_API   = 'https://api.tink.com';
const TINK_LINK  = 'https://link.tink.com/1.0/pay/credentials';

function cfg() {
  const t = functions.config().tink ?? {};
  return {
    clientId:     t.client_id     as string | undefined,
    clientSecret: t.client_secret as string | undefined,
    redirectUri:  (t.redirect_uri  as string | undefined) ?? 'https://app-c-icas-os.web.app/payment-callback',
    environment:  (t.environment   as string | undefined) ?? 'test',
  };
}

async function getClientToken(): Promise<string> {
  const c = cfg();
  if (!c.clientId || !c.clientSecret) throw new Error('Tink credentials not configured');

  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     c.clientId,
    client_secret: c.clientSecret,
    scope:         'payment:read payment:write',
  });

  const res = await fetch(`${TINK_API}/api/v1/oauth/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tink token error ${res.status}: ${text}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// ─── POST /api/tink/init ──────────────────────────────────────────────────────
interface InitBody {
  tenantId:      string;
  invoiceId:     string;
  invoiceNumber: string;
  amount:        number;
  currency:      string;
  creditorIban:  string;
  creditorName:  string;
}

export const tinkInitPayment = withAuth(async (req, res, ctx) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const c = cfg();
  if (!c.clientId || !c.clientSecret) {
    res.status(503).json({ error: 'Tink not configured', simulation: true });
    return;
  }

  const b = req.body as InitBody;
  if (!b.invoiceId || !b.amount || !b.creditorIban) {
    res.status(400).json({ error: 'invoiceId, amount, creditorIban are required' });
    return;
  }

  // 1. Exchange client credentials for access token
  let accessToken: string;
  try {
    accessToken = await getClientToken();
  } catch (err) {
    functions.logger.error('tinkInitPayment: token error', { err });
    res.status(502).json({ error: 'Tink authentication failed' });
    return;
  }

  // 2. Create payment request
  const paymentBody = {
    type: b.currency === 'PLN' ? 'SEPA_INSTANT_CREDIT_TRANSFER' : 'SEPA_CREDIT_TRANSFER',
    destinations: [{
      type: 'iban',
      iban: b.creditorIban.replace(/\s/g, ''),
      name: b.creditorName,
    }],
    amount: {
      currencyCode: b.currency || 'PLN',
      value: {
        unscaledValue: Math.round(b.amount * 100),
        scale: 2,
      },
    },
    market: 'PL',
    sourceMessage: `Faktura ${b.invoiceNumber}`,
    remittanceInformation: {
      type:  'UNSTRUCTURED',
      value: `Faktura ${b.invoiceNumber}`,
    },
    idempotencyKey: `${b.invoiceId}-${Date.now()}`,
  };

  const prRes = await fetch(`${TINK_API}/api/v1/payments/requests`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(paymentBody),
  });

  if (!prRes.ok) {
    const errText = await prRes.text();
    functions.logger.error('tinkInitPayment: payment request failed', { status: prRes.status, body: errText });
    res.status(502).json({ error: `Tink payment request error: ${prRes.status}` });
    return;
  }

  const prData = await prRes.json() as { id: string };
  const paymentRequestId = prData.id;

  // 3. Persist payment record in Firestore
  const db       = admin.firestore();
  const payRef   = await db.collection(`tenants/${ctx.tenantId}/payments`).add({
    paymentRequestId,
    invoiceId:     b.invoiceId,
    invoiceNumber: b.invoiceNumber,
    amount:        b.amount,
    currency:      b.currency || 'PLN',
    creditorIban:  b.creditorIban,
    creditorName:  b.creditorName,
    status:        'PENDING',
    environment:   c.environment,
    createdBy:     ctx.uid,
    createdAt:     admin.firestore.FieldValue.serverTimestamp(),
    updatedAt:     admin.firestore.FieldValue.serverTimestamp(),
  });

  // 4. Build Tink Link authorization URL
  const params = new URLSearchParams({
    client_id:          c.clientId,
    redirect_uri:       c.redirectUri,
    payment_request_id: paymentRequestId,
    locale:             'pl_PL',
    state:              payRef.id,
  });

  functions.logger.info('tinkInitPayment OK', { paymentId: payRef.id, tenantId: ctx.tenantId });

  res.json({
    paymentId:         payRef.id,
    paymentRequestId,
    authorizationUrl:  `${TINK_LINK}?${params.toString()}`,
  });
});

// ─── POST /api/tink/webhook — Tink sends payment status updates ───────────────

export const tinkPaymentWebhook = functions
  .region('europe-west1')
  .https.onRequest(async (req: Request, res: Response) => {
    res.set('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST')    { res.status(405).send(''); return; }

    // Tink webhook payload: { event_type, context: { id }, event: { content: { status } } }
    const paymentRequestId = req.body?.context?.id as string | undefined;
    const newStatus        = req.body?.event?.content?.status as string | undefined;

    if (!paymentRequestId || !newStatus) {
      res.json({ ok: false, reason: 'missing paymentRequestId or status' });
      return;
    }

    const db   = admin.firestore();
    const snap = await db.collectionGroup('payments')
      .where('paymentRequestId', '==', paymentRequestId)
      .limit(1)
      .get();

    if (snap.empty) {
      functions.logger.warn('tinkPaymentWebhook: payment not found', { paymentRequestId });
      res.json({ ok: false, reason: 'not found' });
      return;
    }

    await snap.docs[0].ref.update({
      status:    newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      tinkEvent: req.body,
    });

    functions.logger.info('tinkPaymentWebhook: status updated', { paymentRequestId, newStatus });
    res.json({ ok: true });
  });
