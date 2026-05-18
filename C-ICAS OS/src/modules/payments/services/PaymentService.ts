/**
 * Data: 2026-05-18
 * Zmiany: BLIK via PayU API + NBP dynamiczne kursy walut.
 * Ścieżka: /src/modules/payments/services/PaymentService.ts
 */
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

export interface PaymentTx {
  amount: number;
  currency: string;
  provider: 'stripe' | 'payu' | 'p24' | 'tpay' | 'blik';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  customerId: string;
  createdAt: unknown;
}

export interface BlikPaymentResult {
  status: 'completed' | 'pending' | 'failed' | 'no_credentials';
  orderId?: string;
  extOrderId?: string;
  errorMessage?: string;
}

export interface CurrencyRate {
  from: string;
  to: string;
  rate: number;
  fetchedAt: string;
  source: 'nbp' | 'cache' | 'fallback';
}

export class PaymentService {
  /**
   * Inicjuje sesję płatności Stripe (stub — wymaga backend Cloud Function).
   * PAY-IMP-01
   */
  static async createStripeCheckout(planId: string, customerId: string) {
    console.log(`Creating Stripe session for plan: ${planId}, customer: ${customerId}`);
    return { sessionId: 'sim_session_123' };
  }

  /**
   * Rejestruje transakcję BLIK via PayU API.
   * PAY-IMP-03
   */
  static async processBlikPayment(
    tenantId: string,
    amount: number,
    currency: string,
    blikCode: string,
    customerId: string
  ): Promise<BlikPaymentResult> {
    const PAYU_API = 'https://secure.payu.com';
    try {
      const credSnap = await getDoc(doc(db, `tenants/${tenantId}/payuCredentials/main`));
      if (!credSnap.exists()) {
        return { status: 'no_credentials', errorMessage: 'Brak konfiguracji PayU' };
      }
      const cred = credSnap.data() as { clientId: string; clientSecret: string; posId: string };

      // 1. OAuth token
      const tokenRes = await fetch(`${PAYU_API}/pl/standard/user/oauth/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: cred.clientId,
          client_secret: cred.clientSecret,
        }),
      });
      if (!tokenRes.ok) throw new Error(`PayU OAuth ${tokenRes.status}`);
      const { access_token } = await tokenRes.json() as { access_token: string };

      // 2. Utwórz zamówienie BLIK
      const extOrderId = `blik_${Date.now()}_${customerId}`;
      const orderRes = await fetch(`${PAYU_API}/api/v2_1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          notifyUrl: `${window.location.origin}/api/payu/notify`,
          customerIp: '127.0.0.1',
          merchantPosId: cred.posId,
          description: `Płatność BLIK ${extOrderId}`,
          currencyCode: currency.toUpperCase(),
          totalAmount: Math.round(amount * 100).toString(),
          extOrderId,
          payMethods: {
            payMethod: { type: 'PBL', value: 'BLIK', authorizationCode: blikCode },
          },
          buyer: { extCustomerId: customerId },
        }),
      });

      if (!orderRes.ok) {
        const errText = await orderRes.text();
        throw new Error(`PayU order ${orderRes.status}: ${errText}`);
      }
      const orderData = await orderRes.json() as { orderId?: string; status?: { statusCode?: string } };
      const statusCode = orderData.status?.statusCode ?? 'UNKNOWN';

      const txStatus = (statusCode === 'SUCCESS' || statusCode === 'COMPLETED') ? 'completed' : 'pending';
      const txData: PaymentTx = {
        amount, currency, provider: 'blik', status: txStatus, customerId, createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'paymentTransactions'), txData);

      return { status: txStatus, orderId: orderData.orderId, extOrderId };
    } catch (err) {
      console.error('[PaymentService] processBlikPayment error:', err);
      return { status: 'failed', errorMessage: err instanceof Error ? err.message : 'Nieznany błąd' };
    }
  }

  /**
   * Pobiera kurs waluty z NBP API (cache dzienny w Firestore).
   * PAY-IMP-04
   */
  static async getExchangeRate(from: string, to: string): Promise<CurrencyRate> {
    const NBP_API = 'https://api.nbp.pl/api/exchangerates/rates/A';
    const fetchedAt = new Date().toISOString().slice(0, 10);
    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();

    if (fromUpper === toUpper) return { from: fromUpper, to: toUpper, rate: 1, fetchedAt, source: 'nbp' };

    const getPlnRate = async (currency: string): Promise<number | null> => {
      if (currency === 'PLN') return 1;
      try {
        const cacheRef = doc(db, `globalCache/nbpRates/${currency}_${fetchedAt}`);
        const cached = await getDoc(cacheRef);
        if (cached.exists()) return (cached.data() as { rate: number }).rate;

        const res = await fetch(`${NBP_API}/${currency}/?format=json`, {
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return null;
        const data = await res.json() as { rates: Array<{ mid: number }> };
        const rate = data.rates[0]?.mid ?? null;
        if (rate) await setDoc(cacheRef, { rate, currency, fetchedAt });
        return rate;
      } catch {
        return null;
      }
    };

    const fromRate = await getPlnRate(fromUpper);
    const toRate = await getPlnRate(toUpper);

    if (!fromRate || !toRate) {
      const FALLBACK: Record<string, number> = { EUR: 4.25, USD: 3.90, GBP: 4.95, CHF: 4.30, CZK: 0.17 };
      const fb = fromUpper === 'PLN'
        ? (1 / (FALLBACK[toUpper] ?? 1))
        : (FALLBACK[fromUpper] ?? 1);
      return { from: fromUpper, to: toUpper, rate: fb, fetchedAt, source: 'fallback' };
    }

    const rate = toUpper === 'PLN' ? fromRate : fromRate / toRate;
    return { from: fromUpper, to: toUpper, rate, fetchedAt, source: 'nbp' };
  }

  static async convertCurrencyAsync(amount: number, from: string, to: string): Promise<number> {
    const { rate } = await this.getExchangeRate(from, to);
    return amount * rate;
  }

  // Zachowane dla kompatybilności wstecznej
  static convertCurrency(amount: number, _from: string, _to: string, rate: number = 4.30) {
    return amount * rate;
  }
}
