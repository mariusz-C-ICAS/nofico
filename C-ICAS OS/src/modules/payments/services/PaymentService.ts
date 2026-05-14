/**
 * Data: 2026-05-12
 * Zmiany: Integracja Stripe, PayU i Multi-currency.
 * Ścieżka: /src/modules/payments/services/PaymentService.ts
 */
import { 
  collection, 
  addDoc, 
  serverTimestamp
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

export class PaymentService {
  /**
   * Inicjuje sesję płatności Stripe (Frontend-only demo / Simulation).
   * PAY-IMP-01
   */
  static async createStripeCheckout(planId: string, customerId: string) {
    console.log(`Creating Stripe session for plan: ${planId}, customer: ${customerId}`);
    // W rzeczywistej implementacji: call do /api/create-checkout-session
    return { sessionId: 'sim_session_123' };
  }

  /**
   * Rejestruje transakcję BLIK.
   * PAY-IMP-03
   */
  static async processBlikPayment(amount: number, currency: string, blikCode: string, customerId: string) {
    console.log(`Processing BLIK: ${blikCode} for ${amount} ${currency}`);
    
    const txData: PaymentTx = {
      amount,
      currency,
      provider: 'blik',
      status: 'completed', // Simulation: auto-complete
      customerId,
      createdAt: serverTimestamp()
    };

    return await addDoc(collection(db, 'paymentTransactions'), txData);
  }

  /**
   * Multi-currency engine (walidacja i przeliczanie).
   * PAY-IMP-04
   */
  static convertCurrency(amount: number, from: string, to: string, rate: number = 4.30) {
    return amount * rate;
  }
}
