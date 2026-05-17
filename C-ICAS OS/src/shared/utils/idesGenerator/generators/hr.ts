import { db } from '../../../lib/firebase';
import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore';
import type { CompanyProfile, IdesGenerationResult } from '../types';

const FIRST_NAMES_M = ['Jan', 'Piotr', 'Tomasz', 'Krzysztof', 'Marcin', 'Michal', 'Adam', 'Lukasz', 'Rafal', 'Pawel', 'Kamil', 'Marek', 'Jakub', 'Artur', 'Robert'];
const FIRST_NAMES_F = ['Anna', 'Maria', 'Katarzyna', 'Agnieszka', 'Barbara', 'Ewa', 'Marta', 'Joanna', 'Monika', 'Magdalena', 'Karolina', 'Natalia', 'Aleksandra', 'Paulina', 'Dorota'];
const LAST_NAMES    = ['Nowak', 'Kowalski', 'Wisniewski', 'Dabrowski', 'Lewandowski', 'Wojcik', 'Kaminski', 'Kowalczyk', 'Zielinski', 'Szymanski', 'Wozniak', 'Kozlowski', 'Jankowski', 'Wojciechowski', 'Kwiatkowski', 'Kaczmarek', 'Mazur', 'Krawczyk', 'Piotrowski', 'Grabowski'];
const CITIES        = ['Warszawa', 'Krakow', 'Wroclaw', 'Gdansk', 'Poznan', 'Lodz', 'Katowice', 'Lublin', 'Bialystok', 'Rzeszow'];
const LEAVE_TYPES   = ['Urlop wypoczynkowy', 'Zwolnienie lekarskie', 'Urlop okolicznosciowy'];
const LEAVE_STATUSES = ['approved', 'approved', 'approved', 'rejected'];

const POSITIONS_BY_TYPE: Record<string, string[]> = {
  manufacturing: ['Operator Maszyn', 'Technik UR', 'Inzynier Produkcji', 'Kierownik Zmiany', 'Kontroler Jakosci'],
  services:      ['Konsultant', 'Kierownik Projektu', 'Analityk Biznesowy', 'Specjalista ds. Obslugi Klienta', 'Asystent Zarzadu'],
  it:            ['Frontend Developer', 'Backend Developer', 'DevOps Engineer', 'QA Engineer', 'Scrum Master'],
  retail:        ['Sprzedawca', 'Kasjer', 'Kierownik Sklepu', 'Merchandiser', 'Magazynier'],
  construction:  ['Kierownik Budowy', 'Inzynier Budowlany', 'Kosztorysant', 'Majster', 'Geodeta'],
  healthcare:    ['Lekarz', 'Pielegniarka', 'Rejestratorka', 'Fizjoterapeuta', 'Farmaceuta'],
  education:     ['Nauczyciel', 'Wykladowca', 'Asystent Naukowy', 'Pedagog', 'Bibliotekarz'],
  logistics:     ['Logistyk', 'Kierowca', 'Spedytor', 'Dyspozytor', 'Magazynier'],
  finance_sector:['Analityk Finansowy', 'Ksiegowy', 'Doradca Klienta', 'Kontroler', 'Audytor'],
};

function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pastTs(monthsAgo: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() - monthsAgo * 30 * 24 * 3600 * 1000));
}

const DEPTS = [
  { id: 'board', name: 'Zarzad',    parentId: '' },
  { id: 'hr',    name: 'HR',         parentId: 'board' },
  { id: 'it',    name: 'IT',         parentId: 'board' },
  { id: 'sales', name: 'Sprzedaz',   parentId: 'board' },
  { id: 'fin',   name: 'Finanse',    parentId: 'board' },
  { id: 'ops',   name: 'Operacje',   parentId: 'board' },
];

const BASE_ROLES = [
  { name: 'CEO',             deptKey: 'board', isManager: true  },
  { name: 'CFO',             deptKey: 'fin',   isManager: true  },
  { name: 'Dyrektor HR',     deptKey: 'hr',    isManager: true  },
  { name: 'Specjalista HR',  deptKey: 'hr',    isManager: false },
  { name: 'Dyrektor IT',     deptKey: 'it',    isManager: true  },
  { name: 'Developer',       deptKey: 'it',    isManager: false },
  { name: 'Dyrektor Sprzedazy', deptKey: 'sales', isManager: true  },
  { name: 'Przedstawiciel Handlowy', deptKey: 'sales', isManager: false },
  { name: 'Ksiegowy',        deptKey: 'fin',   isManager: false },
  { name: 'Specjalista Operacyjny',  deptKey: 'ops',  isManager: false },
];

