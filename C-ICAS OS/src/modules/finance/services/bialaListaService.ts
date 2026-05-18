import { db } from '../../../shared/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const BIALA_LISTA_API = 'https://wl-api.mf.gov.pl/api';

export interface BialaListaResult {
  nip: string;
  isActive: boolean;
  accountNumbers: string[];
  checkedAt: Date;
}

export async function checkNipOnBialaLista(
  nip: string,
  tenantId: string
): Promise<BialaListaResult> {
  const date = new Date().toISOString().split('T')[0];
  const url = `${BIALA_LISTA_API}/search/nip/${nip}?date=${date}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Biała Lista HTTP ${res.status}`);
    const data = await res.json();
    const subject = data.result?.subject;
    const result: BialaListaResult = {
      nip,
      isActive: subject?.statusVat === 'Czynny',
      accountNumbers: subject?.accountNumbers ?? [],
      checkedAt: new Date(),
    };
    await addDoc(collection(db, 'tenants', tenantId, 'bialaListaChecks'), {
      ...result,
      checkedAt: serverTimestamp(),
    });
    return result;
  } catch (err) {
    return { nip, isActive: false, accountNumbers: [], checkedAt: new Date() };
  }
}

export async function batchCheckNips(
  nips: string[],
  tenantId: string
): Promise<BialaListaResult[]> {
  return Promise.all(nips.map(nip => checkNipOnBialaLista(nip, tenantId)));
}
