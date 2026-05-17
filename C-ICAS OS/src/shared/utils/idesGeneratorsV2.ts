import { collection, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

type LogFn = (msg: string) => void;

// ── Helpers ───────────────────────────────────────────────────────────────────
function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rndInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function ts(daysBack: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() - daysBack * 86400000));
}
function dateStr(daysBack: number): string {
  return new Date(Date.now() - daysBack * 86400000).toISOString().split('T')[0];
}
function futureDateStr(daysAhead: number): string {
  return new Date(Date.now() + daysAhead * 86400000).toISOString().split('T')[0];
}
function pesel(): string {
  const y = rndInt(70, 95); const m = rndInt(1, 12); const d = rndInt(1, 28);
  return `${y}${String(m).padStart(2,'0')}${String(d).padStart(2,'0')}${rndInt(10000,99999)}`;
}
function nip(): string { return String(rndInt(1000000000, 9999999999)); }
function bankAccount(): string { return `PL${rndInt(10,99)} ${rndInt(1000,9999)} ${rndInt(1000,9999)} ${rndInt(1000,9999)} ${rndInt(1000,9999)} ${rndInt(1000,9999)} ${rndInt(1000,9999)}`; }

const FM = ["Jan","Piotr","Tomasz","Andrzej","Michał","Marcin","Jakub","Adam","Krzysztof","Stanisław"];
const FF = ["Anna","Maria","Katarzyna","Agnieszka","Małgorzata","Krystyna","Barbara","Ewa","Elżbieta","Zofia"];
const LN = ["Nowak","Kowalski","Wiśniewski","Lewandowski","Wójcik","Zieliński","Mazur","Kowalczyk","Dąbrowski","Szymański"];
const CITIES = ["Warszawa","Kraków","Wrocław","Poznań","Gdańsk","Łódź","Szczecin","Katowice"];
const STREETS = ["Główna","Lipowa","Słoneczna","Polna","Leśna","Kwiatowa","Parkowa","Wiśniowa"];

