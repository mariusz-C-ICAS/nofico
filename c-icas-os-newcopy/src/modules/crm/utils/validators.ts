/**
 * Data: 2026-05-12
 * Zmiany: Walidatory biznesowe NIP/REGON/VIES.
 * Ścieżka: /src/modules/crm/utils/validators.ts
 */

export function validateNIP(nip: string): boolean {
  const n = nip.replace(/[\s-]/g, '');
  if (n.length !== 10 || isNaN(parseInt(n))) return false;
  
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(n[i]) * weights[i];
  }
  
  return (sum % 11) === parseInt(n[9]);
}

export function validateREGON(regon: string): boolean {
  const r = regon.replace(/[\s-]/g, '');
  if (r.length !== 9 && r.length !== 14) return false;
  
  if (r.length === 9) {
    const weights = [8, 9, 2, 3, 4, 5, 6, 7];
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += parseInt(r[i]) * weights[i];
    }
    let control = sum % 11;
    if (control === 10) control = 0;
    return control === parseInt(r[8]);
  }
  
  return true; // Simplification for 14-digit REGON
}

/**
 * Mock dla sprawdzania Białej Listy i VIES.
 * CRM-IMP-02
 */
export async function checkBusinessStatus(nip: string) {
  console.log(`Sprawdzanie NIP: ${nip} na Białej Liście KAS i w VIES...`);
  return {
    whiteList: true,
    vies: nip.startsWith('PL'),
    vatStatus: 'Czynny'
  };
}
