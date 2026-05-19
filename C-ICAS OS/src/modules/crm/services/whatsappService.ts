// WhatsApp Business service — Meta Graph API + Firestore history
// Config stored in Firestore: integrations/{providerId: 'whatsapp-business'}
// config.apiKey = Meta API token
// config.phoneId = Phone Number ID from Meta Business dashboard

import {
  collection, query, where, getDocs, addDoc, orderBy, limit,
  serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

export interface WhatsAppConfig {
  apiKey: string;   // Meta API token
  phoneId: string;  // WhatsApp Phone Number ID
}

export interface WhatsAppMessage {
  id?: string;
  customerId: string;
  direction: 'sent' | 'received';
  body: string;
  timestamp: number;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
}

const META_API_BASE = 'https://graph.facebook.com/v17.0';

export async function getWhatsappConfig(tenantId: string): Promise<WhatsAppConfig | null> {
  try {
    const q = query(
      collection(db, 'integrations'),
      where('tenantId', '==', tenantId),
      where('providerId', '==', 'whatsapp-business'),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const cfg = snap.docs[0].data()?.config as Record<string, string> | undefined;
    if (!cfg?.apiKey || !cfg?.phoneId) return null;
    return { apiKey: cfg.apiKey, phoneId: cfg.phoneId };
  } catch {
    return null;
  }
}

export async function sendMessage(
  token: string,
  phoneId: string,
  to: string,
  message: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${META_API_BASE}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function subscribeConversationHistory(
  tenantId: string,
  customerId: string,
  onData: (messages: WhatsAppMessage[]) => void,
): () => void {
  const q = query(
    collection(db, `crm_whatsapp/${tenantId}/messages`),
    where('customerId', '==', customerId),
    orderBy('timestamp', 'asc'),
    limit(100),
  );
  return onSnapshot(q, snap => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() }) as WhatsAppMessage));
  });
}

export async function saveIncomingMessage(
  tenantId: string,
  customerId: string,
  msg: Omit<WhatsAppMessage, 'id'>,
): Promise<string> {
  const ref = await addDoc(collection(db, `crm_whatsapp/${tenantId}/messages`), {
    ...msg,
    customerId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