// ── HR ────────────────────────────────────────────────────────────────────────
export const generateHrIdesV2 = async (tenantId: string, log: LogFn) => {
  const DEPTS = [
    { key: 'board', name: 'Zarząd', type: 'BOARD', parent: null },
    { key: 'hr', name: 'Zasoby Ludzkie', type: 'SUPPORT', parent: 'board' },
    { key: 'it', name: 'Dział IT', type: 'CORE', parent: 'board' },
    { key: 'sales', name: 'Sprzedaż i Marketing', type: 'CORE', parent: 'board' },
    { key: 'finance', name: 'Finanse i Controlling', type: 'SUPPORT', parent: 'board' },
    { key: 'prod', name: 'Produkcja', type: 'CORE', parent: 'board' },
  ];
  const deptRefs: Record<string, ReturnType<typeof doc>> = {};
  for (const d of DEPTS) { deptRefs[d.key] = doc(collection(db, 'hr_departments')); }

  const batch = writeBatch(db);
  for (const d of DEPTS) {
    batch.set(deptRefs[d.key], {
      tenantId, name: d.name, type: d.type, isBoard: d.key === 'board',
      parentId: d.parent ? deptRefs[d.parent].id : null,
      headCount: rndInt(3, 15), costCenter: `CC-${rndInt(100,999)}`,
      createdAt: ts(rndInt(420, 450)),
    });
  }

  const ROLES = [
    { key:'ceo',   name:'CEO',                           dept:'board',   mgr:true,  salary:25000 },
    { key:'cfo',   name:'CFO',                           dept:'finance', mgr:true,  salary:20000 },
    { key:'hrdir', name:'Dyrektor HR',                   dept:'hr',      mgr:true,  salary:15000 },
    { key:'hrspe', name:'Specjalista ds. Kadr i Płac',   dept:'hr',      mgr:false, salary:7000  },
    { key:'hrrec', name:'Specjalista ds. Rekrutacji',    dept:'hr',      mgr:false, salary:7500  },
    { key:'itdir', name:'Dyrektor IT',                   dept:'it',      mgr:true,  salary:18000 },
    { key:'itsen', name:'Senior Developer',              dept:'it',      mgr:false, salary:14000 },
    { key:'itmid', name:'Mid Developer',                 dept:'it',      mgr:false, salary:10000 },
    { key:'itsup', name:'IT Support',                    dept:'it',      mgr:false, salary:6500  },
    { key:'saldi', name:'Dyrektor Sprzedaży',            dept:'sales',   mgr:true,  salary:16000 },
    { key:'salre', name:'Przedstawiciel Handlowy',       dept:'sales',   mgr:false, salary:8000  },
    { key:'finco', name:'Kontroler Finansowy',           dept:'finance', mgr:false, salary:9000  },
    { key:'prodi', name:'Kierownik Produkcji',           dept:'prod',    mgr:true,  salary:12000 },
    { key:'prodw', name:'Pracownik Produkcji',           dept:'prod',    mgr:false, salary:5500  },
  ];
  const roleRefs: Record<string, ReturnType<typeof doc>> = {};
  for (const r of ROLES) { roleRefs[r.key] = doc(collection(db, 'hr_roles')); }
  for (const r of ROLES) {
    batch.set(roleRefs[r.key], {
      tenantId, name: r.name, departmentId: deptRefs[r.dept].id,
      isManager: r.mgr, baseSalary: r.salary, grade: r.mgr ? 'SENIOR' : 'MID',
      createdAt: ts(rndInt(400, 440)),
    });
  }

  const empIds: string[] = [];
  for (let i = 0; i < 35; i++) {
    const gender = Math.random() > 0.45 ? 'M' : 'F';
    const firstName = gender === 'M' ? rnd(FM) : rnd(FF);
    const lastName = rnd(LN);
    const role = ROLES[i % ROLES.length];
    const ref = doc(collection(db, 'employees'));
    empIds.push(ref.id);
    const hireDate = rndInt(100, 450);
    batch.set(ref, {
      tenantId, firstName, lastName, middleName: rnd(FM),
      employeeNumber: `EMP-${String(1000 + i).padStart(4,'0')}`,
      employeeType: rnd(['EMPLOYEE','EMPLOYEE','EMPLOYEE','CONTRACTOR']),
      gender, pesel: pesel(), nip: nip(),
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@firma.local`,
      phone: `+48 ${rndInt(500000000, 599999999)}`,
      birthDate: dateStr(rndInt(9000, 16000)), birthPlace: rnd(CITIES),
      nationality: 'Polska', citizenship: 'PL',
      street: `${rnd(STREETS)} ${rndInt(1,120)}`, city: rnd(CITIES),
      postalCode: `${rndInt(10,99)}-${rndInt(100,999)}`, country: 'PL',
      contractType: rnd(['UOP','UOP','UOP','UZ','B2B']),
      contractStartDate: dateStr(hireDate), contractEndDate: null,
      status: rnd(['ACTIVE','ACTIVE','ACTIVE','ACTIVE','ON_LEAVE']),
      baseSalary: role.salary + rndInt(-1000, 3000),
      salaryType: 'GROSS', vatType: rnd(['ZWOLNIONY','VAT23']),
      bankAccount: bankAccount(), bankName: rnd(['PKO BP','ING','Santander','mBank','Alior Bank']),
      departmentId: deptRefs[role.dept].id, roleId: roleRefs[role.key].id, role: role.name,
      taxRelief: 300, kup: 250, fgsp: true, fp: true, pitExempt: false,
      ohsTraining: { date: dateStr(rndInt(30,365)), expiryDate: futureDateStr(rndInt(180,730)), type: 'Podstawowe' },
      medicalExam: { date: dateStr(rndInt(30,365)), expiryDate: futureDateStr(rndInt(180,365)), type: 'Wstępne' },
      skills: rnd([['React','Node.js','SQL'],['Excel','SAP','Analiza'],['Sprzedaż','CRM','Negocjacje'],['Logistyka','WMS','Excel']]),
      languages: [{ name: 'Polski', level: 'NATIVE' }, { name: 'Angielski', level: rnd(['B1','B2','C1']) }],
      position: role.name, positionCode: role.key.toUpperCase(),
      workSchedule: rnd(['FULL_TIME','FULL_TIME','PART_TIME']),
      hoursPerWeek: 40, vacationDaysPerYear: 26,
      createdAt: ts(hireDate),
    });
  }

  for (let i = 0; i < 20; i++) {
    const start = rndInt(10, 400);
    const days = rndInt(1, 20);
    const ref = doc(collection(db, 'leaves'));
    batch.set(ref, {
      tenantId, employeeId: rnd(empIds),
      type: rnd(['ANNUAL','ANNUAL','SICK','UNPAID','MATERNITY']),
      status: rnd(['APPROVED','APPROVED','PENDING','REJECTED']),
      startDate: dateStr(start), endDate: dateStr(Math.max(1, start - days)), days,
      reason: rnd(['Urlop wypoczynkowy','Choroba','Opieka nad dzieckiem','Inne']),
      approvedBy: rnd(empIds), createdAt: ts(start + 2),
    });
  }

  const candidates = Array.from({ length: 12 }, (_, i) => {
    const fn = rnd([...FM,...FF]); const ln = rnd(LN);
    return {
      id: `cand_${i}`, name: `${fn} ${ln}`, email: `${fn.toLowerCase()}@rekrutacja.pl`,
      phone: `+48 ${rndInt(600000000,699999999)}`,
      status: rnd(['Nowy','Screening','Rozmowa HR','Rozmowa Tech','Oferta','Zatrudniony','Odrzucony']),
      appliedFor: rnd(['Senior React Developer','Marketing Manager','HR Business Partner','Inżynier Produkcji']),
      source: rnd(['Pracuj.pl','LinkedIn','Polecenie','Adecco','Indeed']),
      score: rndInt(40,100), appliedAt: dateStr(rndInt(10,200)),
      notes: 'Kandydat spełnia wymagania stanowiska.',
    };
  });
  batch.set(doc(db, 'hrSettings', `${tenantId}_candidates`), { list: candidates, updatedAt: ts(0) }, { merge: true });
  batch.set(doc(db, 'hrSettings', `${tenantId}_recruitments`), {
    openPositions: [
      { id:'req_1', title:'Senior React Developer', department: deptRefs['it'].id, status:'Otwarta', spots:2 },
      { id:'req_2', title:'Marketing Manager', department: deptRefs['sales'].id, status:'Otwarta', spots:1 },
      { id:'req_3', title:'HR Business Partner', department: deptRefs['hr'].id, status:'Procesowanie', spots:1 },
      { id:'req_4', title:'Inżynier Produkcji', department: deptRefs['prod'].id, status:'Otwarta', spots:3 },
    ],
    updatedAt: ts(0),
  }, { merge: true });

  await batch.commit();
  log(`HR: ${DEPTS.length} działów, ${ROLES.length} stanowisk, 35 pracowników, 20 urlopów`);
  return { depts: DEPTS.length, roles: ROLES.length, employees: 35 };
};

// ── CRM ───────────────────────────────────────────────────────────────────────
export const generateCrmIdesV2 = async (tenantId: string, log: LogFn) => {
  const batch = writeBatch(db);
  const COMPANIES = [
    'Budmax Sp. z o.o.','Agro-Tech S.A.','NetSoft Sp. z o.o.','Eco-Build Sp. z o.o.',
    'FinPro S.A.','LogiTrans Sp. z o.o.','MedPlus Sp. z o.o.','RetailGroup S.A.',
    'TechServices Sp. z o.o.','GreenEnergy S.A.','PolBau Sp. z o.o.','DataCorp Sp. z o.o.',
  ];
  const INDUSTRIES = ['IT','Budownictwo','Handel','Logistyka','Produkcja','Energetyka','Medycyna'];
  const custIds: string[] = [];
  for (const name of COMPANIES) {
    const ref = doc(collection(db, 'customers'));
    custIds.push(ref.id);
    batch.set(ref, {
      tenantId, customerType: 'B2B', name, nip: nip(), regon: String(rndInt(100000000, 999999999)),
      krs: String(rndInt(1000000000, 9999999999)),
      email: `biuro@${name.split(' ')[0].toLowerCase()}.pl`,
      phone: `+48 ${rndInt(220000000, 229999999)}`,
      city: rnd(CITIES), address: `${rnd(STREETS)} ${rndInt(1,50)}`, zipCode: `${rndInt(10,99)}-${rndInt(100,999)}`, country: 'PL',
      industry: rnd(INDUSTRIES), status: rnd(['ACTIVE','ACTIVE','POTENTIAL','VIP','INACTIVE']),
      contactPerson: `${rnd(FM)} ${rnd(LN)}`, website: `www.${name.split(' ')[0].toLowerCase()}.pl`,
      notes: 'Klient strategiczny – priorytet kontaktu Q1.',
      tags: [rnd(INDUSTRIES),'partner'],
      assignedTo: `handlowiec${rndInt(1,5)}@firma.pl`,
      monthlyRevenue: rndInt(5000, 100000), totalRevenue: rndInt(50000, 1500000),
      customerSince: dateStr(rndInt(200, 500)),
      createdAt: ts(rndInt(200, 500)), updatedAt: ts(rndInt(1, 30)),
    });
  }

  for (let i = 0; i < 25; i++) {
    const fn = Math.random() > 0.4 ? rnd(FM) : rnd(FF); const ln = rnd(LN);
    const ref = doc(collection(db, 'crm_contacts'));
    batch.set(ref, {
      tenantId, clientId: rnd(custIds), fullName: `${fn} ${ln}`, firstName: fn, lastName: ln,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@klient.pl`,
      phone: `+48 ${rndInt(500000000, 599999999)}`, mobile: `+48 ${rndInt(600000000, 699999999)}`,
      role: rnd(['Dyrektor','Kierownik','Specjalista','Handlowiec','CEO','CFO']),
      position: rnd(['Manager','Director','Specialist','Owner']),
      isPrimary: i % 5 === 0, linkedinUrl: `https://linkedin.com/in/${fn.toLowerCase()}-${ln.toLowerCase()}`,
      notes: 'Kontakt operacyjny – decyzyjny w sprawach zakupu.',
      lastContactDate: dateStr(rndInt(1, 60)), createdAt: ts(rndInt(60, 400)),
    });
  }

  const STAGES = ['Kwalifikacja','Analiza potrzeb','Oferta','Negocjacje','Zamknięcie'];
  const SOURCES = ['Targi','LinkedIn','Polecenie','Cold call','Strona WWW','Partner'];
  const dealIds: string[] = [];
  for (let i = 0; i < 15; i++) {
    const ref = doc(collection(db, 'crm_deals'));
    dealIds.push(ref.id);
    const net = rndInt(10, 300) * 1000;
    batch.set(ref, {
      tenantId, title: `Szansa sprzedaży #${i + 1}`, clientId: rnd(custIds),
      stage: rnd(STAGES), value: net, currency: 'PLN',
      probability: rnd([20,40,60,80,90]),
      source: rnd(SOURCES), owner: `${rnd(FM)} ${rnd(LN)}`,
      description: 'Perspektywiczna szansa — klient zainteresowany wdrożeniem systemu ERP.',
      expectedClose: futureDateStr(rndInt(10, 90)),
      products: [{ name: rnd(['Wdrożenie ERP','Licencja SaaS','Konsulting','Szkolenie']), qty: rndInt(1,5), unitPrice: net }],
      activitiesCount: rndInt(3, 20),
      createdAt: ts(rndInt(30, 300)), updatedAt: ts(rndInt(1, 29)),
    });
  }

  // CRM Activities in subcollection
  for (let i = 0; i < 20; i++) {
    const ref = doc(collection(db, `tenants/${tenantId}/crmActivities`));
    batch.set(ref, {
      tenantId, customerId: rnd(custIds), dealId: dealIds.length ? rnd(dealIds) : null,
      type: rnd(['CALL','EMAIL','MEETING','DEMO','FOLLOW_UP']),
      title: rnd(['Rozmowa telefoniczna','Prezentacja produktu','Demo systemu','Spotkanie handlowe','Follow-up e-mail']),
      body: 'Omówiono warunki współpracy, klient prosi o szczegółową ofertę.',
      outcome: rnd(['POSITIVE','NEUTRAL','NEGATIVE','NO_ANSWER']),
      createdBy: `${rnd(FM)} ${rnd(LN)}`, createdAt: ts(rndInt(1, 200)),
    });
  }

  // NPS
  for (let i = 0; i < 8; i++) {
    const ref = doc(collection(db, `tenants/${tenantId}/npsResponses`));
    batch.set(ref, {
      tenantId, customerId: rnd(custIds), score: rndInt(6, 10),
      comment: rnd(['Świetna obsługa','Polecam!','Szybka realizacja','Dobry kontakt z handlowcem']),
      createdAt: ts(rndInt(10, 180)),
    });
  }

  await batch.commit();
  log(`CRM: ${COMPANIES.length} klientów, 25 kontaktów, 15 szans, 20 aktywności`);
  return { customers: COMPANIES.length, contacts: 25, deals: 15 };
};

