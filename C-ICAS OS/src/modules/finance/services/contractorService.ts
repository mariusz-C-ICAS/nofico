import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { askAI } from '../../../shared/services/geminiService';
import { Contractor, SalesInvoice } from '../types/fiTypes';

const contractorsCol = (tenantId: string) =>
  collection(db, 'tenants', tenantId, 'contractors');

const invoicesCol = (tenantId: string) =>
  collection(db, 'tenants', tenantId, 'invoices');

export async function createContractor(
  tenantId: string,
  data: Omit<Contractor, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const payload: Omit<Contractor, 'id'> = {
      ...data,
      tenantId,
      bankAccounts: data.bankAccounts ?? [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(contractorsCol(tenantId), payload);
    return ref.id;
  } catch (err) {
    console.error('[contractorService] createContractor error:', err);
    throw err;
  }
}

export async function updateContractor(
  tenantId: string,
  id: string,
  updates: Partial<Contractor>
): Promise<void> {
  try {
    const ref = doc(db, 'tenants', tenantId, 'contractors', id);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[contractorService] updateContractor error:', err);
    throw err;
  }
}

export function getContractorsListener(
  tenantId: string,
  callback: (contractors: Contractor[]) => void
): () => void {
  const q = query(
    contractorsCol(tenantId),
    where('status', '!=', 'blocked'),
    orderBy('status'),
    orderBy('name', 'asc')
  );

  return onSnapshot(
    q,
    (snap) => {
      const contractors = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Contractor));
      callback(contractors);
    },
    (err) => {
      console.error('[contractorService] getContractorsListener error:', err);
    }
  );
}

export async function searchContractors(
  tenantId: string,
  searchQuery: string
): Promise<Contractor[]> {
  try {
    const q = query(
      contractorsCol(tenantId),
      where('status', '!=', 'blocked'),
      orderBy('status'),
      orderBy('name', 'asc')
    );
    const snap = await getDocs(q);
    const lower = searchQuery.toLowerCase();

    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Contractor))
      .filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          (c.nip && c.nip.includes(searchQuery)) ||
          (c.euVatId && c.euVatId.toLowerCase().includes(lower)) ||
          (c.shortName && c.shortName.toLowerCase().includes(lower))
      );
  } catch (err) {
    console.error('[contractorService] searchContractors error:', err);
    throw err;
  }
}

export interface NipLookupResult {
  name: string;
  nip: string;
  regon?: string;
  address: string;
  city: string;
  postCode: string;
  country: string;
  isVatPayer: boolean;
  krs?: string;
}

// Stub — in production calls GUS BIR1 API (regon.stat.gov.pl)
export async function lookupByNip(nip: string): Promise<NipLookupResult | null> {
  try {
    const raw = await askAI(
      `You are a GUS BIR API simulator. Return realistic but fictitious Polish company data for NIP: ${nip}. ` +
      `Format your response as strict JSON with these fields: name, nip, regon, address, city, postCode, country (use "PL"), isVatPayer (boolean), krs. ` +
      `Return ONLY the JSON object, no extra text.`
    );

    const json = JSON.parse(raw.trim());
    return json as NipLookupResult;
  } catch (err) {
    console.error('[contractorService] lookupByNip error:', err);
    return null;
  }
}

export interface WhiteListResult {
  nip: string;
  isValid: boolean;
  verifiedAt: string;
  bankAccounts: string[];
  statusDescription: string;
}

// Stub — in production calls MF White List API (wykaz-podatnikow.mf.gov.pl)
export async function verifyWhiteList(
  tenantId: string,
  contractorId: string,
  nip: string
): Promise<WhiteListResult> {
  try {
    const raw = await askAI(
      `Simulate a Polish Ministry of Finance White List VAT taxpayer check for NIP: ${nip}. ` +
      `Return strict JSON with fields: nip, isValid (boolean, usually true for active companies), ` +
      `verifiedAt (current ISO date), bankAccounts (array of 1-2 realistic IBAN strings starting with PL), ` +
      `statusDescription (short Polish text). Return ONLY the JSON object.`
    );

    const result: WhiteListResult = JSON.parse(raw.trim());

    // Persist verification timestamp on contractor
    await updateContractor(tenantId, contractorId, {
      whiteListVerifiedAt: result.verifiedAt,
      isWhiteListValid: result.isValid,
    });

    return result;
  } catch (err) {
    console.error('[contractorService] verifyWhiteList error:', err);
    throw err;
  }
}

export interface ViesResult {
  euVatId: string;
  isValid: boolean;
  name?: string;
  address?: string;
  verifiedAt: string;
}

// Stub — in production calls EC VIES API (ec.europa.eu/taxation_customs/vies)
export async function verifyVies(euVatId: string): Promise<ViesResult> {
  try {
    const raw = await askAI(
      `Simulate a European VIES VAT number validation for: ${euVatId}. ` +
      `Return strict JSON with fields: euVatId, isValid (boolean), name (company name if valid), ` +
      `address (registered address if valid), verifiedAt (current ISO datetime). Return ONLY the JSON object.`
    );

    return JSON.parse(raw.trim()) as ViesResult;
  } catch (err) {
    console.error('[contractorService] verifyVies error:', err);
    throw err;
  }
}

export interface ContractorStats {
  totalInvoiced: number;
  totalOutstanding: number;
  lastInvoiceDate: string | null;
  invoiceCount: number;
}

export async function getContractorStats(
  tenantId: string,
  contractorId: string
): Promise<ContractorStats> {
  try {
    // Resolve contractor to get name for matching invoices
    const contractorSnap = await getDocs(
      query(contractorsCol(tenantId), where('__name__', '==', contractorId))
    );
    if (contractorSnap.empty) {
      return { totalInvoiced: 0, totalOutstanding: 0, lastInvoiceDate: null, invoiceCount: 0 };
    }

    const contractor = { id: contractorSnap.docs[0].id, ...contractorSnap.docs[0].data() } as Contractor;

    const q = query(
      invoicesCol(tenantId),
      where('isDeleted', '==', false),
      where('buyer.name', '==', contractor.name),
      where('status', 'in', ['issued', 'sent', 'partially_paid', 'paid']),
      orderBy('issueDate', 'desc')
    );
    const snap = await getDocs(q);

    let totalInvoiced = 0;
    let totalOutstanding = 0;
    let lastInvoiceDate: string | null = null;

    snap.forEach((d, idx) => {
      const inv = d.data() as SalesInvoice;
      totalInvoiced += inv.totalBrutto ?? 0;
      totalOutstanding += inv.remainingAmount ?? 0;
      if (idx === 0) lastInvoiceDate = inv.issueDate ?? null;
    });

    return {
      totalInvoiced: Math.round(totalInvoiced * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      lastInvoiceDate,
      invoiceCount: snap.size,
    };
  } catch (err) {
    console.error('[contractorService] getContractorStats error:', err);
    throw err;
  }
}

export async function updateContractorStats(
  tenantId: string,
  contractorId: string
): Promise<void> {
  try {
    const stats = await getContractorStats(tenantId, contractorId);
    await updateContractor(tenantId, contractorId, {
      totalInvoiced: stats.totalInvoiced,
      totalOutstanding: stats.totalOutstanding,
      lastInvoiceDate: stats.lastInvoiceDate ?? undefined,
      invoiceCount: stats.invoiceCount,
    });
  } catch (err) {
    console.error('[contractorService] updateContractorStats error:', err);
    throw err;
  }
}
