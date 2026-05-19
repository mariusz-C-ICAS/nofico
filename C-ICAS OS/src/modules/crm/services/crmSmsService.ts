// Twilio SMS service for CRM — send SMS + Firestore history
// Config: integrations/{providerId: 'twilio'}, config.apiKey = "AccountSID:AuthToken"

import {
  collection, query, where, getDocs, addDoc, orderBy, limit,
  serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
}

export type SmsStatus = 'sent' | 'delivered' | 'failed';

export interface CrmSmsMessage {
  id?: string;
  customerId: string;
  direction: 'sent' | 'received';
  body: string;
  status: SmsStatus;
  timestamp: number;
  to?: string;
  from?: string;
}

export async function getTwilioConfig(tenantId: string): Promise<TwilioConfig | null> {
  try {
    const q = query(
      collection(db, 'integrations'),
      where('tenantId', '==', tenantId),
      where('providerId', '==', 'twilio'),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const cfg = snap.docs[0].data()?.config as Record<string, string> | undefined;
    const raw = cfg?.apiKey ?? '';
    const [accountSid, authToken] = raw.split(':');
    if (!accountSid || !authToken) return null;
    return { accountSid, authToken };
  } catch {
    return null;
  }
}

export async function sendSms(
  accountSid: string,
  authToken: string,
  to: string,
  body: string,
  from?: string,
): Promise<boolean> {
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = btoa(`${accountSid}:${authToken}`);
    const params = new URLSearchParams({ To: to, Body: body });
    if (from) params.set('From', from);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function subscribeSmsHistory(
  tenantId: string,
  customerId: string,
  onData: (messages: CrmSmsMessage[]) => void,
): () => void {
  const q = query(
    collection(db, `crm_sms/${tenantId}/messages`),
    where('customerId', '==', customerId),
    orderBy('timestamp', 'asc'),
    limit(100),
  );
  return onSnapshot(q, snap => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() }) as CrmSmsMessage));
  });
}

export async function saveSmsToCrm(
  tenantId: string,
  customerId: string,
  sms: Omit<CrmSmsMessage, 'id'>,
): Promise<string> {
  const ref = await addDoc(collection(db, `crm_sms/${tenantId}/messages`), {
    ...sms,
    customerId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