// ── Projects ──────────────────────────────────────────────────────────────────
export const generateProjectsIdesV2 = async (tenantId: string, log: LogFn) => {
  const batch = writeBatch(db);
  const PROJECTS = [
    { name:'Wdrożenie systemu ERP', code:'ERP-2025', budget:450000, status:'ACTIVE' },
    { name:'Budowa platformy e-commerce', code:'ECOM-2025', budget:280000, status:'ACTIVE' },
    { name:'Migracja do chmury Azure', code:'CLOUD-2025', budget:180000, status:'COMPLETED' },
    { name:'Audyt bezpieczeństwa IT', code:'SEC-2025', budget:60000, status:'COMPLETED' },
    { name:'Modernizacja hali produkcyjnej', code:'PROD-2026', budget:750000, status:'PLANNING' },
    { name:'Portal klienta B2B', code:'PORTAL-2026', budget:120000, status:'ACTIVE' },
    { name:'Program lojalnościowy', code:'LOYAL-2026', budget:90000, status:'ON_HOLD' },
  ];
  const TASK_NAMES = ['Analiza wymagań','Projektowanie architektury','Implementacja modułu','Testy integracyjne','Wdrożenie produkcyjne','Dokumentacja','Szkolenie użytkowników','Konfiguracja środowiska','Code review','Prezentacja dla klienta'];

  const projIds: string[] = [];
  for (const p of PROJECTS) {
    const ref = doc(collection(db, 'projects'));
    projIds.push(ref.id);
    const start = rndInt(100, 420);
    batch.set(ref, {
      tenantId, name: p.name, code: p.code, description: `Projekt ${p.name} — cel: wzrost efektywności operacyjnej o 30%.`,
      status: p.status, clientId: null,
      startDate: dateStr(start), endDate: futureDateStr(rndInt(30, 200)),
      budget: p.budget, currency: 'PLN', actualCost: Math.round(p.budget * rndInt(20, 80) / 100),
      managerId: `mgr_${rndInt(1,5)}`, managerName: `${rnd(FM)} ${rnd(LN)}`,
      teamSize: rndInt(3, 12), mpk: `MPK-${rndInt(100,999)}`, costCenter: `CC-${rndInt(100,999)}`,
      progress: p.status === 'COMPLETED' ? 100 : rndInt(10, 90),
      tags: ['wewnętrzny', rnd(['IT','HR','Finanse','Produkcja'])],
      priority: rnd(['MEDIUM','HIGH','CRITICAL']),
      createdAt: ts(start + 5), updatedAt: ts(rndInt(1, 30)),
    });

    for (let i = 0; i < 6; i++) {
      const tRef = doc(collection(db, 'tasks'));
      const status = rnd(['TODO','IN_PROGRESS','REVIEW','DONE']);
      batch.set(tRef, {
        tenantId, projectId: ref.id, title: rnd(TASK_NAMES),
        description: 'Zadanie realizowane zgodnie z harmonogramem projektu.',
        status, priority: rnd(['LOW','MEDIUM','HIGH']),
        assignee: `${rnd(FM)} ${rnd(LN)}`, assigneeId: `emp_${rndInt(1,35)}`,
        estimatedHours: rndInt(4, 80), actualHours: rndInt(2, 60),
        startDate: dateStr(rndInt(50, 300)), dueDate: futureDateStr(rndInt(1, 60)),
        completedDate: status === 'DONE' ? dateStr(rndInt(1, 50)) : null,
        tags: [rnd(['backend','frontend','design','testing'])],
        commentsCount: rndInt(0, 15), attachmentsCount: rndInt(0, 5),
        createdAt: ts(rndInt(50, 300)), updatedAt: ts(rndInt(1, 20)),
      });
    }
  }

  // Cost Centers
  for (let i = 0; i < 5; i++) {
    const ref = doc(collection(db, 'costCenters'));
    batch.set(ref, {
      tenantId, code: `CC-${100 + i}`, name: rnd(['IT','Sprzedaż','Produkcja','HR','Finanse']),
      budget: rndInt(100,500) * 1000, currency: 'PLN', managerId: `emp_${rndInt(1,35)}`,
      createdAt: ts(rndInt(300, 450)),
    });
  }

  await batch.commit();
  log(`Projects: ${PROJECTS.length} projektów, ${PROJECTS.length * 6} zadań, 5 MPK`);
  return { projects: PROJECTS.length, tasks: PROJECTS.length * 6 };
};