export async function generateHR(profile: CompanyProfile): Promise<IdesGenerationResult> {
  const { tenantId, companyType, employeeCount, generateMonths } = profile;
  let created = 0;

  // 1. Departments
  const deptBatch = writeBatch(db);
  const deptRefs: Record<string, string> = {};
  for (const d of DEPTS) {
    const ref = doc(collection(db, 'hr_departments'));
    deptRefs[d.id] = ref.id;
    deptBatch.set(ref, {
      name: d.name,
      parentId: d.parentId ? (deptRefs[d.parentId] || '') : '',
      tenantId,
      createdAt: pastTs(generateMonths + 2),
      _ides: true,
    });
  }
  await deptBatch.commit();

  // 2. Roles
  const roleBatch = writeBatch(db);
  const roleRefs: Record<string, string> = {};
  const positions = POSITIONS_BY_TYPE[companyType] ?? POSITIONS_BY_TYPE['services'];
  const allRoles = [
    ...BASE_ROLES,
    ...positions.map(p => ({ name: p, deptKey: 'ops', isManager: false })),
  ];
  for (const r of allRoles) {
    const ref = doc(collection(db, 'hr_roles'));
    roleRefs[r.name] = ref.id;
    roleBatch.set(ref, {
      name: r.name,
      departmentId: deptRefs[r.deptKey] || deptRefs['ops'],
      isManager: r.isManager,
      tenantId,
      createdAt: pastTs(generateMonths + 1),
      _ides: true,
    });
  }
  await roleBatch.commit();

  // 3. Employees in batches of 400
  const roleNames = Object.keys(roleRefs);
  const BATCH_SIZE = 400;

  for (let start = 0; start < employeeCount; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE, employeeCount);
    const batch = writeBatch(db);
    for (let i = start; i < end; i++) {
      const gender    = Math.random() > 0.5 ? 'M' : 'F';
      const firstName = gender === 'M' ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
      const lastName  = pick(LAST_NAMES);
      const roleName  = pick(roleNames);
      const deptName  = pick(DEPTS).name;
      const hireMonthsAgo = rnd(1, generateMonths);
      const salary    = rnd(4500, 18000);
      const empRef    = doc(collection(db, 'employees'));
      batch.set(empRef, {
        tenantId,
        firstName,
        lastName,
        fullName:     `${firstName} ${lastName}`,
        gender,
        email:        `${firstName.toLowerCase()}.${lastName.toLowerCase()}@firma.test`,
        contractType: pick(['UOP', 'UOP', 'UOP', 'B2B', 'Zlecenie']),
        status:       'ACTIVE',
        department:   deptName,
        departmentId: deptRefs[DEPTS.find(d => d.name === deptName)?.id || 'ops'] || '',
        role:         roleName,
        roleId:       roleRefs[roleName] || '',
        salary,
        salaryBasis:  salary,
        hireDate:     pastTs(hireMonthsAgo),
        birthDate:    pastTs(rnd(25 * 12, 55 * 12)),
        city:         pick(CITIES),
        createdAt:    pastTs(hireMonthsAgo),
        _ides: true,
      });
      created++;
    }
    await batch.commit();
  }

  // 4. Leave requests
  const leaveBatch = writeBatch(db);
  let leaveCount = 0;
  for (let i = 0; i < Math.min(employeeCount * 2, 200); i++) {
    const startMonthsAgo = rnd(1, generateMonths);
    const days = rnd(2, 14);
    const startDate = new Date(Date.now() - startMonthsAgo * 30 * 24 * 3600 * 1000);
    const endDate   = new Date(startDate.getTime() + days * 24 * 3600 * 1000);
    const ref = doc(collection(db, 'leaveRequests'));
    leaveBatch.set(ref, {
      tenantId,
      type:      pick(LEAVE_TYPES),
      startDate: Timestamp.fromDate(startDate),
      endDate:   Timestamp.fromDate(endDate),
      days,
      status:    pick(LEAVE_STATUSES),
      createdAt: Timestamp.fromDate(startDate),
      _ides: true,
    });
    leaveCount++;
  }
  await leaveBatch.commit();

  return { module: 'hr', created: created + leaveCount, errors: 0 };
}
