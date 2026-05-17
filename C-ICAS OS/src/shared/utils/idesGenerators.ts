import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../../core/firebase/config';

const FIRST_NAMES = ["Jan","Piotr","Tomasz","Andrzej","Michał","Marcin","Anna","Maria","Katarzyna","Agnieszka"];
const LAST_NAMES  = ["Nowak","Kowalski","Wiśniewski","Lewandowski","Wójcik","Zieliński","Mazur","Kowalczyk"];
function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rndName() { return `${rnd(FIRST_NAMES)} ${rnd(LAST_NAMES)}`; }

// ── CRM ───────────────────────────────────────────────────────────────────────
const CRM_COMPANIES = [
  "Budmax Sp. z o.o.", "Agro-Tech S.A.", "NetSoft Sp. z o.o.", "Eco-Build Sp. z o.o.", "FinPro S.A.",
  "LogiTrans Sp. z o.o.", "MedPlus Sp. z o.o.", "RetailGroup S.A.", "TechServices Sp. z o.o.", "GreenEnergy S.A.",
  "PolBau Sp. z o.o.", "DataCorp Sp. z o.o.",
];
const CRM_STAGES  = ["Kwalifikacja","Analiza potrzeb","Oferta","Negocjacje","Zamknięcie"];
const CRM_SOURCES = ["Targi","LinkedIn","Polecenie","Cold call","Strona WWW","Partner"];

export const generateCrmIdes = async (tenantId: string) => {
  const batch = writeBatch(db);

  const clientRefs: string[] = [];
  for (const name of CRM_COMPANIES) {
    const ref = doc(collection(db, 'crm_clients'));
    clientRefs.push(ref.id);
    batch.set(ref, {
      tenantId, name,
      nip: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      city: rnd(["Warszawa","Kraków","Wrocław","Poznań","Gdańsk","Łódź"]),
      industry: rnd(["IT","Budownictwo","Handel","Logistyka","Produkcja"]),
      status: rnd(["Aktywny","Potencjalny","VIP"]),
      createdAt: serverTimestamp(),
    });
  }

  for (let i = 0; i < 20; i++) {
    const ref = doc(collection(db, 'crm_contacts'));
    batch.set(ref, {
      tenantId, fullName: rndName(),
      clientId: rnd(clientRefs),
      email: `kontakt${i}@firma.pl`,
      phone: `+48 ${Math.floor(500000000 + Math.random() * 99999999)}`,
      role: rnd(["Dyrektor","Kierownik","Specjalista","Handlowiec"]),
      createdAt: serverTimestamp(),
    });
  }

  for (let i = 0; i < 8; i++) {
    const ref = doc(collection(db, 'crm_deals'));
    batch.set(ref, {
      tenantId,
      title: `Szansa sprzedaży #${i + 1}`,
      clientId: rnd(clientRefs),
      stage: rnd(CRM_STAGES),
      value: Math.round((10000 + Math.random() * 290000) / 1000) * 1000,
      currency: 'PLN',
      probability: [20,40,60,80,90][Math.floor(Math.random() * 5)],
      source: rnd(CRM_SOURCES),
      expectedClose: new Date(Date.now() + Math.random() * 90 * 86400000).toISOString().split('T')[0],
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
  return { clients: CRM_COMPANIES.length, contacts: 20, deals: 8 };
};

// ── Projects ──────────────────────────────────────────────────────────────────
const PROJECT_NAMES = [
  "Wdrożenie systemu ERP","Budowa platformy e-commerce","Migracja do chmury",
  "Audyt bezpieczeństwa IT","Projekt modernizacji hali",
];
const TASK_NAMES = [
  "Analiza wymagań","Projektowanie architektury","Implementacja modułu",
  "Testy integracyjne","Wdrożenie produkcyjne","Dokumentacja","Szkolenie użytkowników",
  "Konfiguracja środowiska","Review kodu","Prezentacja dla klienta",
];
const TASK_STATUSES = ["TODO","IN_PROGRESS","REVIEW","DONE"];

export const generateProjectsIdes = async (tenantId: string) => {
  const batch = writeBatch(db);

  for (const name of PROJECT_NAMES) {
    const projRef = doc(collection(db, 'projects'));
    batch.set(projRef, {
      tenantId, name,
      status: rnd(["ACTIVE","PLANNING","ON_HOLD"]),
      startDate: new Date(Date.now() - Math.random() * 60 * 86400000).toISOString().split('T')[0],
      endDate:   new Date(Date.now() + Math.random() * 90 * 86400000).toISOString().split('T')[0],
      budget: Math.round((50000 + Math.random() * 450000) / 1000) * 1000,
      createdAt: serverTimestamp(),
    });

    for (let i = 0; i < 4; i++) {
      const taskRef = doc(collection(db, 'tasks'));
      batch.set(taskRef, {
        tenantId, projectId: projRef.id,
        title: rnd(TASK_NAMES),
        status: rnd(TASK_STATUSES),
        assignee: rndName(),
        priority: rnd(["LOW","MEDIUM","HIGH"]),
        dueDate: new Date(Date.now() + Math.random() * 60 * 86400000).toISOString().split('T')[0],
        createdAt: serverTimestamp(),
      });
    }
  }

  await batch.commit();
  return { projects: PROJECT_NAMES.length, tasks: PROJECT_NAMES.length * 4 };
};

// ── Finance ───────────────────────────────────────────────────────────────────
const INVOICE_CLIENTS = [
  "Budmax Sp. z o.o.","Agro-Tech S.A.","NetSoft Sp. z o.o.","Eco-Build Sp. z o.o.","FinPro S.A.",
];
const INVOICE_ITEMS = [
  { name: "Usługi konsultingowe", price: 5000 },
  { name: "Licencja oprogramowania", price: 12000 },
  { name: "Wdrożenie systemu", price: 30000 },
  { name: "Szkolenie pracowników", price: 3500 },
  { name: "Serwis miesięczny", price: 2500 },
];

export const generateFinanceIdes = async (tenantId: string) => {
  const batch = writeBatch(db);

  for (let i = 0; i < 8; i++) {
    const item = rnd(INVOICE_ITEMS);
    const net = item.price + Math.floor(Math.random() * item.price * 0.5);
    const ref = doc(collection(db, 'invoices'));
    batch.set(ref, {
      tenantId,
      number: `FV/2026/${String(i + 1).padStart(3, '0')}`,
      client: rnd(INVOICE_CLIENTS),
      status: rnd(["Opłacona","Oczekuje","Przeterminowana"]),
      netAmount: net,
      vatRate: 23,
      grossAmount: Math.round(net * 1.23),
      currency: 'PLN',
      issueDate: new Date(Date.now() - i * 15 * 86400000).toISOString().split('T')[0],
      dueDate:   new Date(Date.now() + (14 - i * 3) * 86400000).toISOString().split('T')[0],
      items: [{ name: item.name, qty: 1, unitPrice: net, netValue: net }],
      createdAt: serverTimestamp(),
    });
  }

  for (let i = 0; i < 6; i++) {
    const ref = doc(collection(db, 'expenses'));
    batch.set(ref, {
      tenantId,
      title: rnd(["Paliwo","Telefon","Internet","Materiały biurowe","Podróż służbowa","Catering"]),
      amount: Math.round(50 + Math.random() * 950),
      currency: 'PLN',
      category: rnd(["Transport","Komunikacja","Biuro","Marketing"]),
      date: new Date(Date.now() - i * 7 * 86400000).toISOString().split('T')[0],
      status: rnd(["Zaakceptowany","Oczekuje","Odrzucony"]),
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
  return { invoices: 8, expenses: 6 };
};
