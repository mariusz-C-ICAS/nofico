import { db } from '../../../lib/firebase';
import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore';
import type { CompanyProfile, IdesGenerationResult } from '../types';

function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pastTs(monthsAgo: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() - monthsAgo * 30 * 24 * 3600 * 1000));
}

const ASSET_SETS: Record<string, { name: string; category: string; price: [number, number] }[]> = {
  manufacturing: [
    { name: 'Tokarka CNC',          category: 'MACHINERY', price: [80000,  350000] },
    { name: 'Frezarka',             category: 'MACHINERY', price: [60000,  200000] },
    { name: 'Spawarka MIG/MAG',     category: 'MACHINERY', price: [5000,   25000]  },
    { name: 'Linia montazowa',      category: 'MACHINERY', price: [200000, 800000] },
    { name: 'Wozek widlowy',        category: 'VEHICLE',   price: [30000,  120000] },
  ],
  it: [
    { name: 'Serwer Dell PowerEdge',category: 'IT',        price: [15000,  80000]  },
    { name: 'Switch sieciowy',      category: 'IT',        price: [2000,   15000]  },
    { name: 'Macierz NAS',          category: 'IT',        price: [8000,   40000]  },
  ],
  retail: [
    { name: 'Kasa fiskalna',        category: 'EQUIPMENT', price: [2000,   8000]   },
    { name: 'Chlodnia sklepowa',    category: 'EQUIPMENT', price: [5000,   20000]  },
    { name: 'System monitoringu',   category: 'EQUIPMENT', price: [3000,   15000]  },
  ],
  healthcare: [
    { name: 'Aparat USG',           category: 'EQUIPMENT', price: [20000,  150000] },
    { name: 'Defibrylator AED',     category: 'EQUIPMENT', price: [5000,   15000]  },
    { name: 'Respirator',           category: 'EQUIPMENT', price: [30000,  100000] },
  ],
  construction: [
    { name: 'Dzwig budowlany',      category: 'MACHINERY', price: [100000, 500000] },
    { name: 'Betoniarka',           category: 'MACHINERY', price: [5000,   20000]  },
    { name: 'Koparka',              category: 'MACHINERY', price: [80000,  300000] },
  ],
};

const COMMON_ASSETS = [
  { name: 'Laptop Dell/HP/Lenovo',  category: 'IT',        price: [3000,   8000]   },
  { name: 'Samochod osobowy',       category: 'VEHICLE',   price: [60000,  200000] },
  { name: 'Meble biurowe (zestaw)', category: 'FURNITURE', price: [2000,   8000]   },
  { name: 'Klimatyzator',           category: 'EQUIPMENT', price: [3000,   12000]  },
];

export async function generateAssets(profile: CompanyProfile): Promise<IdesGenerationResult> {
  const { tenantId, companyType, employeeCount, generateMonths } = profile;
  let created = 0;

  const typeAssets  = ASSET_SETS[companyType] ?? [];
  const allAssets   = [...typeAssets, ...COMMON_ASSETS];
  const assetCount  = Math.min(5 + Math.round(employeeCount / 5), 60);

  for (let b = 0; b < assetCount; b += 400) {
    const batch = writeBatch(db);
    const end   = Math.min(b + 400, assetCount);
    for (let i = b; i < end; i++) {
      const template       = allAssets[i % allAssets.length];
      const purchaseMonths = rnd(12, Math.max(36, generateMonths + 12));
      const purchasePrice  = rnd(template.price[0], template.price[1]);
      const yearsOwned     = purchaseMonths / 12;
      const deprecRate     = 0.2;
      const currentValue   = Math.round(purchasePrice * Math.pow(1 - deprecRate, yearsOwned));
      const ref = doc(collection(db, 'fixed_assets'));
      batch.set(ref, {
        tenantId,
        name:          `${template.name} #${String(i + 1).padStart(3, '0')}`,
        category:      template.category,
        serialNumber:  `SN-${rnd(10000, 99999)}-${rnd(100, 999)}`,
        purchaseDate:  pastTs(purchaseMonths),
        purchasePrice,
        currentValue:  Math.max(currentValue, 0),
        depreciationRate: deprecRate * 100,
        location:      pick(['Biuro Glowne', 'Hala Produkcyjna', 'Magazyn', 'Biuro Zdalne']),
        status:        rnd(0, 9) > 1 ? 'ACTIVE' : 'DISPOSED',
        createdAt:     pastTs(purchaseMonths),
        _ides: true,
      });
      created++;
    }
    await batch.commit();
  }

  return { module: 'assets', created, errors: 0 };
}
