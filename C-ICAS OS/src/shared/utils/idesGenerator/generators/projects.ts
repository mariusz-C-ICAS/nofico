import { db } from '../../../lib/firebase';
import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore';
import type { CompanyProfile, IdesGenerationResult } from '../types';

const PROJECT_NAMES = [
  'Wdrozenie systemu CRM', 'Migracja infrastruktury IT', 'Projekt e-commerce', 'Audyt bezpieczenstwa',
  'Aplikacja mobilna', 'Optymalizacja procesow', 'Platforma B2B', 'System raportowania',
  'Integracja ERP', 'Portal klienta', 'Transformacja cyfrowa', 'Automatyzacja procesow',
];
const TASK_NAMES = [
  'Analiza wymagan', 'Projektowanie architektury', 'Implementacja modulu', 'Testy jednostkowe',
  'Testy integracyjne', 'Code review', 'Dokumentacja', 'Wdrozenie na srodowisko testowe',
  'Szkolenie uzytkownikow', 'Raport postepu', 'Weryfikacja z klientem', 'Go-live',
];
const EMPLOYEES_MOCK = Array.from({ length: 10 }, (_, i) => `emp_mock_${i}`);

function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pastTs(monthsAgo: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() - monthsAgo * 30 * 24 * 3600 * 1000));
}

export async function generateProjects(profile: CompanyProfile): Promise<IdesGenerationResult> {
  const { tenantId, employeeCount, generateMonths } = profile;
  let created = 0;

  const projectCount = Math.min(3 + Math.round(employeeCount / 10), 12);

  for (let p = 0; p < projectCount; p++) {
    const startMonthsAgo = rnd(3, generateMonths);
    const durationMonths = rnd(2, 8);
    const isCompleted    = startMonthsAgo - durationMonths > 0;
    const projBatch      = writeBatch(db);
    const projRef        = doc(collection(db, 'projects'));

    projBatch.set(projRef, {
      tenantId,
      name:        PROJECT_NAMES[p % PROJECT_NAMES.length],
      description: `Projekt realizowany dla klienta - etap ${p + 1}`,
      status:      isCompleted ? 'COMPLETED' : rnd(0, 5) > 0 ? 'ACTIVE' : 'ON_HOLD',
      startDate:   pastTs(startMonthsAgo),
      endDate:     isCompleted ? pastTs(startMonthsAgo - durationMonths) : pastTs(-durationMonths),
      budget:      rnd(50, 500) * 1000,
      mpk:         `MPK-${String(p + 1).padStart(3, '0')}`,
      managerId:   pick(EMPLOYEES_MOCK),
      createdAt:   pastTs(startMonthsAgo),
      _ides: true,
    });

    const taskCount = rnd(8, 20);
    for (let t = 0; t < taskCount; t++) {
      const taskRef = doc(collection(db, 'project_tasks'));
      const taskMonthsAgo = rnd(1, startMonthsAgo);
      projBatch.set(taskRef, {
        tenantId,
        projectId:  projRef.id,
        title:      TASK_NAMES[t % TASK_NAMES.length],
        status:     isCompleted ? 'DONE' : pick(['DONE', 'DONE', 'IN_PROGRESS', 'TODO']),
        priority:   pick(['HIGH', 'MEDIUM', 'MEDIUM', 'LOW']),
        assigneeId: pick(EMPLOYEES_MOCK),
        dueDate:    pastTs(taskMonthsAgo - 1),
        createdAt:  pastTs(taskMonthsAgo),
        _ides: true,
      });
      created++;
    }
    await projBatch.commit();
    created++;

    // Time entries for this project — weekly entries over project duration
    const weeksActive = durationMonths * 4;
    for (let w = 0; w < weeksActive; w += 40) {
      const teBatch = writeBatch(db);
      const end = Math.min(w + 40, weeksActive);
      for (let wk = w; wk < end; wk++) {
        const entriesThisWeek = rnd(2, 5);
        for (let e = 0; e < entriesThisWeek; e++) {
          const teRef = doc(collection(db, 'time_entries'));
          teBatch.set(teRef, {
            tenantId,
            projectId:   projRef.id,
            employeeId:  pick(EMPLOYEES_MOCK),
            date:        pastTs(startMonthsAgo - Math.round(wk / 4)),
            hours:       rnd(1, 8),
            description: pick(TASK_NAMES),
            createdAt:   pastTs(startMonthsAgo - Math.round(wk / 4)),
            _ides: true,
          });
          created++;
        }
      }
      await teBatch.commit();
    }
  }

  return { module: 'projects', created, errors: 0 };
}
