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
import { searchByNip } from './gusBirService';
import { checkNipOnBialaLista } from './bialaListaService';
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

export async function lookupByNip(nip: string, tenantId: string): Promise<NipLookupResult | null> {
  try {
    const result = await searchByNip(nip, tenantId);
    if (!result.found || !result.data) return null;
    const d = result.data;
    return {
      name: d.name,
      nip: d.nip,
      regon: d.regon,
      address: `${d.street ?? ''} ${d.buildingNumber ?? ''}`.trim(),
      city: d.city ?? '',
      postCode: d.postalCode ?? '',
      country: 'PL',
      isVatPayer: d.activityStatus === 'active',
      krs: undefined,
    };
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

export async function verifyWhiteList(tenantId: string, contractorId: string, nip: string): Promise<WhiteListResult> {
  try {
    const blResult = await checkNipOnBialaLista(nip);
    const result: WhiteListResult = {
      nip: blResult.nip,
      isValid: blResult.isActiveVatPayer,
      verifiedAt: blResult.requestDate,
      bankAccounts: blResult.bankAccounts ?? [],
      statusDescription: blResult.isActiveVatPayer ? 'Czynny podatnik VAT' : 'Brak na białej liście lub nieaktywny',
    };
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

export async function verifyVies(euVatId: string): Promise<ViesResult> {
  const verifiedAt = new Date().toISOString();
  try {
    const countryCode = euVatId.slice(0, 2).toUpperCase();
    const vatNumber = euVatId.slice(2).replace(/[\s\-]/g, '');
    const url = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${countryCode}/vat/${vatNumber}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return { euVatId, isValid: false, verifiedAt };
    const json = await res.json() as { isValid?: boolean; name?: string; address?: string; userError?: string };
    return {
      euVatId,
      isValid: json.isValid ?? false,
      name: json.name ?? undefined,
      address: json.address ?? undefined,
      verifiedAt,
    };
  } catch (err) {
    console.error('[contractorService] verifyVies error:', err);
    return { euVatId, isValid: false, verifiedAt };
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

    let snapIdx = 0;
    snap.forEach((d) => {
      const inv = d.data() as SalesInvoice;
      totalInvoiced += inv.totalBrutto ?? 0;
      totalOutstanding += inv.remainingAmount ?? 0;
      if (snapIdx === 0) lastInvoiceDate = inv.issueDate ?? null;
      snapIdx++;
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
