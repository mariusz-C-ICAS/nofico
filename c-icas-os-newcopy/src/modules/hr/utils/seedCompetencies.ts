import { db } from '../../../shared/lib/firebase';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';

export const seedMasterCompetencies = async () => {
  const batch = writeBatch(db);
  const masterRef = collection(db, 'master_competencies');

  const competencies = [
    // SOFT SKILLS
    {
      name: { pl: 'Komunikacja Interpersonalna', en: 'Interpersonal Communication' },
      category: 'SOFT', industries: ['ALL'],
      description: { pl: 'Zdolność jasnego formułowania myśli i aktywnego słuchania.', en: 'Ability to clearly formulate thoughts and active listening.' },
      proficiencyLevels: [
        { level: 1, label: { pl: 'Nowicjusz' }, behavior: { pl: 'Potrafi przekazać proste informacje w zespole.' } },
        { level: 2, label: { pl: 'Pomocnik' }, behavior: { pl: 'Skutecznie komunikuje się z kolegami, dba o przepływ info.' } },
        { level: 3, label: { pl: 'Samodzielny' }, behavior: { pl: 'Skutecznie komunikuje się z klientami i interesariuszami.' } },
        { level: 4, label: { pl: 'Ekspert' }, behavior: { pl: 'Moderuje trudne dyskusje, rozwiązuje konflikty.' } },
        { level: 5, label: { pl: 'Mentor' }, behavior: { pl: 'Kształtuje kulturę komunikacji w skali organizacji.' } }
      ]
    },
    // CONSTRUCTION
    {
      name: { pl: 'Murowanie ścian z silikatów', en: 'Masonry with Silicate Bricks' },
      category: 'TECHNICAL', industries: ['CONSTRUCTION'],
      description: { pl: 'Umiejętność precyzyjnego wznoszenia ścian konstrukcyjnych i działowych.', en: 'Ability to precision-build load-bearing and partition walls.' },
      proficiencyLevels: [
        { level: 1, label: { pl: 'Pomocnik murarza' }, behavior: { pl: 'Przygotowuje zaprawę, tnie bloczki.' } },
        { level: 2, label: { pl: 'Młodszy murarz' }, behavior: { pl: 'Muruje proste odcinki pod nadzorem.' } },
        { level: 3, label: { pl: 'Samodzielny murarz' }, behavior: { pl: 'Muruje naroża, wyznacza poziomy, czyta rysunek.' } },
        { level: 4, label: { pl: 'Brygadzista' }, behavior: { pl: 'Koordynuje pracę zespołu murarskiego, dba o jakość.' } },
        { level: 5, label: { pl: 'Mistrz' }, behavior: { pl: 'Rozwiązuje trudne detale projektowe, optymalizuje proces.' } }
      ]
    },
    {
      name: { pl: 'Obsługa Wiertnicy Diamentowej', en: 'Diamond Core Drill Operation' },
      category: 'TECHNICAL', industries: ['CONSTRUCTION'],
      description: { pl: 'Wykonywanie otworów w betonie zbrojonym techniką diamentową.', en: 'Core drilling in reinforced concrete using diamond technique.' },
      proficiencyLevels: [
        { level: 1, label: { pl: 'Obserwator' }, behavior: { pl: 'Zna zasady bezpieczeństwa, uzupełnia wodę.' } },
        { level: 2, label: { pl: 'Pomocnik operatora' }, behavior: { pl: 'Montuje statyw, mocuje maszynę.' } },
        { level: 3, label: { pl: 'Operator' }, behavior: { pl: 'Samodzielnie wykonuje otwory o standardowych średnicach.' } },
        { level: 4, label: { pl: 'Starszy Operator' }, behavior: { pl: 'Wierci pod kątem, w trudnych warunkach (pod wodą/sufit).' } },
        { level: 5, label: { pl: 'Ekspert techniczny' }, behavior: { pl: 'Dobiera parametry wierteł do najtwardszych struktur.' } }
      ]
    },
    // GARDENING
    {
      name: { pl: 'Obsługa Traktorka Kosiarki John Deere', en: 'John Deere Riding Mower Operation' },
      category: 'TECHNICAL', industries: ['GARDENING'],
      description: { pl: 'Prowadzenie i konserwacja traktorków ogrodowych.', en: 'Driving and maintenance of garden tractors.' },
      proficiencyLevels: [
        { level: 1, label: { pl: 'Kandydat' }, behavior: { pl: 'Zna zasady bezpiecznego uruchamiania i tankowania.' } },
        { level: 2, label: { pl: 'Młodszy operator' }, behavior: { pl: 'Kosi proste, płaskie powierzchnie pod nadzorem.' } },
        { level: 3, label: { pl: 'Operator' }, behavior: { pl: 'Samodzielnie kosi tereny o zmiennym nachyleniu.' } },
        { level: 4, label: { pl: 'Specjalista' }, behavior: { pl: 'Wykonuje okresową konserwację (wymiana noży, pasów).' } },
        { level: 5, label: { pl: 'Trener' }, behavior: { pl: 'Szkoli nowych operatorów z zakresu bezpiecznej pracy.' } }
      ]
    }
  ];

  competencies.forEach(comp => {
    const newDoc = doc(masterRef);
    batch.set(newDoc, {
      ...comp,
      createdAt: serverTimestamp(),
      isVerifiedByExpert: true
    });
  });

  await batch.commit();
  console.log('Master competencies seeded successfully');
};
