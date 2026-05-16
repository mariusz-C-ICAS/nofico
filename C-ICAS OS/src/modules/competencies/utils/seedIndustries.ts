import { db } from '../../../shared/lib/firebase';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';

export const seedIndustries = async () => {
  const batch = writeBatch(db);
  const industries = [
    {
      id: 'construction',
      name: { pl: 'Budownictwo', en: 'Construction' },
      code: 'CON',
      sectors: ['Budownictwo Ogólne', 'Inżynieria Lądowa', 'Wykończenia Wnętrz', 'Instalacje', 'Drogownictwo', 'Wyburzenia', 'Dekarstwo', 'Betoniarstwo']
    },
    {
      id: 'gardening',
      name: { pl: 'Ogrodnictwo i Krajobraz', en: 'Gardening & Landscape' },
      code: 'GAR',
      sectors: ['Pielęgnacja Terenów Zielonych', 'Projektowanie Ogrodów', 'Systemy Nawadniania', 'Arborystyka', 'Szkółkarstwo', 'Architektura Krajobrazu', 'Zakładanie Trawników']
    },
    {
      id: 'it',
      name: { pl: 'Technologie Informacyjne', en: 'Information Technology' },
      code: 'IT',
      sectors: ['Software Development', 'Cybersecurity', 'Cloud Infrastructure', 'AI & Data Science', 'DevOps', 'QA Automation', 'Data Engineering']
    },
    {
      id: 'logistics',
      name: { pl: 'Logistyka i Transport', en: 'Logistics & Transport' },
      code: 'LOG',
      sectors: ['Transport Drogowy', 'Magazynowanie', 'Spedycja Morska', 'Logistyka Ostatniej Mili', 'Zarządzanie Flotą']
    },
    {
      id: 'manufacturing',
      name: { pl: 'Produkcja i Przemysł', en: 'Manufacturing' },
      code: 'MAN',
      sectors: ['Obróbka CNC', 'Automatyka', 'Kontrola Jakości', 'Utrzymanie Ruchu', 'Spawalnictwo']
    }
  ];

  industries.forEach(ind => {
    const ref = doc(db, 'industries', ind.id);
    batch.set(ref, {
      ...ind,
      createdAt: serverTimestamp()
    });
  });

  await batch.commit();
};
