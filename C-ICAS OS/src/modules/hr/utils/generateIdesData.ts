import { collection, addDoc, doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

const FIRST_NAMES = ["Jan", "Piotr", "Tomasz", "Andrzej", "Krzysztof", "Michał", "Marcin", "Jakub", "Adam", "Stanisław", "Anna", "Maria", "Katarzyna", "Małgorzata", "Agnieszka", "Krystyna", "Barbara", "Ewa", "Elżbieta", "Zofia"];
const LAST_NAMES = ["Nowak", "Kowalski", "Wiśniewski", "Dąbrowski", "Lewandowski", "Wójcik", "Kamiński", "Kowalczyk", "Zieliński", "Szymański", "Wozniak", "Kozłowski", "Jankowski", "Wojciechowski", "Kwiatkowski", "Kaczmarek", "Mazur", "Krawczyk", "Piotrowski", "Grabowski"];

function getRandomName() {
  return [
    FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)],
    LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
  ];
}

export const generateIdesData = async (tenantId: string) => {
  if (!tenantId) throw new Error("Tenant ID is required");

  const batch = writeBatch(db);

  try {
    const depts = [
      { id: 'board', name: 'Zarząd', isBoard: true },
      { id: 'hr', name: 'Zasoby Ludzkie', parentId: 'board' },
      { id: 'it', name: 'Dział IT', parentId: 'board' },
      { id: 'sales', name: 'Sprzedaż i Marketing', parentId: 'board' },
      { id: 'prod', name: 'Produkcja', parentId: 'board' }
    ];

    const deptRefs: Record<string, string> = {};

    for (const d of depts) {
      const ref = doc(collection(db, 'hr_departments'));
      deptRefs[d.id] = ref.id;
      batch.set(ref, {
        name: d.name,
        isBoard: !!d.isBoard,
        parentId: d.parentId ? deptRefs[d.parentId] : '',
        tenantId,
        createdAt: serverTimestamp()
      });
    }

    const roles = [
      { id: 'ceo', name: 'CEO', deptId: 'board', isManager: true },
      { id: 'cfo', name: 'CFO', deptId: 'board', isManager: true },
      { id: 'hr_dir', name: 'Dyrektor HR', deptId: 'hr', isManager: true },
      { id: 'hr_spec', name: 'Specjalista ds. Rekrutacji', deptId: 'hr' },
      { id: 'hr_pay', name: 'Specjalista ds. Kadr i Płac', deptId: 'hr' },
      { id: 'it_dir', name: 'Dyrektor IT', deptId: 'it', isManager: true },
      { id: 'it_dev1', name: 'Senior Developer', deptId: 'it' },
      { id: 'it_dev2', name: 'Mid Developer', deptId: 'it' },
      { id: 'it_supp', name: 'IT Support', deptId: 'it' },
      { id: 'sales_dir', name: 'Dyrektor Sprzedaży', deptId: 'sales', isManager: true },
      { id: 'sales_rep', name: 'Przedstawiciel Handlowy', deptId: 'sales' },
      { id: 'prod_dir', name: 'Kierownik Produkcji', deptId: 'prod', isManager: true },
      { id: 'prod_work', name: 'Pracownik Produkcji', deptId: 'prod' },
    ];

    const roleRefs: Record<string, string> = {};
    for (const r of roles) {
      const ref = doc(collection(db, 'hr_roles'));
      roleRefs[r.id] = ref.id;
      batch.set(ref, {
        name: r.name,
        departmentId: deptRefs[r.deptId],
        isManager: !!r.isManager,
        tenantId,
        createdAt: serverTimestamp()
      });
    }

    for (let i = 0; i < 30; i++) {
      const [firstName, lastName] = getRandomName();
      const roleTemplate = roles[i % roles.length];
      const deptId = deptRefs[roleTemplate.deptId];
      const roleId = roleRefs[roleTemplate.id];
      const gender = Math.random() > 0.5 ? 'M' : 'F';
      const pesel = `8${Math.floor(Math.random() * 9)}${Math.floor(Math.random() * 12 + 1).toString().padStart(2, '0')}${Math.floor(Math.random() * 28 + 1).toString().padStart(2, '0')}${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`;

      const empRef = doc(collection(db, 'employees'));
      batch.set(empRef, {
        tenantId,
        firstName,
        lastName,
        contractType: 'UOP',
        status: 'ACTIVE',
        gender,
        personalDataValidFrom: '2023-01-01',
        personalDataValidTo: '9999-12-31',
        birthDate: '1980-05-15',
        birthPlace: 'Warszawa',
        pesel,
        nationality: 'Polska',
        street: 'Główna 15',
        city: 'Kraków',
        postalCode: '30-001',
        country: 'Polska',
        salaryType: 'GROSS',
        salaryBasis: 5000 + Math.floor(Math.random() * 10000),
        taxRelief: 300,
        kup: 250,
        fgsp: true,
        fp: true,
        pitExempt: false,
        departmentId: deptId,
        roleId,
        role: roleTemplate.name,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@firma.local`,
        nip: '',
        createdAt: serverTimestamp()
      });
    }

    const recruitmentRef = doc(db, 'hrSettings', tenantId + '_recruitments');
    batch.set(recruitmentRef, {
       openPositions: [
          { id: 'req_1', title: 'Senior React Developer', department: deptRefs['it'], status: 'Otwarta', spots: 2 },
          { id: 'req_2', title: 'Marketing Manager', department: deptRefs['sales'], status: 'Otwarta', spots: 1 },
          { id: 'req_3', title: 'HR Business Partner', department: deptRefs['hr'], status: 'Procesowanie', spots: 1 },
          { id: 'req_4', title: 'Młodszy Księgowy', department: deptRefs['board'], status: 'Aplikacje Zablokowane', spots: 1 },
          { id: 'req_5', title: 'Inżynier Produkcji', department: deptRefs['prod'], status: 'Otwarta', spots: 3 },
       ],
       updatedAt: serverTimestamp()
    }, { merge: true });

    const candidates = [];
    for (let i = 0; i < 10; i++) {
        const [firstName, lastName] = getRandomName();
        candidates.push({
            id: `cand_${Math.random().toString(36).substring(7)}`,
            name: `${firstName} ${lastName}`,
            status: ['Nowy', 'Screening', 'Rozmowa IT', 'Odrzucony', 'Gotowy do zatrudnienia'][Math.floor(Math.random() * 5)],
            appliedFor: ['req_1', 'req_2', 'req_3', 'req_5'][Math.floor(Math.random() * 4)],
            source: ['Pracuj.pl', 'LinkedIn', 'Polecenie', 'Adecco'][Math.floor(Math.random() * 4)],
            score: Math.floor(Math.random() * 100)
        });
    }

    const candRef = doc(db, 'hrSettings', tenantId + '_candidates');
    batch.set(candRef, {
        list: candidates,
        updatedAt: serverTimestamp()
    }, { merge: true });

    await batch.commit();
    console.log("IDES Data generated successfully for tenant:", tenantId);
    return { depts: depts.length, roles: roles.length, employees: 30 };

  } catch (error) {
    console.error("Błąd podczas generowania danych IDES:", error);
    throw error;
  }
};
