import { db } from '../../../lib/firebase';
import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore';
import type { CompanyProfile, IdesGenerationResult } from '../types';

const COMPANY_PREFIXES = ['Alfa', 'Beta', 'Gamma', 'Delta', 'Sigma', 'Omega', 'Euro', 'Pro', 'Tech', 'Net', 'Global', 'Max', 'Smart', 'Fast', 'Top'];
const COMPANY_SUFFIXES = ['Sp. z o.o.', 'S.A.', 'Sp. j.', 'S.C.'];
const INDUSTRIES       = ['IT', 'Produkcja', 'Handel', 'Budownictwo', 'Logistyka', 'Finanse', 'Uslugi'];
const DEAL_STAGES      = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const CITIES           = ['Warszawa', 'Krakow', 'Wroclaw', 'Gdansk', 'Poznan', 'Lodz', 'Katowice', 'Lublin'];
const FIRST_NAMES      = ['Jan', 'Anna', 'Piotr', 'Katarzyna', 'Michal', 'Agnieszka', 'Marcin', 'Maria'];
const LAST_NAMES       = ['Nowak', 'Kowalski', 'Wisniewski', 'Dabrowski', 'Lewandowski', 'Wojcik', 'Kaminski'];

function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pastTs(monthsAgo: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() - monthsAgo * 30 * 24 * 3600 * 1000));
}
function mockNip(): string {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
}

export async function generateCRM(profile: CompanyProfile): Promise<IdesGenerationResult> {
  const { tenantId, employeeCount, generateMonths } = profile;
  let created = 0;

  const clientCount = Math.min(Math.round(employeeCount * 2), 50);
  const clientIds: string[] = [];

  // 1. Customers in batches
  for (let batch_start = 0; batch_start < clientCount; batch_start += 400) {
    const batch = writeBatch(db);
    const end = Math.min(batch_start + 400, clientCount);
    for (let i = batch_start; i < end; i++) {
      const ref = doc(collection(db, 'customers'));
      clientIds.push(ref.id);
      const createdMonthsAgo = rnd(1, generateMonths);
      batch.set(ref, {
        tenantId,
        name:     `${pick(COMPANY_PREFIXES)} ${pick(COMPANY_PREFIXES)} ${pick(COMPANY_SUFFIXES)}`,
        nip:      mockNip(),
        industry: pick(INDUSTRIES),
        city:     pick(CITIES),
        email:    `kontakt@firma${i + 1}.pl`,
        phone:    `+48 ${rnd(500, 799)} ${rnd(100, 999)} ${rnd(100, 999)}`,
        status:   rnd(0, 4) > 0 ? 'ACTIVE' : 'INACTIVE',
        createdAt: pastTs(createdMonthsAgo),
        _ides: true,
      });
      created++;
    }
    await batch.commit();
  }

  // 2. Deals — 20-40
  const dealCount = rnd(20, Math.min(40, clientCount * 2));
  const dealBatch = writeBatch(db);
  for (let i = 0; i < dealCount; i++) {
    const stage = pick(DEAL_STAGES);
    const closedMonthsAgo = rnd(1, generateMonths);
    const ref = doc(collection(db, 'deals'));
    dealBatch.set(ref, {
      tenantId,
      title:      `Projekt ${pick(COMPANY_PREFIXES)} #${rnd(100, 999)}`,
      customerId: clientIds[rnd(0, clientIds.length - 1)] || '',
      value:      rnd(10, 500) * 1000,
      stage,
      probability: stage === 'won' ? 100 : stage === 'lost' ? 0 : rnd(10, 80),
      closedAt:   (stage === 'won' || stage === 'lost') ? pastTs(closedMonthsAgo) : null,
      createdAt:  pastTs(rnd(closedMonthsAgo, generateMonths)),
      assignedTo: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      _ides: true,
    });
    created++;
  }
  await dealBatch.commit();

  // 3. CRM Activities in tenant subcollection
  const actBatch = writeBatch(db);
  const actCount = Math.min(dealCount * 3, 100);
  for (let i = 0; i < actCount; i++) {
    const ref = doc(collection(db, `tenants/${tenantId}/crmActivities`));
    actBatch.set(ref, {
      tenantId,
      type:      pick(['CALL', 'EMAIL', 'MEETING', 'NOTE']),
      subject:   `Kontakt z klientem - ${pick(['follow-up', 'oferta', 'demo', 'umowa'])}`,
      doneAt:    pastTs(rnd(1, generateMonths)),
      createdAt: pastTs(rnd(1, generateMonths)),
      _ides: true,
    });
    created++;
  }
  await actBatch.commit();

  return { module: 'crm', created, errors: 0 };
}