// ── Finance ───────────────────────────────────────────────────────────────────
export const generateFinanceIdesV2 = async (tenantId: string, log: LogFn) => {
  const batch = writeBatch(db);
  const CLIENTS = ['Budmax Sp. z o.o.','Agro-Tech S.A.','NetSoft Sp. z o.o.','Eco-Build Sp. z o.o.','FinPro S.A.'];
  const ITEMS = [
    { name:'Usługi konsultingowe', price:5000 },
    { name:'Licencja oprogramowania', price:12000 },
    { name:'Wdrożenie systemu', price:30000 },
    { name:'Szkolenie pracowników', price:3500 },
    { name:'Serwis miesięczny', price:2500 },
    { name:'Hosting i utrzymanie', price:1800 },
    { name:'Audyt IT', price:8000 },
  ];
  const PAYMENT_METHODS = ['Przelew','Karta','Gotówka','BLIK'];

  for (let i = 0; i < 16; i++) {
    const item = rnd(ITEMS);
    const qty = rndInt(1, 5);
    const net = (item.price + rndInt(0, item.price * 0.5)) * qty;
    const vatAmt = Math.round(net * 0.23);
    const issueBack = rndInt(10, 420);
    const status = issueBack > 60 ? 'PAID' : rnd(['PAID','PENDING','OVERDUE']);
    const ref = doc(collection(db, 'invoices'));
    batch.set(ref, {
      tenantId,
      number: `FV/${2025 + Math.floor(issueBack / 365)}/${String(i + 1).padStart(3,'0')}`,
      client: rnd(CLIENTS), clientId: `cust_placeholder_${i}`,
      status, documentType: rnd(['INVOICE','INVOICE','INVOICE','PROFORMA']),
      netAmount: net, vatRate: 23, vatAmount: vatAmt, grossAmount: net + vatAmt, currency: 'PLN',
      issueDate: dateStr(issueBack), dueDate: dateStr(issueBack - 14),
      paymentDate: status === 'PAID' ? dateStr(rndInt(1, issueBack - 1)) : null,
      paymentMethod: rnd(PAYMENT_METHODS),
      bankAccount: bankAccount(),
      notes: 'Faktura wystawiona zgodnie z umową nr ' + rndInt(100, 999) + '/2025.',
      items: [{ name: item.name, qty, unitPrice: item.price, vatRate: 23, netValue: net, grossValue: net + vatAmt }],
      createdAt: ts(issueBack),
    });
  }

  const EXP_CATS = ['Transport','Komunikacja','Biuro','Marketing','Szkolenia','Gastronomia'];
  for (let i = 0; i < 12; i++) {
    const net = rndInt(50, 2000);
    const vatAmt = Math.round(net * 0.23);
    const back = rndInt(5, 420);
    const ref = doc(collection(db, 'expenses'));
    batch.set(ref, {
      tenantId,
      title: rnd(['Paliwo','Telefon służbowy','Internet','Materiały biurowe','Podróż służbowa','Catering','Szkolenie zewnętrzne','Taxi','Parking']),
      amount: net + vatAmt, currency: 'PLN', category: rnd(EXP_CATS),
      netAmount: net, vatAmount: vatAmt, vatRate: 23,
      date: dateStr(back), status: rnd(['ACCEPTED','ACCEPTED','PENDING','REJECTED']),
      employeeId: `emp_${rndInt(1,35)}`, projectId: null,
      receiptNumber: `PAR/${String(rndInt(1000,9999))}`,
      notes: 'Wydatek służbowy — delegacja + zakwaterowanie.',
      approvedBy: `${rnd(FM)} ${rnd(LN)}`, paymentMethod: rnd(PAYMENT_METHODS),
      createdAt: ts(back),
    });
  }

  await batch.commit();
  log(`Finance: 16 faktur, 12 wydatków`);
  return { invoices: 16, expenses: 12 };
};

