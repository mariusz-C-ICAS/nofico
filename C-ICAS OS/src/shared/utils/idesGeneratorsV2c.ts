import { collection, doc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { rnd, rndInt, ts, dateStr, futureDateStr, FM, FF, LN, CITIES, STREETS, BatchWriter, type LogFn } from './idesHelpers';

// ── Time Tracking ─────────────────────────────────────────────────────────────
export const generateTimeTrackingIdes = async (tenantId: string, log: LogFn) => {
  const bw = new BatchWriter();

  const DESCRIPTIONS = [
    'Praca nad zadaniem projektowym','Spotkanie z klientem','Code review','Analiza wymagań',
    'Testowanie funkcjonalności','Dokumentacja techniczna','Planowanie sprintu','Retrospektywa',
    'Wdrożenie na środowisko produkcyjne','Naprawa błędów krytycznych','Szkolenie wewnętrzne',
    'Przygotowanie prezentacji','Rozmowa z dostawcą','Wsparcie użytkowników','Inwentaryzacja',
  ];

  // 200 time entries spanning 14+ months
  for (let i = 0; i < 200; i++) {
    const back = rndInt(1,430);
    const startHour = rndInt(7,17);
    const duration = rndInt(15,540);
    const startMs = Date.now() - back * 86400000 + startHour * 3600000;
    bw.set(doc(collection(db, 'timeEntries')), {
      tenantId, employeeId: `emp_${rndInt(1,80)}`,
      projectId: Math.random() > 0.3 ? `proj_${rndInt(1,15)}` : null,
      taskId: Math.random() > 0.4 ? `task_${rndInt(1,150)}` : null,
      startTime: Timestamp.fromDate(new Date(startMs)),
      endTime: Timestamp.fromDate(new Date(startMs + duration * 60000)),
      duration, durationHours: Math.round(duration / 60 * 100) / 100,
      description: rnd(DESCRIPTIONS),
      status: rnd(['APPROVED','APPROVED','APPROVED','PENDING','REJECTED']),
      billable: Math.random() > 0.3, hourlyRate: rndInt(50,250),
      billedAmount: Math.random() > 0.3 ? rndInt(50,250) * Math.round(duration / 60) : 0,
      overtime: duration > 480, overtimeHours: duration > 480 ? (duration - 480) / 60 : 0,
      location: rnd(['OFFICE','REMOTE','CLIENT_SITE','FIELD']),
      approvedBy: `emp_${rndInt(1,80)}`, approvedAt: Math.random() > 0.5 ? ts(rndInt(1,back)) : null,
      notes: Math.random() > 0.7 ? 'Praca poza standardowymi godzinami ze względu na deadline.' : null,
      createdAt: ts(back), updatedAt: ts(back),
    });
    await bw.maybeFlush();
  }

  // Timesheets (weekly summaries, 30 weeks)
  for (let w = 0; w < 30; w++) {
    const weekBack = w * 7 + 3;
    bw.set(doc(collection(db, 'timesheets')), {
      tenantId, employeeId: `emp_${rndInt(1,80)}`,
      weekStart: dateStr(weekBack + 6), weekEnd: dateStr(weekBack),
      totalHours: rndInt(35,50), regularHours: 40, overtimeHours: rndInt(0,10),
      billableHours: rndInt(20,40), nonBillableHours: rndInt(0,15),
      status: rnd(['APPROVED','APPROVED','PENDING','SUBMITTED']),
      approvedBy: `emp_${rndInt(1,80)}`,
      createdAt: ts(weekBack), updatedAt: ts(rndInt(1,weekBack)),
    });
  }
  await bw.maybeFlush();

  const total = await bw.commit();
  log(`TimeTracking: 200 wpisów czasu, 30 tygodniowych zestawień (14+ miesięcy historii) [${total} docs]`);
  return { timeEntries: 200, timesheets: 30 };
};

// ── Audit Logs ────────────────────────────────────────────────────────────────
export const generateAuditLogsIdes = async (tenantId: string, log: LogFn) => {
  const bw = new BatchWriter();

  const ACTIONS = ['CREATE','UPDATE','DELETE','VIEW','APPROVE','REJECT','EXPORT','LOGIN','LOGOUT','ASSIGN'];
  const COLLECTIONS = ['employees','invoices','crm_deals','projects','leaves','expenses','customers','inventory','stockMovements','tasks'];
  const USERS = Array.from({length: 10}, (_, i) => `user_${i+1}@firma.pl`);

  for (let i = 0; i < 100; i++) {
    const action = rnd(ACTIONS);
    const back = rndInt(1,430);
    bw.set(doc(collection(db, 'auditLogs')), {
      tenantId, collection: rnd(COLLECTIONS), entityId: `doc_${rndInt(1000,9999)}`,
      action, userId: `uid_${rndInt(1,10)}`, userEmail: rnd(USERS),
      userRole: rnd(['OWNER','ADMIN','MANAGER','EMPLOYEE']),
      changes: action === 'UPDATE' ? { status: { from: rnd(['PENDING','DRAFT','ACTIVE']), to: rnd(['APPROVED','ACTIVE','PAID']) } } : {},
      previousValues: action === 'UPDATE' ? { status: 'PENDING' } : {},
      newValues: action === 'UPDATE' ? { status: 'APPROVED' } : {},
      ipAddress: `${rndInt(10,220)}.${rndInt(1,254)}.${rndInt(1,254)}.${rndInt(1,254)}`,
      userAgent: rnd(['Mozilla/5.0 (Windows NT 10.0) Chrome/124','Mozilla/5.0 (Macintosh) Safari/605','Mozilla/5.0 (iPhone) Mobile Safari']),
      sessionId: `sess_${rndInt(100000,999999)}`,
      result: rnd(['SUCCESS','SUCCESS','SUCCESS','FAILURE','FORBIDDEN']),
      duration: rndInt(5,500),
      createdAt: ts(back),
    });
    await bw.maybeFlush();
  }

  const total = await bw.commit();
  log(`AuditLogs: 100 wpisów audytowych (14+ miesięcy historii) [${total} docs]`);
  return { auditLogs: 100 };
};

// ── Field Service ─────────────────────────────────────────────────────────────
export const generateFieldServiceIdes = async (tenantId: string, log: LogFn) => {
  const bw = new BatchWriter();

  // Technicians (15)
  const techIds: string[] = [];
  for (let i = 0; i < 15; i++) {
    const gender = Math.random() > 0.3 ? 'M' : 'F';
    const fn = gender === 'M' ? rnd(FM) : rnd(FF); const ln = rnd(LN);
    const ref = doc(collection(db, 'technicians'));
    techIds.push(ref.id);
    bw.set(ref, {
      tenantId, employeeId: `emp_${rndInt(1,80)}`, firstName: fn, lastName: ln,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@serwis.local`,
      phone: `+48 ${rndInt(500000000,599999999)}`,
      mobile: `+48 ${rndInt(600000000,699999999)}`,
      specializations: rnd([['Elektryka','Klimatyzacja'],['Hydraulika','Ogrzewanie'],['IT','Sieci'],['Mechanika','Spawanie']]),
      certifications: [{ name: rnd(['SEP do 1kV','Uprawnienia elektryczne','Certyfikat F-gazy','ISO 9001 Auditor']), expiryDate: futureDateStr(rndInt(60,365)) }],
      city: rnd(CITIES), serviceRegion: rnd(['Mazowieckie','Małopolskie','Śląskie','Pomorskie','Wielkopolskie']),
      vehicleId: `VEH-${rndInt(100,999)}`, vehiclePlate: `WA ${rndInt(10000,99999)}`,
      status: rnd(['AVAILABLE','AVAILABLE','ON_SITE','BREAK','OFF_DUTY']),
      rating: rndInt(35,50) / 10, completedOrders: rndInt(50,500),
      createdAt: ts(rndInt(100,400)), updatedAt: ts(rndInt(1,30)),
    });
  }

  // Service equipment / assets (25)
  const assetIds: string[] = [];
  for (let i = 0; i < 25; i++) {
    const ref = doc(collection(db, 'serviceAssets'));
    assetIds.push(ref.id);
    bw.set(ref, {
      tenantId, clientId: `cust_${rndInt(1,40)}`,
      name: rnd(['Klimatyzacja Mitsubishi','Piec gazowy Vaillant','Agregat prądotwórczy','Winda osobowa','System HVAC','Kompresor Atlas Copco','Suwnica przemysłowa','Pompa ciepła Daikin']),
      serialNumber: `SN-${rndInt(100000,999999)}`, model: `Model-${rndInt(100,999)}`,
      manufacturer: rnd(['Siemens','Bosch','ABB','Schneider','Honeywell','Daikin','Vaillant']),
      category: rnd(['HVAC','Electrical','Mechanical','Hydraulic','IT Infrastructure']),
      location: `${rnd(CITIES)}, ${rnd(STREETS)} ${rndInt(1,100)}`,
      installDate: dateStr(rndInt(100,1000)), warrantyExpiry: futureDateStr(rndInt(-200,1000)),
      lastServiceDate: dateStr(rndInt(30,365)), nextServiceDate: futureDateStr(rndInt(30,365)),
      status: rnd(['OPERATIONAL','OPERATIONAL','NEEDS_SERVICE','IN_REPAIR','DECOMMISSIONED']),
      contractType: rnd(['FULL_SERVICE','INSPECTION_ONLY','EMERGENCY','WARRANTY']),
      createdAt: ts(rndInt(100,500)),
    });
    await bw.maybeFlush();
  }

  // Service orders (40)
  const orderIds: string[] = [];
  for (let i = 0; i < 40; i++) {
    const ref = doc(collection(db, 'serviceOrders'));
    orderIds.push(ref.id);
    const back = rndInt(1,430); const priority = rnd(['LOW','MEDIUM','HIGH','CRITICAL']);
    const status = back > 90 ? rnd(['COMPLETED','CLOSED']) : rnd(['NEW','SCHEDULED','IN_PROGRESS','WAITING_PARTS','COMPLETED']);
    bw.set(ref, {
      tenantId, orderNumber: `SO-${String(10000 + i)}`,
      clientId: `cust_${rndInt(1,40)}`, assetId: rnd(assetIds),
      technicianId: rnd(techIds),
      type: rnd(['PLANNED_MAINTENANCE','EMERGENCY_REPAIR','INSPECTION','INSTALLATION','WARRANTY_REPAIR']),
      priority, status,
      title: rnd(['Przegląd okresowy','Naprawa awaryjna','Wymiana filtrów','Kalibracja czujników','Instalacja nowego urządzenia','Diagnoza usterki']),
      description: 'Zlecenie serwisowe – wymagana wizyta technika na miejscu.',
      reportedBy: `${rnd(FM)} ${rnd(LN)}`, reportedByPhone: `+48 ${rndInt(600000000,699999999)}`,
      scheduledDate: back > 30 ? dateStr(back - 20) : futureDateStr(rndInt(1,14)),
      scheduledTimeStart: `${rndInt(8,14)}:00`, scheduledTimeEnd: `${rndInt(15,18)}:00`,
      actualStart: status !== 'NEW' && status !== 'SCHEDULED' ? dateStr(back) : null,
      actualEnd: (status === 'COMPLETED' || status === 'CLOSED') ? dateStr(back - 1) : null,
      travelTimeMin: rndInt(15,120),
      laborHours: rndInt(1,8), laborRate: rndInt(100,250),
      partsUsed: Array.from({length: rndInt(0,4)}, () => ({ name: rnd(['Filtr powietrza','Uszczelka','Zawór','Przewód','Czujnik']), qty: rndInt(1,5), unitPrice: rndInt(20,500) })),
      totalPartsValue: rndInt(0,2000), totalLaborValue: rndInt(200,2000),
      totalValue: rndInt(300,5000), currency: 'PLN',
      invoiced: status === 'CLOSED', invoiceId: status === 'CLOSED' ? `inv_${rndInt(1,40)}` : null,
      customerSignature: status === 'COMPLETED' || status === 'CLOSED',
      rating: (status === 'CLOSED') ? rndInt(3,5) : null,
      notes: 'Zlecenie zrealizowane zgodnie z protokołem serwisowym.',
      createdAt: ts(back), updatedAt: ts(rndInt(1,20)),
    });
    await bw.maybeFlush();
  }

  // Service contracts (10)
  for (let i = 0; i < 10; i++) {
    bw.set(doc(collection(db, 'serviceContracts')), {
      tenantId, contractNumber: `SC-${String(1000 + i)}`,
      clientId: `cust_${rndInt(1,40)}`,
      type: rnd(['FULL_SERVICE','INSPECTION_ONLY','EXTENDED_WARRANTY','SLA_PREMIUM']),
      status: rnd(['ACTIVE','ACTIVE','ACTIVE','EXPIRING','EXPIRED']),
      startDate: dateStr(rndInt(100,500)), endDate: futureDateStr(rndInt(-30,500)),
      value: rndInt(5000,100000), currency: 'PLN',
      paymentFrequency: rnd(['MONTHLY','QUARTERLY','ANNUAL']),
      slaResponseHours: rnd([4,8,24,48]),
      slaResolutionHours: rnd([8,24,48,72]),
      includedAssets: rndInt(1,10), visitPerYear: rndInt(2,12),
      autoRenew: Math.random() > 0.4,
      createdAt: ts(rndInt(100,500)), updatedAt: ts(rndInt(1,30)),
    });
  }
  await bw.maybeFlush();

  const total = await bw.commit();
  log(`FieldService: 15 techników, 25 urządzeń, 40 zleceń serwisowych, 10 kontraktów serwisowych [${total} docs]`);
  return { technicians: 15, assets: 25, serviceOrders: 40, serviceContracts: 10 };
};
