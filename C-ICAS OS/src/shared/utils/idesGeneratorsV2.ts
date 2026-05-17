import { collection, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { generateProjectsIdesV2, generateFinanceIdesV2, generateInventoryIdes } from './idesGeneratorsV2b';
import { generateTimeTrackingIdes, generateAuditLogsIdes, generateFieldServiceIdes } from './idesGeneratorsV2c';
import {
  rnd, rndInt, ts, dateStr, futureDateStr, pesel, nip, bankAccount,
  FM, FF, LN, CITIES, STREETS, BatchWriter, type LogFn,
} from './idesHelpers';

export type { LogFn } from './idesHelpers';

// ── HR ────────────────────────────────────────────────────────────────────────
export const generateHrIdesV2 = async (tenantId: string, log: LogFn) => {
  const bw = new BatchWriter();

  const DEPTS = [
    { key:'board',    name:'Zarząd',                    type:'BOARD',   parent:null     },
    { key:'hr',       name:'Zasoby Ludzkie',             type:'SUPPORT', parent:'board'  },
    { key:'it',       name:'Dział IT',                   type:'CORE',   parent:'board'  },
    { key:'sales',    name:'Sprzedaż i Marketing',       type:'CORE',   parent:'board'  },
    { key:'finance',  name:'Finanse i Controlling',      type:'SUPPORT', parent:'board'  },
    { key:'prod',     name:'Produkcja',                  type:'CORE',   parent:'board'  },
    { key:'logistics',name:'Logistyka',                  type:'CORE',   parent:'board'  },
    { key:'purchase', name:'Zakupy',                     type:'SUPPORT', parent:'board'  },
    { key:'support',  name:'Obsługa Klienta',            type:'SUPPORT', parent:'board'  },
    { key:'rnd',      name:'Badania i Rozwój',           type:'CORE',   parent:'board'  },
  ];
  const deptRefs: Record<string, ReturnType<typeof doc>> = {};
  for (const d of DEPTS) deptRefs[d.key] = doc(collection(db, 'hr_departments'));
  for (const d of DEPTS) {
    bw.set(deptRefs[d.key], {
      tenantId, name: d.name, type: d.type, isBoard: d.key === 'board',
      parentId: d.parent ? deptRefs[d.parent].id : null,
      headCount: rndInt(3,18), costCenter: `CC-${rndInt(100,999)}`,
      budget: rndInt(100,800) * 1000, budgetCurrency: 'PLN',
      createdAt: ts(rndInt(420,450)), updatedAt: ts(rndInt(1,30)),
    });
  }

  const ROLES = [
    { key:'ceo',    name:'CEO',                         dept:'board',    mgr:true,  grade:'C',      salary:25000 },
    { key:'cfo',    name:'CFO',                         dept:'finance',  mgr:true,  grade:'C',      salary:20000 },
    { key:'hrdir',  name:'Dyrektor HR',                 dept:'hr',       mgr:true,  grade:'SENIOR', salary:15000 },
    { key:'hrspe',  name:'Specjalista ds. Kadr i Płac', dept:'hr',       mgr:false, grade:'MID',    salary:7000  },
    { key:'hrrec',  name:'Specjalista ds. Rekrutacji',  dept:'hr',       mgr:false, grade:'MID',    salary:7500  },
    { key:'itdir',  name:'Dyrektor IT',                 dept:'it',       mgr:true,  grade:'SENIOR', salary:18000 },
    { key:'itsen',  name:'Senior Developer',            dept:'it',       mgr:false, grade:'SENIOR', salary:14000 },
    { key:'itmid',  name:'Mid Developer',               dept:'it',       mgr:false, grade:'MID',    salary:10000 },
    { key:'itjun',  name:'Junior Developer',            dept:'it',       mgr:false, grade:'JUNIOR', salary:6500  },
    { key:'itsup',  name:'IT Support Specialist',       dept:'it',       mgr:false, grade:'MID',    salary:6000  },
    { key:'saldi',  name:'Dyrektor Sprzedaży',          dept:'sales',    mgr:true,  grade:'SENIOR', salary:16000 },
    { key:'salre',  name:'Przedstawiciel Handlowy',     dept:'sales',    mgr:false, grade:'MID',    salary:8000  },
    { key:'mktsp',  name:'Specjalista ds. Marketingu',  dept:'sales',    mgr:false, grade:'MID',    salary:7500  },
    { key:'finco',  name:'Kontroler Finansowy',         dept:'finance',  mgr:false, grade:'SENIOR', salary:9000  },
    { key:'finbk',  name:'Główny Księgowy',             dept:'finance',  mgr:true,  grade:'SENIOR', salary:12000 },
    { key:'prodi',  name:'Kierownik Produkcji',         dept:'prod',     mgr:true,  grade:'SENIOR', salary:12000 },
    { key:'prodw',  name:'Pracownik Produkcji',         dept:'prod',     mgr:false, grade:'JUNIOR', salary:5500  },
    { key:'logco',  name:'Koordynator Logistyki',       dept:'logistics',mgr:true,  grade:'MID',    salary:9000  },
    { key:'logdr',  name:'Kierowca/Magazynier',         dept:'logistics',mgr:false, grade:'JUNIOR', salary:5000  },
    { key:'pursp',  name:'Specjalista ds. Zakupów',     dept:'purchase', mgr:false, grade:'MID',    salary:7000  },
    { key:'cusag',  name:'Agent Obsługi Klienta',       dept:'support',  mgr:false, grade:'JUNIOR', salary:5500  },
    { key:'rnden',  name:'Inżynier R&D',                dept:'rnd',      mgr:false, grade:'SENIOR', salary:13000 },
  ];
  const roleRefs: Record<string, ReturnType<typeof doc>> = {};
  for (const r of ROLES) roleRefs[r.key] = doc(collection(db, 'hr_roles'));
  for (const r of ROLES) {
    bw.set(roleRefs[r.key], {
      tenantId, name: r.name, departmentId: deptRefs[r.dept].id,
      isManager: r.mgr, grade: r.grade, baseSalary: r.salary,
      jobFamily: r.dept.toUpperCase(), headcountAllowed: rndInt(1,10),
      createdAt: ts(rndInt(400,440)), updatedAt: ts(rndInt(1,30)),
    });
  }

  const TERM_REASONS = ['Rozwiązanie za porozumieniem stron','Koniec umowy na czas określony','Zwolnienie dyscyplinarne','Rezygnacja pracownika','Likwidacja stanowiska'];
  const empIds: string[] = [];

  for (let i = 0; i < 80; i++) {
    const gender = Math.random() > 0.45 ? 'M' : 'F';
    const firstName = gender === 'M' ? rnd(FM) : rnd(FF);
    const lastName = rnd(LN);
    const role = ROLES[i % ROLES.length];
    const ref = doc(collection(db, 'employees'));
    empIds.push(ref.id);

    let status: string, hireBack: number, extra: Record<string, unknown> = {};
    if (i >= 70) {
      status = 'ACTIVE'; hireBack = rndInt(1,30);
      extra = { onboardingStatus: 'IN_PROGRESS', onboardingStartDate: dateStr(hireBack), onboardingCompletionTarget: futureDateStr(rndInt(30,90)) };
    } else if (i >= 58) {
      const termBack = rndInt(30,300); hireBack = rndInt(termBack + 90,450); status = 'TERMINATED';
      extra = { terminationDate: dateStr(termBack), terminationReason: rnd(TERM_REASONS), terminationNoticePeriod: rnd([14,30,90]),
        contractEndDate: dateStr(termBack), offboardingCompleted: true, accessRevokedAt: dateStr(termBack - 1) };
    } else if (i >= 50) {
      hireBack = rndInt(90,430); status = 'ON_LEAVE';
      extra = { leaveType: rnd(['MATERNITY','SICK','UNPAID','PARENTAL','CARETAKER']),
        leaveStartDate: dateStr(rndInt(10,90)), leaveEndDate: futureDateStr(rndInt(10,180)),
        leaveApprovedBy: `${rnd(FM)} ${rnd(LN)}`, onboardingStatus: 'COMPLETED' };
    } else {
      hireBack = rndInt(60,430); status = 'ACTIVE'; extra = { onboardingStatus: 'COMPLETED' };
    }

    bw.set(ref, {
      tenantId, firstName, lastName, middleName: rnd(FM),
      employeeNumber: `EMP-${String(1000 + i).padStart(4,'0')}`,
      employeeType: rnd(['EMPLOYEE','EMPLOYEE','EMPLOYEE','CONTRACTOR']),
      gender, pesel: pesel(), nip: nip(),
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@firma.local`,
      personalEmail: `${firstName.toLowerCase()}${rndInt(10,99)}@gmail.com`,
      phone: `+48 ${rndInt(500000000,599999999)}`, mobile: `+48 ${rndInt(600000000,699999999)}`,
      birthDate: dateStr(rndInt(9000,16000)), birthPlace: rnd(CITIES),
      nationality: 'Polska', citizenship: 'PL',
      street: `${rnd(STREETS)} ${rndInt(1,120)}`, city: rnd(CITIES),
      postalCode: `${rndInt(10,99)}-${rndInt(100,999)}`, country: 'PL',
      contractType: rnd(['UOP','UOP','UOP','UZ','B2B']),
      contractStartDate: dateStr(hireBack),
      contractEndDate: status === 'TERMINATED' ? (extra.contractEndDate ?? null) : null,
      status,
      baseSalary: role.salary + rndInt(-1000,3000), salaryType: 'GROSS', currency: 'PLN',
      vatType: rnd(['ZWOLNIONY','VAT23']),
      bankAccount: bankAccount(), bankName: rnd(['PKO BP','ING','Santander','mBank','Alior Bank']),
      departmentId: deptRefs[role.dept].id, departmentName: DEPTS.find(d => d.key === role.dept)?.name ?? '',
      roleId: roleRefs[role.key].id, role: role.name, position: role.name,
      positionCode: role.key.toUpperCase(), grade: role.grade, isManager: role.mgr,
      reportsTo: i > 0 ? empIds[rndInt(0, Math.min(i-1,5))] : null,
      taxRelief: 300, kup: 250, fgsp: true, fp: true, pitExempt: false,
      ohsTraining: { date: dateStr(rndInt(30,365)), expiryDate: futureDateStr(rndInt(180,730)), type: 'Podstawowe', passed: true },
      medicalExam: { date: dateStr(rndInt(30,365)), expiryDate: futureDateStr(rndInt(180,365)), type: 'Wstępne', valid: true },
      skills: rnd([['React','Node.js','SQL'],['Excel','SAP','Analiza'],['Sprzedaż','CRM','Negocjacje'],['Logistyka','WMS','Excel'],['Python','ML','BigQuery'],['FICO','CO','MM']]),
      languages: [{ name: 'Polski', level: 'NATIVE' }, { name: 'Angielski', level: rnd(['A2','B1','B2','C1']) }],
      workSchedule: rnd(['FULL_TIME','FULL_TIME','PART_TIME']),
      hoursPerWeek: 40, vacationDaysPerYear: 26, vacationDaysUsed: rndInt(0,20),
      absenceDaysThisYear: rndInt(0,10), costCenter: `CC-${rndInt(100,999)}`, mpk: `MPK-${rndInt(100,999)}`,
      emergencyContact: { name: `${rnd(FM)} ${rnd(LN)}`, phone: `+48 ${rndInt(600000000,699999999)}`, relation: rnd(['Małżonek','Rodzic','Rodzeństwo']) },
      ...extra,
      createdAt: ts(hireBack), updatedAt: ts(rndInt(1,30)),
    });
    await bw.maybeFlush();
  }

  for (let i = 0; i < 30; i++) {
    const start = rndInt(10,400), days = rndInt(1,25);
    bw.set(doc(collection(db, 'leaves')), {
      tenantId, employeeId: rnd(empIds),
      type: rnd(['ANNUAL','ANNUAL','SICK','SICK','UNPAID','MATERNITY','PARENTAL','CARETAKER']),
      status: rnd(['APPROVED','APPROVED','APPROVED','PENDING','REJECTED']),
      startDate: dateStr(start), endDate: dateStr(Math.max(1, start - days)), days,
      reason: rnd(['Urlop wypoczynkowy','Choroba','Opieka nad dzieckiem','Urlop na żądanie','Siła wyższa']),
      approvedBy: rnd(empIds), requestedAt: ts(start + 5), createdAt: ts(start + 2), updatedAt: ts(rndInt(1,30)),
    });
  }
  await bw.maybeFlush();

  for (let i = 0; i < 40; i++) {
    const back = rndInt(30,420);
    bw.set(doc(collection(db, 'salaryHistory')), {
      tenantId, employeeId: rnd(empIds),
      previousSalary: rndInt(5000,18000), newSalary: rndInt(5500,20000),
      changeType: rnd(['RAISE','PROMOTION','CORRECTION','ANNUAL_REVIEW']),
      effectiveDate: dateStr(back), reason: rnd(['Awans','Ocena roczna','Korekta','Podwyżka inflacyjna']),
      approvedBy: rnd(empIds), createdAt: ts(back),
    });
  }
  await bw.maybeFlush();

  for (let m = 0; m < 3; m++) {
    const mb = m * 30 + 15;
    for (let i = 0; i < 20; i++) {
      bw.set(doc(collection(db, 'payroll')), {
        tenantId, employeeId: rnd(empIds), period: dateStr(mb).slice(0,7),
        grossSalary: rndInt(5000,20000), netSalary: rndInt(3500,14000),
        zus: rndInt(600,2500), pit: rndInt(300,2000), ppk: rndInt(50,400),
        deductions: rndInt(0,500), bonuses: rndInt(0,3000),
        paymentDate: dateStr(mb - 5), status: 'PAID', bankAccount: bankAccount(), createdAt: ts(mb),
      });
    }
    await bw.maybeFlush();
  }

  bw.setM(doc(db, 'hrSettings', `${tenantId}_candidates`), {
    list: Array.from({length: 20}, (_, i) => {
      const fn = rnd([...FM,...FF]), ln = rnd(LN);
      return { id: `cand_${i}`, name: `${fn} ${ln}`, email: `${fn.toLowerCase()}${i}@rekrutacja.pl`,
        phone: `+48 ${rndInt(600000000,699999999)}`,
        status: rnd(['Nowy','Screening','Rozmowa HR','Rozmowa Tech','Oferta','Zatrudniony','Odrzucony']),
        appliedFor: rnd(['Senior React Developer','Marketing Manager','HR Business Partner','Inżynier Produkcji','Data Analyst']),
        source: rnd(['Pracuj.pl','LinkedIn','Polecenie','Adecco','Indeed','NoFluffJobs']),
        score: rndInt(40,100), appliedAt: dateStr(rndInt(5,200)),
        cv: 'cv_placeholder.pdf', notes: 'Kandydat spełnia wymagania stanowiska.' };
    }),
    updatedAt: ts(0),
  });

  const total = await bw.commit();
  log(`HR: ${DEPTS.length} działów, ${ROLES.length} stanowisk, 80 pracowników (12 zwolnionych, 10 nowo zatrudnionych, 8 na urlopie), 30 urlopów, 40 historii wynagrodzeń, 60 lista płac, 20 kandydatów [${total} docs]`);
  return { depts: DEPTS.length, roles: ROLES.length, employees: 80, leaves: 30 };
};

// ── CRM ───────────────────────────────────────────────────────────────────────
export const generateCrmIdesV2 = async (tenantId: string, log: LogFn) => {
  const bw = new BatchWriter();

  const NAMES = [
    'Budmax Sp. z o.o.','Agro-Tech S.A.','NetSoft Sp. z o.o.','Eco-Build Sp. z o.o.',
    'FinPro S.A.','LogiTrans Sp. z o.o.','MedPlus Sp. z o.o.','RetailGroup S.A.',
    'TechServices Sp. z o.o.','GreenEnergy S.A.','PolBau Sp. z o.o.','DataCorp Sp. z o.o.',
    'AutoParts Sp. z o.o.','FoodTech S.A.','PrintShop Sp. z o.o.','HealthCare Sp. z o.o.',
    'Urban Design Sp. z o.o.','MetalWork S.A.','CleanPro Sp. z o.o.','SafeGuard S.A.',
    'SkyTech Sp. z o.o.','MarketX Sp. z o.o.','ProBuild S.A.','DigiFlow Sp. z o.o.',
    'ColdChain Sp. z o.o.','BioLab S.A.','FleetPro Sp. z o.o.','EduSoft Sp. z o.o.',
    'ArchVision Sp. z o.o.','NovaMed S.A.','PowerGrid Sp. z o.o.','GlobalTrade S.A.',
    'InnoLab Sp. z o.o.','CityPark Sp. z o.o.','AeroTech S.A.','WoodWorks Sp. z o.o.',
    'ChemPlast S.A.','ReliaTel Sp. z o.o.','AquaPure S.A.','SmartHome Sp. z o.o.',
  ];
  const IND = ['IT','Budownictwo','Handel','Logistyka','Produkcja','Energetyka','Medycyna','FMCG','Automotive','Edukacja'];
  const SEG = ['ENTERPRISE','MID_MARKET','SMB','STARTUP'];

  const custIds: string[] = [];
  for (let i = 0; i < NAMES.length; i++) {
    const ref = doc(collection(db, 'customers'));
    custIds.push(ref.id);
    const back = rndInt(30,500);
    bw.set(ref, {
      tenantId, customerType: 'B2B', name: NAMES[i], nip: nip(),
      regon: String(rndInt(100000000,999999999)), krs: String(rndInt(1000000000,9999999999)),
      email: `biuro@${NAMES[i].split(' ')[0].toLowerCase()}.pl`,
      phone: `+48 ${rndInt(220000000,229999999)}`, mobile: `+48 ${rndInt(600000000,699999999)}`,
      city: rnd(CITIES), address: `${rnd(STREETS)} ${rndInt(1,50)}`,
      zipCode: `${rndInt(10,99)}-${rndInt(100,999)}`, country: 'PL',
      industry: rnd(IND), segment: rnd(SEG),
      status: rnd(['ACTIVE','ACTIVE','ACTIVE','POTENTIAL','VIP','INACTIVE']),
      contactPerson: `${rnd(FM)} ${rnd(LN)}`, contactEmail: `kontakt@${NAMES[i].split(' ')[0].toLowerCase()}.pl`,
      website: `www.${NAMES[i].split(' ')[0].toLowerCase()}.pl`,
      notes: 'Klient strategiczny – priorytet kontaktu Q1.',
      tags: [rnd(IND), rnd(SEG).toLowerCase()],
      assignedTo: `handlowiec${rndInt(1,5)}@firma.pl`, assignedToId: `emp_${rndInt(1,80)}`,
      monthlyRevenue: rndInt(5000,150000), totalRevenue: rndInt(50000,3000000),
      creditLimit: rndInt(10000,200000), paymentTermDays: rnd([14,30,60,90]),
      customerSince: dateStr(back), lastOrderDate: dateStr(rndInt(5,90)),
      npsScore: rndInt(6,10), satisfactionLevel: rnd(['HIGH','MEDIUM','LOW']),
      createdAt: ts(back), updatedAt: ts(rndInt(1,30)),
    });
    await bw.maybeFlush();
  }

  const contactIds: string[] = [];
  for (let i = 0; i < 60; i++) {
    const fn = Math.random() > 0.4 ? rnd(FM) : rnd(FF), ln = rnd(LN);
    const ref = doc(collection(db, 'crm_contacts'));
    contactIds.push(ref.id);
    bw.set(ref, {
      tenantId, clientId: rnd(custIds), fullName: `${fn} ${ln}`, firstName: fn, lastName: ln,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@klient.pl`,
      phone: `+48 ${rndInt(220000000,229999999)}`, mobile: `+48 ${rndInt(600000000,699999999)}`,
      role: rnd(['Dyrektor','Kierownik','Specjalista','Handlowiec','CEO','CFO','CTO','Prezes']),
      position: rnd(['Manager','Director','Specialist','Owner','VP']),
      isPrimary: i % 6 === 0, isDecisionMaker: i % 4 === 0,
      linkedinUrl: `https://linkedin.com/in/${fn.toLowerCase()}-${ln.toLowerCase()}`,
      notes: 'Kontakt operacyjny – decyzyjny w sprawach zakupu.',
      lastContactDate: dateStr(rndInt(1,60)), preferredContact: rnd(['EMAIL','PHONE','MEETING']),
      language: rnd(['PL','EN']), timezone: 'Europe/Warsaw',
      createdAt: ts(rndInt(30,400)), updatedAt: ts(rndInt(1,30)),
    });
    await bw.maybeFlush();
  }

  const STAGES = ['Kwalifikacja','Analiza potrzeb','Oferta','Negocjacje','Zamknięcie'];
  const SOURCES = ['Targi','LinkedIn','Polecenie','Cold call','Strona WWW','Partner','Kampania'];
  const dealIds: string[] = [];
  for (let i = 0; i < 30; i++) {
    const ref = doc(collection(db, 'crm_deals'));
    dealIds.push(ref.id);
    const net = rndInt(5,500) * 1000;
    const stage = rnd(STAGES); const back = rndInt(10,300);
    bw.set(ref, {
      tenantId, title: `Szansa sprzedaży — ${rnd(NAMES)} #${i+1}`,
      clientId: rnd(custIds), contactId: rnd(contactIds), stage, value: net, currency: 'PLN',
      probability: rnd([10,20,40,60,80,90]), source: rnd(SOURCES),
      owner: `${rnd(FM)} ${rnd(LN)}`, ownerId: `emp_${rndInt(1,80)}`,
      description: 'Perspektywiczna szansa — klient zainteresowany wdrożeniem systemu ERP.',
      expectedClose: futureDateStr(rndInt(5,120)),
      lostReason: stage === 'Kwalifikacja' ? rnd([null,null,'Cena','Konkurencja']) : null,
      products: [{ name: rnd(['Wdrożenie ERP','Licencja SaaS','Konsulting','Szkolenie','Serwis']), qty: rndInt(1,5), unitPrice: net }],
      activitiesCount: rndInt(2,25), nextAction: rnd(['Wyślij ofertę','Zadzwoń','Spotkanie','Demo','Follow-up']),
      nextActionDate: futureDateStr(rndInt(1,14)),
      createdAt: ts(back), updatedAt: ts(rndInt(1,29)),
    });
  }
  await bw.maybeFlush();

  for (let i = 0; i < 50; i++) {
    bw.set(doc(collection(db, `tenants/${tenantId}/crmActivities`)), {
      tenantId, customerId: rnd(custIds), dealId: rnd(dealIds), contactId: rnd(contactIds),
      type: rnd(['CALL','EMAIL','MEETING','DEMO','FOLLOW_UP','PROPOSAL_SENT','LINKEDIN_MESSAGE']),
      title: rnd(['Rozmowa telefoniczna','Prezentacja produktu','Demo systemu','Spotkanie handlowe','Follow-up e-mail','Wysłanie oferty']),
      body: 'Omówiono warunki współpracy, klient prosi o szczegółową ofertę.',
      outcome: rnd(['POSITIVE','POSITIVE','NEUTRAL','NEGATIVE','NO_ANSWER','SCHEDULED']),
      duration: rndInt(5,90), createdBy: `${rnd(FM)} ${rnd(LN)}`, createdById: `emp_${rndInt(1,80)}`,
      createdAt: ts(rndInt(1,200)), updatedAt: ts(rndInt(1,10)),
    });
  }
  await bw.maybeFlush();

  for (let i = 0; i < 15; i++) {
    bw.set(doc(collection(db, `tenants/${tenantId}/npsResponses`)), {
      tenantId, customerId: rnd(custIds), score: rndInt(6,10),
      category: rnd(['PROMOTER','PASSIVE','DETRACTOR']),
      comment: rnd(['Świetna obsługa','Polecam!','Szybka realizacja','Dobry kontakt z handlowcem','Dobra jakość produktów']),
      surveyDate: dateStr(rndInt(10,180)), createdAt: ts(rndInt(10,180)),
    });
  }
  await bw.maybeFlush();

  const total = await bw.commit();
  log(`CRM: ${NAMES.length} klientów, 60 kontaktów, 30 szans sprzedaży, 50 aktywności, 15 NPS [${total} docs]`);
  return { customers: NAMES.length, contacts: 60, deals: 30 };
};

// ── Orchestrator ──────────────────────────────────────────────────────────────
export type IdesModule = 'hr' | 'crm' | 'projects' | 'finance' | 'timeTracking' | 'auditLogs' | 'inventory' | 'fieldService';

export const generateAllModulesV2 = async (
  tenantId: string,
  modules: IdesModule[],
  log: LogFn,
): Promise<Record<string, number>> => {
  const results: Record<string, number> = {};
  if (modules.includes('hr'))           { Object.assign(results, await generateHrIdesV2(tenantId, log)); }
  if (modules.includes('crm'))          { Object.assign(results, await generateCrmIdesV2(tenantId, log)); }
  if (modules.includes('projects'))     { Object.assign(results, await generateProjectsIdesV2(tenantId, log)); }
  if (modules.includes('finance'))      { Object.assign(results, await generateFinanceIdesV2(tenantId, log)); }
  if (modules.includes('inventory'))    { Object.assign(results, await generateInventoryIdes(tenantId, log)); }
  if (modules.includes('timeTracking')) { Object.assign(results, await generateTimeTrackingIdes(tenantId, log)); }
  if (modules.includes('auditLogs'))    { Object.assign(results, await generateAuditLogsIdes(tenantId, log)); }
  if (modules.includes('fieldService')) { Object.assign(results, await generateFieldServiceIdes(tenantId, log)); }
  return results;
};
