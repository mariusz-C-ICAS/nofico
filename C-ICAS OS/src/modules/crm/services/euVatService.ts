export interface EuVatRate {
  country: string;
  code: string;
  standard: number;
  reduced: number[];
  superReduced?: number;
  parking?: number;
  zeroRated: boolean;
}

export const EU_VAT_RATES: EuVatRate[] = [
  { country: 'Austria',       code: 'AT', standard: 20, reduced: [10, 13],      zeroRated: false },
  { country: 'Belgia',        code: 'BE', standard: 21, reduced: [6, 12],        zeroRated: true  },
  { country: 'Bułgaria',      code: 'BG', standard: 20, reduced: [9],            zeroRated: false },
  { country: 'Chorwacja',     code: 'HR', standard: 25, reduced: [5, 13],        zeroRated: false },
  { country: 'Cypr',          code: 'CY', standard: 19, reduced: [5, 9],         zeroRated: true  },
  { country: 'Czechy',        code: 'CZ', standard: 21, reduced: [12],           zeroRated: false },
  { country: 'Dania',         code: 'DK', standard: 25, reduced: [],             zeroRated: true  },
  { country: 'Estonia',       code: 'EE', standard: 22, reduced: [9],            zeroRated: true  },
  { country: 'Finlandia',     code: 'FI', standard: 25.5, reduced: [10, 14],     zeroRated: true  },
  { country: 'Francja',       code: 'FR', standard: 20, reduced: [5.5, 10],      superReduced: 2.1, zeroRated: true  },
  { country: 'Grecja',        code: 'GR', standard: 24, reduced: [6, 13],        zeroRated: false },
  { country: 'Hiszpania',     code: 'ES', standard: 21, reduced: [10],           superReduced: 4, zeroRated: true  },
  { country: 'Holandia',      code: 'NL', standard: 21, reduced: [9],            zeroRated: true  },
  { country: 'Irlandia',      code: 'IE', standard: 23, reduced: [9, 13.5],      superReduced: 4.8, parking: 13.5, zeroRated: true  },
  { country: 'Litwa',         code: 'LT', standard: 21, reduced: [5, 9],         zeroRated: true  },
  { country: 'Luksemburg',    code: 'LU', standard: 17, reduced: [8],            superReduced: 3, zeroRated: true  },
  { country: 'Łotwa',         code: 'LV', standard: 21, reduced: [5, 12],        zeroRated: true  },
  { country: 'Malta',         code: 'MT', standard: 18, reduced: [5, 7],         zeroRated: true  },
  { country: 'Niemcy',        code: 'DE', standard: 19, reduced: [7],            zeroRated: true  },
  { country: 'Polska',        code: 'PL', standard: 23, reduced: [5, 8],         zeroRated: true  },
  { country: 'Portugalia',    code: 'PT', standard: 23, reduced: [6, 13],        parking: 13, zeroRated: true  },
  { country: 'Rumunia',       code: 'RO', standard: 19, reduced: [5, 9],         zeroRated: false },
  { country: 'Słowacja',      code: 'SK', standard: 20, reduced: [10],           zeroRated: true  },
  { country: 'Słowenia',      code: 'SI', standard: 22, reduced: [5, 9.5],       zeroRated: false },
  { country: 'Szwecja',       code: 'SE', standard: 25, reduced: [6, 12],        zeroRated: true  },
  { country: 'Węgry',         code: 'HU', standard: 27, reduced: [5, 18],        zeroRated: false },
  { country: 'Włochy',        code: 'IT', standard: 22, reduced: [5, 10],        superReduced: 4, zeroRated: true  },
];

export function getVatRate(countryCode: string): EuVatRate | undefined {
  return EU_VAT_RATES.find(r => r.code === countryCode);
}

export function getStandardRate(countryCode: string): number {
  return getVatRate(countryCode)?.standard ?? 23;
}

export function getAllRates(countryCode: string): number[] {
  const r = getVatRate(countryCode);
  if (!r) return [0];
  const rates = [0, ...r.reduced, r.standard];
  if (r.superReduced) rates.unshift(r.superReduced);
  if (r.parking) rates.push(r.parking);
  return [...new Set(rates)].sort((a, b) => a - b);
}

export function calculateVat(netAmount: number, countryCode: string, rateType: 'standard' | 'reduced' = 'standard'): {
  net: number; vat: number; gross: number; rate: number
} {
  const vatData = getVatRate(countryCode);
  const rate = rateType === 'standard'
    ? (vatData?.standard ?? 23)
    : (vatData?.reduced[0] ?? vatData?.standard ?? 23);
  const vat = Math.round(netAmount * (rate / 100) * 100) / 100;
  return { net: netAmount, vat, gross: netAmount + vat, rate };
}

export function reverseVat(grossAmount: number, countryCode: string, rateType: 'standard' | 'reduced' = 'standard'): {
  net: number; vat: number; gross: number; rate: number
} {
  const vatData = getVatRate(countryCode);
  const rate = rateType === 'standard'
    ? (vatData?.standard ?? 23)
    : (vatData?.reduced[0] ?? vatData?.standard ?? 23);
  const net = Math.round((grossAmount / (1 + rate / 100)) * 100) / 100;
  const vat = Math.round((grossAmount - net) * 100) / 100;
  return { net, vat, gross: grossAmount, rate };
}