// ── Time Tracking ─────────────────────────────────────────────────────────────
export const generateTimeTrackingIdes = async (tenantId: string, log: LogFn) => {
  const batch = writeBatch(db);
  for (let i = 0; i < 80; i++) {
    const back = rndInt(1, 430);
    const startHour = rndInt(7, 16);
    const duration = rndInt(30, 480);
    const startMs = Date.now() - back * 86400000 + startHour * 3600000;
    const ref = doc(collection(db, 'timeEntries'));
    batch.set(ref, {
      tenantId, employeeId: `emp_${rndInt(1,35)}`,
      projectId: rnd([null, `proj_${rndInt(1,7)}`]),
      taskId: rnd([null, `task_${rndInt(1,42)}`]),
      startTime: Timestamp.fromDate(new Date(startMs)),
      endTime: Timestamp.fromDate(new Date(startMs + duration * 60000)),
      duration,
      description: rnd(['Praca nad zadaniem projektowym','Spotkanie z klientem','Code review','Analiza wymagań','Testowanie funkcjonalności','Dokumentacja']),
      status: rnd(['APPROVED','APPROVED','PENDING']),
      billable: Math.random() > 0.3, hourlyRate: rndInt(50, 200),
      createdAt: ts(back), updatedAt: ts(back),
    });
  }
  await batch.commit();
  log('TimeTracking: 80 wpisów czasu pracy (14+ miesięcy historii)');
  return { entries: 80 };
};

