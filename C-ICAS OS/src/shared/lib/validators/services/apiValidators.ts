import type { ViesResult, BialaListaResult, GUSResult } from '../types';

const FUNCTIONS_BASE = import.meta.env.VITE_FUNCTIONS_URL ?? 'https://europe-west1-cicas-os.cloudfunctions.net';

export async function checkVIES(countryCode: string, vatNumber: string): Promise<ViesResult> {
  const res = await fetch(`${FUNCTIONS_BASE}/validateVIES`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ countryCode, vatNumber }),
  });
  if (!res.ok) throw new Error(`VIES API error: ${res.status}`);
  return res.json();
}

export async function checkBialaLista(nip: string): Promise<BialaListaResult> {
  const res = await fetch(`${FUNCTIONS_BASE}/validateBialaLista`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nip }),
  });
  if (!res.ok) throw new Error(`Biała Lista API error: ${res.status}`);
  return res.json();
}

export async function checkGUSBIR(nip: string): Promise<GUSResult> {
  const res = await fetch(`${FUNCTIONS_BASE}/validateGUSBIR`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nip }),
  });
  if (!res.ok) throw new Error(`GUS BIR API error: ${res.status}`);
  return res.json();
}
