import { db } from '../../../lib/firebase';
import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore';
import type { CompanyProfile, IdesGenerationResult } from '../types';

function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pastTs(monthsAgo: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() - monthsAgo * 30 * 24 * 3600 * 1000));
}

const DOC_TEMPLATES = [
  { name: 'Umowa o wspolprace',    type: 'CONTRACT',     tags: ['umowa', 'kontraktor'] },
  { name: 'Regulamin pracy',       type: 'HR_DOCUMENT',  tags: ['hr', 'regulamin']    },
  { name: 'Polityka bezpieczenstwa', type: 'POLICY',     tags: ['bezpieczenstwo', 'it'] },
  { name: 'Raport kwartalny',      type: 'REPORT',       tags: ['raport', 'finanse']  },
  { name: 'Faktura PDF',           type: 'INVOICE',      tags: ['faktura', 'finanse'] },
  { name: 'Specyfikacja techniczna', type: 'TECHNICAL',  tags: ['it', 'dokumentacja'] },
  { name: 'Protokol odbioru',      type: 'PROTOCOL',     tags: ['projekt', 'odbiór']  },
  { name: 'NDA - umowa poufnosci', type: 'CONTRACT',     tags: ['umowa', 'nda']       },
  { name: 'Oferta handlowa',       type: 'OFFER',        tags: ['crm', 'sprzedaz']    },
  { name: 'Instrukcja uzytkownika',type: 'MANUAL',       tags: ['it', 'pomoc']        },
];

export async function generateDocuments(profile: CompanyProfile): Promise<IdesGenerationResult> {
  const { tenantId, employeeCount, generateMonths } = profile;
  let created = 0;

  const docCount = Math.min(10 + Math.round(employeeCount / 3), 80);
  const docPath  = `tenants/${tenantId}/documents`;

  for (let b = 0; b < docCount; b += 400) {
    const batch = writeBatch(db);
    const end   = Math.min(b + 400, docCount);
    for (let i = b; i < end; i++) {
      const template     = DOC_TEMPLATES[i % DOC_TEMPLATES.length];
      const createdMonths = rnd(1, generateMonths);
      const ref = doc(collection(db, docPath));
      batch.set(ref, {
        tenantId,
        name:      `${template.name} ${String(i + 1).padStart(2, '0')}`,
        type:      template.type,
        tags:      template.tags,
        category:  template.type,
        mimeType:  'application/pdf',
        size:      rnd(50, 5000) * 1024,
        status:    'ACTIVE',
        version:   `1.${rnd(0, 5)}`,
        createdAt: pastTs(createdMonths),
        updatedAt: pastTs(rnd(0, createdMonths)),
        _ides: true,
      });
      created++;
    }
    await batch.commit();
  }

  return { module: 'documents', created, errors: 0 };
}
