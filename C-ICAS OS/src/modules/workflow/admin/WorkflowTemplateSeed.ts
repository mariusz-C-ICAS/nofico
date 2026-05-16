import { db } from '../../../shared/lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const TEMPLATES = [
  {
    id: 'tpl-vendor-invoice',
    name: 'Faktura zakupowa',
    documentType: 'VENDOR_INVOICE',
    description: 'Standardowy proces weryfikacji i księgowania faktur dostawców',
    steps: [
      {
        id: 'step-1',
        name: 'Weryfikacja formalna',
        type: 'APPROVAL',
        assignToRole: 'accountant',
        slaHours: 24,
        order: 1,
      },
      {
        id: 'step-2',
        name: 'Weryfikacja KSeF',
        type: 'KSEF_VERIFY',
        assignToRole: 'accountant',
        slaHours: 4,
        order: 2,
      },
      {
        id: 'step-3',
        name: 'Zatwierdzenie merytoryczne',
        type: 'APPROVAL',
        assignToRole: 'manager',
        slaHours: 48,
        order: 3,
      },
      {
        id: 'step-4',
        name: 'Księgowanie',
        type: 'BOOK',
        assignToRole: 'accountant',
        slaHours: 8,
        order: 4,
      },
      {
        id: 'step-5',
        name: 'Rozliczenie płatności',
        type: 'SETTLE',
        assignToRole: 'finance',
        slaHours: 72,
        order: 5,
      },
      {
        id: 'step-6',
        name: 'Archiwizacja',
        type: 'ARCHIVE',
        assignToRole: 'accountant',
        slaHours: 24,
        order: 6,
      },
    ],
    isDefault: true,
    version: 1,
  },
  {
    id: 'tpl-contract',
    name: 'Umowa',
    documentType: 'CONTRACT',
    description: 'Proces weryfikacji prawnej i zatwierdzania umów',
    steps: [
      {
        id: 'step-1',
        name: 'Przegląd prawny',
        type: 'APPROVAL',
        assignToRole: 'legal',
        slaHours: 72,
        order: 1,
      },
      {
        id: 'step-2',
        name: 'Zatwierdzenie zarządu',
        type: 'APPROVAL',
        assignToRole: 'board',
        slaHours: 48,
        order: 2,
      },
      {
        id: 'step-3',
        name: 'Podpisanie',
        type: 'APPROVAL',
        assignToRole: 'director',
        slaHours: 24,
        order: 3,
      },
      {
        id: 'step-4',
        name: 'Archiwizacja',
        type: 'ARCHIVE',
        assignToRole: 'legal',
        slaHours: 8,
        order: 4,
      },
    ],
    isDefault: true,
    version: 1,
  },
  {
    id: 'tpl-timesheet',
    name: 'Karta czasu pracy',
    documentType: 'TIMESHEET',
    description: 'Miesięczny proces zatwierdzania kart czasu pracy',
    steps: [
      {
        id: 'step-1',
        name: 'Zatwierdzenie przez kierownika',
        type: 'APPROVAL',
        assignToRole: 'manager',
        slaHours: 48,
        order: 1,
      },
      {
        id: 'step-2',
        name: 'Weryfikacja HR',
        type: 'APPROVAL',
        assignToRole: 'hr',
        slaHours: 24,
        order: 2,
      },
      {
        id: 'step-3',
        name: 'Rozliczenie w płacach',
        type: 'BOOK',
        assignToRole: 'payroll',
        slaHours: 8,
        order: 3,
      },
    ],
    isDefault: true,
    version: 1,
  },
];

export async function seedWorkflowTemplates(tenantId: string): Promise<void> {
  const templatesRef = collection(db, `tenants/${tenantId}/workflowTemplates`);

  const writes = TEMPLATES.map(tpl =>
    setDoc(doc(templatesRef, tpl.id), {
      ...tpl,
      tenantId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true })
  );

  await Promise.all(writes);
}

export const DEFAULT_TEMPLATE_IDS = TEMPLATES.map(t => t.id);