// ── Audit Logs ────────────────────────────────────────────────────────────────
export const generateAuditLogsIdes = async (tenantId: string, log: LogFn) => {
  const batch = writeBatch(db);
  const ACTIONS = ['CREATE','UPDATE','DELETE','VIEW','APPROVE','REJECT'];
  const COLLECTIONS = ['employees','invoices','crm_deals','projects','leaves','expenses','customers'];
  const USERS = Array.from({length:5}, (_, i) => `user_${i+1}@firma.pl`);
  for (let i = 0; i < 50; i++) {
    const ref = doc(collection(db, 'auditLogs'));
    const action = rnd(ACTIONS);
    batch.set(ref, {
      tenantId, collection: rnd(COLLECTIONS), entityId: `doc_${rndInt(1000,9999)}`,
      action, userId: `uid_${rndInt(1,5)}`, userEmail: rnd(USERS),
      changes: action === 'UPDATE' ? { status: { from: 'PENDING', to: 'APPROVED' } } : {},
      previousValues: action === 'UPDATE' ? { status: 'PENDING' } : {},
      ipAddress: `192.168.${rndInt(1,254)}.${rndInt(1,254)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124',
      createdAt: ts(rndInt(1, 430)),
    });
  }
  await batch.commit();
  log('AuditLogs: 50 wpisów audytowych (14+ miesięcy historii)');
  return { logs: 50 };
};

// ── Orchestrator ──────────────────────────────────────────────────────────────
export type IdesModule = 'hr' | 'crm' | 'projects' | 'finance' | 'timeTracking' | 'auditLogs';

export const generateAllModulesV2 = async (
  tenantId: string,
  modules: IdesModule[],
  log: LogFn,
): Promise<Record<string, number>> => {
  const results: Record<string, number> = {};
  if (modules.includes('hr')) { const r = await generateHrIdesV2(tenantId, log); Object.assign(results, r); }
  if (modules.includes('crm')) { const r = await generateCrmIdesV2(tenantId, log); Object.assign(results, r); }
  if (modules.includes('projects')) { const r = await generateProjectsIdesV2(tenantId, log); Object.assign(results, r); }
  if (modules.includes('finance')) { const r = await generateFinanceIdesV2(tenantId, log); Object.assign(results, r); }
  if (modules.includes('timeTracking')) { const r = await generateTimeTrackingIdes(tenantId, log); Object.assign(results, r); }
  if (modules.includes('auditLogs')) { const r = await generateAuditLogsIdes(tenantId, log); Object.assign(results, r); }
  return results;
};
