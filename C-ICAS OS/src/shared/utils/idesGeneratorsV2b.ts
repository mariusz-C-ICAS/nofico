import { collection, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { rnd, rndInt, ts, dateStr, futureDateStr, nip, bankAccount, FM, LN, CITIES, STREETS, BatchWriter, type LogFn } from './idesHelpers';

// ── Projects ──────────────────────────────────────────────────────────────────
export const generateProjectsIdesV2 = async (tenantId: string, log: LogFn) => {
  const bw = new BatchWriter();

  const PROJECTS = [
    { name:'Wdrożenie systemu ERP',         code:'ERP-2025',    budget:450000, status:'ACTIVE',    priority:'CRITICAL' },
    { name:'Budowa platformy e-commerce',   code:'ECOM-2025',   budget:280000, status:'ACTIVE',    priority:'HIGH'     },
    { name:'Migracja do chmury Azure',      code:'CLOUD-2025',  budget:180000, status:'COMPLETED', priority:'HIGH'     },
    { name:'Audyt bezpieczeństwa IT',       code:'SEC-2025',    budget:60000,  status:'COMPLETED', priority:'MEDIUM'   },
    { name:'Modernizacja hali produkcyjnej',code:'PROD-2026',   budget:750000, status:'PLANNING',  priority:'HIGH'     },
    { name:'Portal klienta B2B',            code:'PORTAL-2026', budget:120000, status:'ACTIVE',    priority:'HIGH'     },
    { name:'Program lojalnościowy',         code:'LOYAL-2026',  budget:90000,  status:'ON_HOLD',   priority:'LOW'      },
    { name:'Digitalizacja archiwum',        code:'ARCH-2025',   budget:45000,  status:'COMPLETED', priority:'LOW'      },
    { name:'Platforma analityki danych',    code:'BI-2026',     budget:200000, status:'ACTIVE',    priority:'HIGH'     },
    { name:'Wdrożenie ISO 27001',           code:'ISO-2026',    budget:80000,  status:'ACTIVE',    priority:'MEDIUM'   },
    { name:'Aplikacja mobilna dla klientów',code:'MOB-2026',    budget:160000, status:'PLANNING',  priority:'HIGH'     },
    { name:'Automatyzacja procesów HR',     code:'HRBOT-2026',  budget:95000,  status:'ACTIVE',    priority:'MEDIUM'   },
    { name:'Nowy system magazynowy WMS',    code:'WMS-2026',    budget:320000, status:'PLANNING',  priority:'CRITICAL' },
    { name:'Integracja z systemem celnym',  code:'CUST-2025',   budget:55000,  status:'COMPLETED', priority:'MEDIUM'   },
    { name:'Serwis chatbot AI',             code:'AI-2026',     budget:140000, status:'ACTIVE',    priority:'HIGH'     },
  ];

  const TASK_NAMES = [
    'Analiza wymagań','Projektowanie architektury','Implementacja modułu','Testy integracyjne',
    'Wdrożenie produkcyjne','Dokumentacja techniczna','Szkolenie użytkowników',
    'Konfiguracja środowiska','Code review','Prezentacja dla klienta',
    'Testy akceptacyjne UAT','Optymalizacja wydajności','Migracja danych','Integracja API',
  ];

  const projIds: string[] = [];
  for (const p of PROJECTS) {
    const ref = doc(collection(db, 'projects'));
    projIds.push(ref.id);
    const start = rndInt(100,420);
    const actualCost = Math.round(p.budget * rndInt(20,85) / 100);
    bw.set(ref, {
      tenantId, name: p.name, code: p.code,
      description: `Projekt ${p.name} — cel: wzrost efektywności operacyjnej o ${rndInt(15,40)}%.`,
      status: p.status, priority: p.priority,
      clientId: null, clientName: null,
      startDate: dateStr(start), endDate: futureDateStr(rndInt(30,200)),
      plannedEndDate: futureDateStr(rndInt(60,250)),
      budget: p.budget, currency: 'PLN', actualCost,
      budgetVariance: actualCost - p.budget,
      managerId: `emp_${rndInt(1,80)}`, managerName: `${rnd(FM)} ${rnd(LN)}`,
      teamSize: rndInt(3,15), teamMembers: Array.from({length: rndInt(3,8)}, () => `emp_${rndInt(1,80)}`),
      mpk: `MPK-${rndInt(100,999)}`, costCenter: `CC-${rndInt(100,999)}`,
      progress: p.status === 'COMPLETED' ? 100 : (p.status === 'PLANNING' ? rndInt(0,10) : rndInt(10,90)),
      tags: ['wewnętrzny', rnd(['IT','HR','Finanse','Produkcja','Logistyka'])],
      riskLevel: rnd(['LOW','MEDIUM','HIGH']),
      phase: rnd(['INITIATION','PLANNING','EXECUTION','MONITORING','CLOSURE']),
      methodology: rnd(['AGILE','SCRUM','WATERFALL','PRINCE2','HYBRID']),
      sprintCount: rndInt(3,20), currentSprint: rndInt(1,10),
      openIssues: rndInt(0,15), closedIssues: rndInt(5,50),
      createdAt: ts(start + 5), updatedAt: ts(rndInt(1,30)),
    });

    for (let i = 0; i < 10; i++) {
      const tStatus = rnd(['TODO','TODO','IN_PROGRESS','IN_PROGRESS','REVIEW','DONE','DONE','DONE','BLOCKED','CANCELLED']);
      bw.set(doc(collection(db, 'tasks')), {
        tenantId, projectId: ref.id, title: rnd(TASK_NAMES),
        description: 'Zadanie realizowane zgodnie z harmonogramem projektu.',
        status: tStatus, priority: rnd(['LOW','MEDIUM','HIGH','CRITICAL']),
        assignee: `${rnd(FM)} ${rnd(LN)}`, assigneeId: `emp_${rndInt(1,80)}`,
        reviewer: `${rnd(FM)} ${rnd(LN)}`, reviewerId: `emp_${rndInt(1,80)}`,
        estimatedHours: rndInt(4,120), actualHours: rndInt(2,100),
        storyPoints: rnd([1,2,3,5,8,13]),
        startDate: dateStr(rndInt(50,300)), dueDate: futureDateStr(rndInt(1,90)),
        completedDate: (tStatus === 'DONE' || tStatus === 'CANCELLED') ? dateStr(rndInt(1,50)) : null,
        sprint: `Sprint ${rndInt(1,10)}`,
        tags: [rnd(['backend','frontend','design','testing','devops','docs'])],
        commentsCount: rndInt(0,20), attachmentsCount: rndInt(0,8),
        blockedBy: tStatus === 'BLOCKED' ? `task_${rndInt(1,100)}` : null,
        createdAt: ts(rndInt(50,300)), updatedAt: ts(rndInt(1,20)),
      });
      await bw.maybeFlush();
    }
  }

  // Milestones (30)
  for (let i = 0; i < 30; i++) {
    bw.set(doc(collection(db, 'milestones')), {
      tenantId, projectId: rnd(projIds),
      name: rnd(['Kick-off','Analiza ukończona','Prototyp gotowy','UAT zakończone','Go-live','Odbiór końcowy','Audyt mid-term']),
      dueDate: futureDateStr(rndInt(-30,120)),
      status: rnd(['COMPLETED','COMPLETED','IN_PROGRESS','PENDING']),
      description: 'Kamień milowy projektu – weryfikacja postępu.',
      createdAt: ts(rndInt(30,300)),
    });
  }
  await bw.maybeFlush();

  // Cost Centers
  for (let i = 0; i < 8; i++) {
    bw.set(doc(collection(db, 'costCenters')), {
      tenantId, code: `CC-${100 + i}`,
      name: rnd(['IT','Sprzedaż','Produkcja','HR','Finanse','Logistyka','Zakupy','R&D']),
      budget: rndInt(100,800) * 1000, currency: 'PLN',
      managerId: `emp_${rndInt(1,80)}`,
      actualSpend: rndInt(50,700) * 1000,
      createdAt: ts(rndInt(300,450)),
    });
  }

  const total = await bw.commit();
  log(`Projects: ${PROJECTS.length} projektów, ${PROJECTS.length * 10} zadań, 30 kamieni milowych, 8 MPK [${total} docs]`);
  return { projects: PROJECTS.length, tasks: PROJECTS.length * 10, milestones: 30 };
};

// ── Finance ───────────────────────────────────────────────────────────────────
export const generateFinanceIdesV2 = async (tenantId: string, log: LogFn) => {
  const bw = new BatchWriter();

  const CLIENTS = ['Budmax Sp. z o.o.','Agro-Tech S.A.','NetSoft Sp. z o.o.','Eco-Build Sp. z o.o.',
    'FinPro S.A.','LogiTrans Sp. z o.o.','MedPlus Sp. z o.o.','RetailGroup S.A.','TechServices Sp. z o.o.'];
  const ITEMS = [
    { name:'Usługi konsultingowe', price:5000 }, { name:'Licencja oprogramowania', price:12000 },
    { name:'Wdrożenie systemu', price:30000 },   { name:'Szkolenie pracowników', price:3500 },
    { name:'Serwis miesięczny', price:2500 },     { name:'Hosting i utrzymanie', price:1800 },
    { name:'Audyt IT', price:8000 },              { name:'Doradztwo techniczne', price:6000 },
    { name:'Integracja systemów', price:15000 },  { name:'Wsparcie techniczne', price:2000 },
  ];
  const PAYMENT_METHODS = ['Przelew','Przelew','Przelew','Karta','Gotówka','BLIK'];
  const EXP_CATS = ['Transport','Komunikacja','Biuro','Marketing','Szkolenia','Gastronomia','IT','Delegacje','Reprezentacja'];

  // Invoices (40)
  for (let i = 0; i < 40; i++) {
    const item = rnd(ITEMS); const qty = rndInt(1,5);
    const net = (item.price + rndInt(0, Math.round(item.price * 0.5))) * qty;
    const vatAmt = Math.round(net * 0.23);
    const issueBack = rndInt(5,430);
    const status = issueBack > 60 ? 'PAID' : rnd(['PAID','PAID','PENDING','OVERDUE']);
    bw.set(doc(collection(db, 'invoices')), {
      tenantId,
      number: `FV/${2025 + Math.floor(issueBack / 365)}/${String(i+1).padStart(3,'0')}`,
      client: rnd(CLIENTS), clientId: `cust_${rndInt(1,40)}`,
      status, documentType: rnd(['INVOICE','INVOICE','INVOICE','PROFORMA','CREDIT_NOTE']),
      netAmount: net, vatRate: 23, vatAmount: vatAmt, grossAmount: net + vatAmt, currency: 'PLN',
      issueDate: dateStr(issueBack), dueDate: dateStr(issueBack - 14),
      paymentDate: status === 'PAID' ? dateStr(rndInt(1, Math.max(1, issueBack - 1))) : null,
      paymentMethod: rnd(PAYMENT_METHODS), paymentDelay: status === 'PAID' ? rndInt(0,15) : null,
      bankAccount: bankAccount(),
      notes: `Faktura wystawiona zgodnie z umową nr ${rndInt(100,999)}/2025.`,
      items: [{ name: item.name, qty, unitPrice: item.price, vatRate: 23, netValue: net, grossValue: net + vatAmt }],
      projectId: Math.random() > 0.5 ? `proj_${rndInt(1,15)}` : null,
      createdAt: ts(issueBack), updatedAt: ts(rndInt(1,20)),
    });
  }
  await bw.maybeFlush();

  // Expenses (30)
  for (let i = 0; i < 30; i++) {
    const net = rndInt(50,3000); const vatAmt = Math.round(net * 0.23);
    const back = rndInt(5,430);
    bw.set(doc(collection(db, 'expenses')), {
      tenantId,
      title: rnd(['Paliwo','Telefon służbowy','Internet','Materiały biurowe','Podróż służbowa','Catering','Szkolenie zewnętrzne','Taxi','Parking','Hotel','Konferencja','Reklama online']),
      amount: net + vatAmt, currency: 'PLN', category: rnd(EXP_CATS),
      netAmount: net, vatAmount: vatAmt, vatRate: 23,
      date: dateStr(back), status: rnd(['ACCEPTED','ACCEPTED','ACCEPTED','PENDING','REJECTED']),
      employeeId: `emp_${rndInt(1,80)}`, projectId: Math.random() > 0.6 ? `proj_${rndInt(1,15)}` : null,
      receiptNumber: `PAR/${rndInt(1000,9999)}`,
      notes: 'Wydatek służbowy – zatwierdzone przez kierownika.',
      approvedBy: `${rnd(FM)} ${rnd(LN)}`, approvedById: `emp_${rndInt(1,80)}`,
      paymentMethod: rnd(PAYMENT_METHODS),
      mileage: null, costCenter: `CC-${rndInt(100,107)}`,
      createdAt: ts(back), updatedAt: ts(rndInt(1,15)),
    });
  }
  await bw.maybeFlush();

  // Budgets (12 monthly)
  for (let i = 0; i < 12; i++) {
    const monthBack = i * 30 + 15;
    bw.set(doc(collection(db, 'budgets')), {
      tenantId, period: dateStr(monthBack).slice(0,7),
      category: rnd(EXP_CATS), planned: rndInt(5000,50000), actual: rndInt(3000,55000),
      currency: 'PLN', variance: rndInt(-10000,10000),
      status: rnd(['ON_TRACK','OVER_BUDGET','UNDER_BUDGET']),
      costCenter: `CC-${rndInt(100,107)}`, createdAt: ts(monthBack),
    });
  }
  await bw.maybeFlush();

  // Bank transactions (50)
  for (let i = 0; i < 50; i++) {
    const amount = rndInt(100,50000); const back = rndInt(1,430);
    const type = rnd(['DEBIT','CREDIT','CREDIT','DEBIT']);
    bw.set(doc(collection(db, 'bankTransactions')), {
      tenantId, amount: type === 'DEBIT' ? -amount : amount, currency: 'PLN',
      type, category: rnd(EXP_CATS),
      counterparty: rnd(CLIENTS), bankAccount: bankAccount(),
      description: rnd(['Zapłata za fakturę','Przelew wychodzący','Wpłata od klienta','Polecenie zapłaty']),
      reference: `REF-${rndInt(10000,99999)}`,
      transactionDate: dateStr(back), bookingDate: dateStr(back - 1),
      balance: rndInt(10000,500000), reconciled: Math.random() > 0.2,
      createdAt: ts(back),
    });
    await bw.maybeFlush();
  }

  const total = await bw.commit();
  log(`Finance: 40 faktur, 30 wydatków, 12 budżetów, 50 transakcji bankowych [${total} docs]`);
  return { invoices: 40, expenses: 30, budgets: 12, bankTransactions: 50 };
};

// ── Inventory / Warehouse ─────────────────────────────────────────────────────
export const generateInventoryIdes = async (tenantId: string, log: LogFn) => {
  const bw = new BatchWriter();

  const WAREHOUSES = [
    { name:'Magazyn Centralny', city:'Warszawa', code:'WH-01', capacity:10000 },
    { name:'Magazyn Północny',  city:'Gdańsk',   code:'WH-02', capacity:5000  },
    { name:'Magazyn Południe',  city:'Kraków',   code:'WH-03', capacity:7500  },
  ];
  const whIds: string[] = [];
  for (const wh of WAREHOUSES) {
    const ref = doc(collection(db, 'warehouses'));
    whIds.push(ref.id);
    bw.set(ref, {
      tenantId, name: wh.name, code: wh.code, city: wh.city,
      address: `${rnd(STREETS)} ${rndInt(1,100)}`,
      postalCode: `${rndInt(10,99)}-${rndInt(100,999)}`, country: 'PL',
      capacityM2: wh.capacity, usedCapacityM2: Math.round(wh.capacity * rndInt(40,85) / 100),
      managerId: `emp_${rndInt(1,80)}`, managerName: `${rnd(FM)} ${rnd(LN)}`,
      zones: ['A','B','C','D'], rackCount: rndInt(20,80),
      isActive: true, type: rnd(['MAIN','DISTRIBUTION','PRODUCTION']),
      phone: `+48 ${rndInt(220000000,229999999)}`,
      createdAt: ts(rndInt(300,500)), updatedAt: ts(rndInt(1,30)),
    });
  }

  const CATEGORIES = ['Elektronika','Meble biurowe','Materiały eksploatacyjne','Części zamienne','Opakowania','Surowce','Wyroby gotowe','Narzędzia','Chemia','Spożywcze'];
  const UNITS = ['szt.','kg','l','m','m2','opak.','karton'];

  const prodIds: string[] = [];
  for (let i = 0; i < 60; i++) {
    const ref = doc(collection(db, 'products'));
    prodIds.push(ref.id);
    const unitPrice = rndInt(5,5000);
    const category = rnd(CATEGORIES);
    bw.set(ref, {
      tenantId,
      sku: `SKU-${String(1000 + i).padStart(5,'0')}`,
      barcode: `590${rndInt(1000000000,9999999999)}`,
      name: `Produkt ${category} ${i+1}`,
      description: `Wysokiej jakości ${category.toLowerCase()} — zgodność z normami EN ISO.`,
      category, subcategory: rnd(['Podstawowe','Premium','Standardowe','Specjalne']),
      unit: rnd(UNITS), unitPrice, currency: 'PLN',
      vatRate: rnd([0,8,23]),
      minStockLevel: rndInt(5,50), maxStockLevel: rndInt(100,1000),
      reorderPoint: rndInt(20,80), reorderQty: rndInt(50,500),
      supplierId: `supp_${rndInt(1,10)}`, supplierName: `Dostawca ${rndInt(1,10)} Sp. z o.o.`,
      supplierSku: `SUP-${rndInt(10000,99999)}`,
      leadTimeDays: rndInt(3,30), shelfLife: rndInt(0,365) > 300 ? null : rndInt(30,730),
      weight: rndInt(1,50) * 0.1, dimensions: { l: rndInt(10,100), w: rndInt(10,80), h: rndInt(5,60) },
      isActive: Math.random() > 0.1, isSerialTracked: Math.random() > 0.7,
      isBatchTracked: Math.random() > 0.6,
      imageUrl: null, tags: [category.toLowerCase(), 'magazyn'],
      createdAt: ts(rndInt(60,400)), updatedAt: ts(rndInt(1,30)),
    });
    await bw.maybeFlush();
  }

  // Inventory levels (stock per product per warehouse = 60*3 = 180, but only ~120 combos)
  for (let i = 0; i < 120; i++) {
    const qty = rndInt(0,500);
    bw.set(doc(collection(db, 'inventory')), {
      tenantId, productId: rnd(prodIds), warehouseId: rnd(whIds),
      warehouseZone: rnd(['A','B','C','D']), rackLocation: `R${rndInt(1,20)}-${rndInt(1,5)}`,
      qty, reservedQty: rndInt(0, Math.min(qty, 50)), availableQty: qty - rndInt(0, Math.min(qty, 50)),
      lastCountDate: dateStr(rndInt(5,60)), lastCountQty: qty + rndInt(-5,5),
      lotNumber: Math.random() > 0.5 ? `LOT-${rndInt(1000,9999)}` : null,
      expiryDate: Math.random() > 0.7 ? futureDateStr(rndInt(30,365)) : null,
      updatedAt: ts(rndInt(1,30)),
    });
    await bw.maybeFlush();
  }

  // Stock movements (150)
  const MOVE_TYPES = ['IN','IN','OUT','OUT','TRANSFER','ADJUSTMENT','RETURN'];
  for (let i = 0; i < 150; i++) {
    const moveType = rnd(MOVE_TYPES);
    const qty = rndInt(1,100); const back = rndInt(1,430);
    bw.set(doc(collection(db, 'stockMovements')), {
      tenantId, productId: rnd(prodIds),
      fromWarehouseId: moveType === 'IN' ? null : rnd(whIds),
      toWarehouseId: moveType === 'OUT' ? null : rnd(whIds),
      type: moveType, qty, unit: rnd(UNITS),
      reference: rnd([`PO-${rndInt(1000,9999)}`,`SO-${rndInt(1000,9999)}`,`TR-${rndInt(1000,9999)}`,`ADJ-${rndInt(100,999)}`]),
      reason: rnd(['Dostawa od dostawcy','Wydanie na produkcję','Zwrot klienta','Inwentaryzacja','Transfer między magazynami','Uszkodzenie towaru']),
      cost: rndInt(10,50000), currency: 'PLN',
      operatorId: `emp_${rndInt(1,80)}`, operatorName: `${rnd(FM)} ${rnd(LN)}`,
      lotNumber: Math.random() > 0.5 ? `LOT-${rndInt(1000,9999)}` : null,
      notes: Math.random() > 0.7 ? 'Weryfikacja dokumentacji w toku.' : null,
      createdAt: ts(back), updatedAt: ts(back),
    });
    await bw.maybeFlush();
  }

  // Purchase orders (20)
  for (let i = 0; i < 20; i++) {
    const back = rndInt(10,200);
    const lines = rndInt(2,8);
    bw.set(doc(collection(db, 'purchaseOrders')), {
      tenantId, number: `PO-${String(2025001 + i)}`,
      supplierId: `supp_${rndInt(1,10)}`, supplierName: `Dostawca ${rndInt(1,10)} Sp. z o.o.`,
      supplierNip: nip(), warehouseId: rnd(whIds),
      status: rnd(['DRAFT','SENT','CONFIRMED','RECEIVED','RECEIVED','CANCELLED']),
      totalNet: rndInt(500,50000), totalGross: rndInt(600,62000), currency: 'PLN',
      orderDate: dateStr(back), expectedDelivery: dateStr(back - rndInt(5,30)),
      actualDelivery: Math.random() > 0.4 ? dateStr(back - rndInt(1,20)) : null,
      lineItems: Array.from({length: lines}, () => ({
        productId: rnd(prodIds), qty: rndInt(5,200), unitPrice: rndInt(5,1000),
      })),
      paymentTerms: rnd(['14 dni','30 dni','60 dni']),
      createdBy: `emp_${rndInt(1,80)}`, approvedBy: `emp_${rndInt(1,80)}`,
      createdAt: ts(back), updatedAt: ts(rndInt(1,15)),
    });
  }
  await bw.maybeFlush();

  const total = await bw.commit();
  log(`Inventory: ${WAREHOUSES.length} magazyny, 60 produktów, 120 stanów, 150 ruchów magazynowych, 20 zamówień zakupu [${total} docs]`);
  return { warehouses: WAREHOUSES.length, products: 60, stockLevels: 120, movements: 150, purchaseOrders: 20 };
};
