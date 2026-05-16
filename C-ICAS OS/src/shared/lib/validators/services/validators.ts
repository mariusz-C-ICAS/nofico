import type { ValidationResult } from '../types';

const digits = (s: string) => s.replace(/[\s\-]/g, '');

export function validateNIP(nip: string): ValidationResult {
  const n = digits(nip);
  if (!/^\d{10}$/.test(n)) return { valid: false, error: 'NIP musi mieć 10 cyfr' };
  const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = w.reduce((acc, wi, i) => acc + wi * Number(n[i]), 0);
  if (sum % 11 !== Number(n[9])) return { valid: false, error: 'Nieprawidłowa suma kontrolna NIP' };
  return { valid: true };
}

export function validateREGON(regon: string): ValidationResult {
  const n = digits(regon);
  if (n.length === 9) {
    const w = [8, 9, 2, 3, 4, 5, 6, 7];
    const sum = w.reduce((acc, wi, i) => acc + wi * Number(n[i]), 0);
    const check = (sum % 11) % 10;
    if (check !== Number(n[8])) return { valid: false, error: 'Nieprawidłowa suma kontrolna REGON' };
    return { valid: true };
  }
  if (n.length === 14) {
    const w = [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8];
    const sum = w.reduce((acc, wi, i) => acc + wi * Number(n[i]), 0);
    const check = (sum % 11) % 10;
    if (check !== Number(n[13])) return { valid: false, error: 'Nieprawidłowa suma kontrolna REGON 14' };
    return { valid: true };
  }
  return { valid: false, error: 'REGON musi mieć 9 lub 14 cyfr' };
}

export function validatePESEL(pesel: string): ValidationResult {
  const n = digits(pesel);
  if (!/^\d{11}$/.test(n)) return { valid: false, error: 'PESEL musi mieć 11 cyfr' };
  const w = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  const sum = w.reduce((acc, wi, i) => acc + wi * Number(n[i]), 0);
  const check = (10 - (sum % 10)) % 10;
  if (check !== Number(n[10])) return { valid: false, error: 'Nieprawidłowa suma kontrolna PESEL' };
  return { valid: true };
}

export function validateIBAN(iban: string): ValidationResult {
  const n = iban.replace(/\s/g, '').toUpperCase();
  if (n.length < 15 || n.length > 34) return { valid: false, error: 'Nieprawidłowa długość IBAN' };
  const rearranged = n.slice(4) + n.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
  let remainder = 0;
  for (const ch of numeric) remainder = (remainder * 10 + Number(ch)) % 97;
  if (remainder !== 1) return { valid: false, error: 'Nieprawidłowy IBAN (mod97)' };
  return { valid: true };
}

export function validateKRS(krs: string): ValidationResult {
  const n = digits(krs);
  if (!/^\d{10}$/.test(n)) return { valid: false, error: 'KRS musi mieć 10 cyfr' };
  return { valid: true };
}

export function validatePostalCodePL(code: string): ValidationResult {
  if (!/^\d{2}-\d{3}$/.test(code.trim())) return { valid: false, error: 'Kod pocztowy musi być w formacie XX-XXX' };
  return { valid: true };
}
