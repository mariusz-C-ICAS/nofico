import { db } from '../../../lib/firebase';
import { collection, writeBatch, doc, setDoc, Timestamp } from 'firebase/firestore';
import type { CompanyProfile, IdesGenerationResult } from '../types';

function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pastTs(monthsAgo: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() - monthsAgo * 30 * 24 * 3600 * 1000));
}

const TEMPLATES = [
  {
    name: 'Zatwierdzenie faktury zakupowej',
    type: 'VENDOR_INVOICE',
    steps: [
      { order: 1, name: 'Wprowadzenie',       role: 'EMPLOYEE',  action: 'submit'   },
      { order: 2, name: 'Weryfikacja FK',      role: 'ACCOUNTANT',action: 'approve'  },
      { order: 3, name: 'Zatwierdzenie',       role: 'MANAGER',   action: 'approve'  },
    ],
  },
  {
    name: 'Wniosek urlopowy',
    type: 'LEAVE_REQUEST',
    steps: [
      { order: 1, name: 'Zlozenie wniosku',   role: 'EMPLOYEE',  action: 'submit'   },
      { order: 2, name: 'Akceptacja HR',       role: 'HR',        action: 'approve'  },
    ],
  },
  {
    name: 'Zakup sprzetu IT',
    type: 'IT_PURCHASE',
    steps: [
      { order: 1, name: 'Wniosek',             role: 'EMPLOYEE',  action: 'submit'   },
      { order: 2, name: 'Wycena IT',           role: 'IT',        action: 'review'   },
      { order: 3, name: 'Zatwierdzenie',       role: 'MANAGER',   action: 'approve'  },
      { order: 4, name: 'Realizacja',          role: 'IT',        action: 'complete' },
    ],
  },
];

const STATUSES   = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING', 'REJECTED'];
const INIT_NAMES = ['Jan Nowak', 'Anna Kowalska', 'Piotr Wisniewski', 'Katarzyna Dabrowska', 'Michal Lewandowski'];

export async function generateWorkflows(profile: CompanyProfile): Promise<IdesGenerationResult> {
  const { tenantId, generateMonths } = profile;
  let created = 0;
  const base = `tenants/${tenantId}`;

  // 1. Templates
  const templateIds: string[] = [];
  for (const tmpl of TEMPLATES) {
    const ref = doc(collection(db, `${base}/workflowTemplates`));
    templateIds.push(ref.id);
    await setDoc(ref, {
      tenantId,
      name:      tmpl.name,
      type:      tmpl.type,
      steps:     tmpl.steps,
      isActive:  true,
      createdAt: pastTs(generateMonths + 1),
      _ides: true,
    });
    created++;
  }

  // 2. Instances
  const instanceCount = Math.min(30 + rnd(0, 20), 50);
  for (let b = 0; b < instanceCount; b += 400) {
    const batch = writeBatch(db);
    const end = Math.min(b + 400, instanceCount);
    for (let i = b; i < end; i++) {
      const templateId = pick(templateIds);
      const templateIdx = templateIds.indexOf(templateId);
      const tmpl = TEMPLATES[templateIdx] || TEMPLATES[0];
      const startMonthsAgo = rnd(1, generateMonths);
      const status = pick(STATUSES);
      const ref = doc(collection(db, `${base}/workflowInstances`));
      batch.set(ref, {
        tenantId,
        templateId,
        templateName:  tmpl.name,
        type:          tmpl.type,
        status,
        currentStep:   status === 'COMPLETED' ? tmpl.steps.length : 1,
        initiatorName: pick(INIT_NAMES),
        startedAt:     pastTs(startMonthsAgo),
        completedAt:   status === 'COMPLETED' ? pastTs(startMonthsAgo - 1) : null,
        createdAt:     pastTs(startMonthsAgo),
        _ides: true,
      });
      created++;
    }
    await batch.commit();
  }

  return { module: 'workflow', created, errors: 0 };
}
