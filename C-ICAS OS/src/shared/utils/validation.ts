// Polish NIP, IBAN, and common financial validators

export function normalizeNip(raw: string): string {
  return raw.replace(/[\s\-]/g, '');
}

export function validateNip(raw: string): boolean {
  const nip = normalizeNip(raw);
  if (!/^\d{10}$/.test(nip)) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(nip[i]), 0);
  return sum % 11 === Number(nip[9]);
}

export function normalizeIban(raw: string): string {
  return raw.replace(/\s/g, '').toUpperCase();
}

export function validateIban(raw: string): boolean {
  const iban = normalizeIban(raw);
  if (iban.length < 5 || iban.length > 34) return false;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
  let remainder = BigInt(0);
  for (const ch of numeric) {
    remainder = (remainder * BigInt(10) + BigInt(Number(ch))) % BigInt(97);
  }
  return remainder === BigInt(1);
}

export function formatIban(raw: string): string {
  const iban = normalizeIban(raw);
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

export function validatePolishNrbAccount(raw: string): boolean {
  const acc = raw.replace(/\s/g, '');
  if (!/^\d{26}$/.test(acc)) return false;
  return validateIban('PL' + acc);
}

export function validateKsefNumber(raw: string): boolean {
  if (!raw || raw.trim().length < 10) return false;
  return /^[\w\d/\-]{10,40}$/.test(raw.trim());
}

export function nipErrorMessage(raw: string): string | null {
  if (!raw) return null;
  const nip = normalizeNip(raw);
  if (!/^\d{10}$/.test(nip)) return 'NIP musi mieć 10 cyfr';
  if (!validateNip(raw)) return 'Nieprawidłowa cyfra kontrolna NIP';
  return null;
}

export function ibanErrorMessage(raw: string): string | null {
  if (!raw) return null;
  if (!validateIban(raw)) return 'Nieprawidłowy numer IBAN';
  return null;
}
