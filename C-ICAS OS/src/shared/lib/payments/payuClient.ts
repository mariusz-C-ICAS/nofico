// PayU REST API client — Google-first allowed exception (Polish payment processor)

const FUNCTIONS_BASE = import.meta.env.VITE_FUNCTIONS_URL ?? 'https://europe-west1-cicas-os.cloudfunctions.net';

export interface PayuOrderRequest {
  amount: number;       // in grosz (1 PLN = 100)
  currency?: string;    // default: PLN
  description: string;
  customerEmail?: string;
  customerName?: string;
  continueUrl: string;
  notifyUrl?: string;
}

export interface PayuOrderResponse {
  orderId: string;
  redirectUri: string;
  status: string;
}

export interface PayuPaymentStatus {
  orderId: string;
  status: 'PENDING' | 'WAITING_FOR_CONFIRMATION' | 'COMPLETED' | 'CANCELED' | 'REJECTED';
  amount: number;
  currency: string;
  paidAt?: string;
}

export async function createPayuOrder(
  order: PayuOrderRequest,
  tenantId: string,
  idToken: string
): Promise<PayuOrderResponse> {
  const res = await fetch(`${FUNCTIONS_BASE}/createPayuOrder`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ ...order, tenantId }),
  });
  if (!res.ok) throw new Error(`PayU order error: ${res.status}`);
  return res.json();
}

export async function getPayuOrderStatus(orderId: string, idToken: string): Promise<PayuPaymentStatus> {
  const res = await fetch(`${FUNCTIONS_BASE}/payuOrderStatus?orderId=${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`PayU status error: ${res.status}`);
  return res.json();
}
