/**
 * Data: 2026-05-18
 * Stripe Checkout Session — Firebase Cloud Function.
 * Setup: firebase functions:config:set stripe.secret_key="sk_live_..." stripe.webhook_secret="whsec_..." stripe.price_basic="price_..." stripe.price_pro="price_..." stripe.price_enterprise="price_..."
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const db = admin.firestore();

function getStripe(): Stripe {
  const secretKey = functions.config().stripe?.secret_key ?? '';
  if (!secretKey) throw new Error('Stripe secret key not configured');
  return new Stripe(secretKey, { apiVersion: '2023-10-16' });
}

// POST /api/stripe/checkout
export const stripeCheckout = functions
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

    try {
      const { tier, tenantId, userId, successUrl, cancelUrl } = req.body as {
        tier: string; tenantId: string; userId: string; successUrl?: string; cancelUrl?: string;
      };
      if (!tier || !tenantId || !userId) {
        res.status(400).json({ error: 'Missing: tier, tenantId, userId' }); return;
      }

      const priceMap: Record<string, string | undefined> = {
        basic:      functions.config().stripe?.price_basic,
        pro:        functions.config().stripe?.price_pro,
        enterprise: functions.config().stripe?.price_enterprise,
      };
      const priceId = priceMap[tier];
      if (!priceId) { res.status(400).json({ error: `Unknown plan: ${tier}` }); return; }

      const tenantDoc = await db.doc(`tenants/${tenantId}`).get();
      let stripeCustomerId: string | undefined = tenantDoc.data()?.stripeCustomerId;
      const stripe = getStripe();

      if (!stripeCustomerId) {
        const userRecord = await admin.auth().getUser(userId);
        const customer = await stripe.customers.create({
          email: userRecord.email ?? undefined,
          metadata: { tenantId, userId },
        });
        stripeCustomerId = customer.id;
        await db.doc(`tenants/${tenantId}`).update({ stripeCustomerId });
      }

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card', 'blik', 'p24'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: successUrl ?? `https://app-c-icas-os.web.app/dashboard?stripe_success=1&tier=${tier}`,
        cancel_url: cancelUrl ?? `https://app-c-icas-os.web.app/license?stripe_cancel=1`,
        metadata: { tenantId, userId, tier },
        locale: 'pl',
        currency: 'pln',
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[stripeCheckout]', msg);
      res.status(500).json({ error: msg });
    }
  });

// POST /api/stripe/webhook
export const stripeWebhook = functions
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(req.rawBody, sig, functions.config().stripe?.webhook_secret ?? '');
    } catch (err) { res.status(400).send(`Webhook Error: ${err}`); return; }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const { tenantId, tier } = session.metadata ?? {};
      if (tenantId && tier) {
        await db.doc(`tenants/${tenantId}`).update({
          subscriptionTier: tier.toUpperCase(),
          stripeSubscriptionId: session.subscription,
          stripeStatus: 'active',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const snap = await db.collection('tenants').where('stripeSubscriptionId', '==', sub.id).limit(1).get();
      if (!snap.empty) {
        await snap.docs[0].ref.update({
          subscriptionTier: 'BASIC', stripeStatus: 'canceled',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
    res.json({ received: true });
  });
