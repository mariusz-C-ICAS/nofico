import React, { useState } from 'react';
import { Layers, CheckCircle2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface Props { tenantId: string; onApplied?: () => void }

interface IndustryTemplate {
  id: string;
  name: string;
  icon: string;
  sector: string;
  description: string;
  dealStages: string[];
  defaultServices: { name: string; duration: number; price: number }[];
  defaultTaxRate: number;
  leadScoreThresholds: { hot: number; warm: number };
  tags: string[];
  npsScheduleDays: number;
}

const TEMPLATES: IndustryTemplate[] = [
  {
    id: 'salon', name: 'Salon urody / SPA', icon: '💅', sector: 'Usługi B2C',
    description: 'Fryzjer, kosmetyczka, paznokcie, masaże',
    dealStages: ['Kontakt', 'Pierwsza wizyta', 'Stały klient', 'VIP'],
    defaultServices: [
      { name: 'Strzyżenie damskie', duration: 60, price: 120 },
      { name: 'Manicure', duration: 45, price: 80 },
      { name: 'Masaż relaksacyjny', duration: 60, price: 150 },
    ],
    defaultTaxRate: 23, leadScoreThresholds: { hot: 70, warm: 40 },
    tags: ['stały', 'vip', 'nowy'], npsScheduleDays: 30,
  },
  {
    id: 'clinic', name: 'Przychodnia / Klinika', icon: '🏥', sector: 'Medycyna',
    description: 'Gabinety lekarskie, stomatologia, fizjoterapia',
    dealStages: ['Rejestracja', 'Wizyta diagnostyczna', 'Leczenie', 'Kontrola', 'Zakończone'],
    defaultServices: [
      { name: 'Konsultacja lekarska', duration: 20, price: 150 },
      { name: 'Zabieg fizjoterapeutyczny', duration: 45, price: 120 },
      { name: 'Badania kontrolne', duration: 30, price: 100 },
    ],
    defaultTaxRate: 0, leadScoreThresholds: { hot: 60, warm: 30 },
    tags: ['pacjent', 'przewlekły', 'jednorazowy'], npsScheduleDays: 90,
  },
  {
    id: 'gym', name: 'Siłownia / Fitness', icon: '🏋️', sector: 'Sport & Rekreacja',
    description: 'Gym, CrossFit, yoga, pilates, treningi personalne',
    dealStages: ['Próbny', 'Miesięczny', 'Kwartalny', 'Roczny', 'Zawieszony'],
    defaultServices: [
      { name: 'Trening personalny', duration: 60, price: 120 },
      { name: 'Zajęcia grupowe', duration: 60, price: 30 },
      { name: 'Konsultacja dietetyczna', duration: 45, price: 80 },
    ],
    defaultTaxRate: 8, leadScoreThresholds: { hot: 75, warm: 50 },
    tags: ['aktywny', 'zawieszony', 'vip'], npsScheduleDays: 60,
  },
  {
    id: 'restaurant', name: 'Gastronomia', icon: '🍽️', sector: 'Food & Beverage',
    description: 'Restauracja, kawiarnia, catering, food truck',
    dealStages: ['Lead', 'Kontakt', 'Oferta cateringowa', 'Zamówienie', 'Zrealizowane'],
    defaultServices: [
      { name: 'Catering imprezy (os.)', duration: 240, price: 85 },
      { name: 'Rezerwacja sali', duration: 180, price: 500 },
    ],
    defaultTaxRate: 8, leadScoreThresholds: { hot: 65, warm: 35 },
    tags: ['b2b', 'b2c', 'catering', 'stały'], npsScheduleDays: 14,
  },
  {
    id: 'real_estate', name: 'Nieruchomości', icon: '🏢', sector: 'Real Estate',
    description: 'Pośrednicy, deweloperzy, zarządzanie najmem',
    dealStages: ['Pozyskanie', 'Prezentacja', 'Negocjacje', 'Umowa przedwstępna', 'Akt notarialny', 'Zamknięte'],
    defaultServices: [
      { name: 'Pośrednictwo sprzedaży', duration: 0, price: 0 },
      { name: 'Wycena nieruchomości', duration: 60, price: 300 },
    ],
    defaultTaxRate: 23, leadScoreThresholds: { hot: 80, warm: 55 },
    tags: ['kupujący', 'sprzedający', 'deweloper', 'inwestor'], npsScheduleDays: 30,
  },
  {
    id: 'automotive', name: 'Motoryzacja / Serwis', icon: '🚗', sector: 'Automotive',
    description: 'Serwis samochodowy, sprzedaż aut, diagnostyka',
    dealStages: ['Rejestracja', 'Diagnoza', 'Kosztorys', 'Naprawa', 'Odbiór'],
    defaultServices: [
      { name: 'Przegląd okresowy', duration: 60, price: 150 },
      { name: 'Wymiana oleju', duration: 30, price: 80 },
      { name: 'Diagnostyka komputerowa', duration: 30, price: 60 },
    ],
    defaultTaxRate: 23, leadScoreThresholds: { hot: 70, warm: 40 },
    tags: ['flota', 'prywatny', 'ubezpieczenie'], npsScheduleDays: 30,
  },
  {
    id: 'legal', name: 'Kancelaria prawna', icon: '⚖️', sector: 'Prawo & Finanse',
    description: 'Kancelarie prawne, doradztwo podatkowe, notariaty',
    dealStages: ['Zapytanie', 'Analiza', 'Propozycja', 'Podpisanie umowy', 'Realizacja', 'Zamknięcie'],
    defaultServices: [
      { name: 'Konsultacja prawna', duration: 60, price: 300 },
      { name: 'Sporządzenie umowy', duration: 0, price: 500 },
    ],
    defaultTaxRate: 23, leadScoreThresholds: { hot: 75, warm: 50 },
    tags: ['korporacja', 'osoba prywatna', 'pilne'], npsScheduleDays: 90,
  },
  {
    id: 'it', name: 'IT / Software House', icon: '💻', sector: 'IT & Technologia',
    description: 'Agencje IT, freelancerzy, software houses',
    dealStages: ['Lead', 'Discovery', 'Propozycja', 'Negocjacje', 'Kontrakt', 'Realizacja', 'Utrzymanie'],
    defaultServices: [
      { name: 'Audyt techniczny', duration: 120, price: 500 },
      { name: 'Konsultacja architektoniczna', duration: 60, price: 400 },
    ],
    defaultTaxRate: 23, leadScoreThresholds: { hot: 80, warm: 55 },
    tags: ['startup', 'korporacja', 'msp', 'b2b'], npsScheduleDays: 90,
  },
  {
    id: 'education', name: 'Edukacja / Szkolenia', icon: '📚', sector: 'Edukacja',
    description: 'Szkoły językowe, kursy online, korepetycje, coaching',
    dealStages: ['Zainteresowanie', 'Bezpłatna lekcja', 'Zapis', 'Aktywny kurs', 'Ukończony', 'Alumni'],
    defaultServices: [
      { name: 'Lekcja indywidualna (60 min)', duration: 60, price: 80 },
      { name: 'Kurs grupowy (semestr)', duration: 0, price: 600 },
    ],
    defaultTaxRate: 0, leadScoreThresholds: { hot: 65, warm: 35 },
    tags: ['uczeń', 'student', 'dorosły', 'korporacja'], npsScheduleDays: 60,
  },
  {
    id: 'logistics', name: 'Transport / Logistyka', icon: '🚛', sector: 'Logistyka',
    description: 'Firmy transportowe, kurierzy, magazyny, spedycja',
    dealStages: ['Zapytanie ofertowe', 'Wycena', 'Zlecenie', 'W realizacji', 'Dostarczone', 'Fakturowane'],
    defaultServices: [
      { name: 'Transport krajowy (FTL)', duration: 0, price: 2500 },
      { name: 'Transport krajowy (LTL)', duration: 0, price: 800 },
    ],
    defaultTaxRate: 23, leadScoreThresholds: { hot: 70, warm: 40 },
    tags: ['b2b', 'eksport', 'import', 'stały'], npsScheduleDays: 30,
  },
];

const SECTOR_COLORS: Record<string, string> = {
  'Usługi B2C': 'bg-pink-100 text-pink-700',
  'Medycyna': 'bg-blue-100 text-blue-700',
  'Sport & Rekreacja': 'bg-orange-100 text-orange-700',
  'Food & Beverage': 'bg-yellow-100 text-yellow-700',
  'Real Estate': 'bg-emerald-100 text-emerald-700',
  'Automotive': 'bg-slate-100 text-slate-700',
  'Prawo & Finanse': 'bg-indigo-100 text-indigo-700',
  'IT & Technologia': 'bg-violet-100 text-violet-700',
  'Edukacja': 'bg-green-100 text-green-700',
  'Logistyka': 'bg-amber-100 text-amber-700',
};

export default function IndustryTemplates({ tenantId }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<string[]>([]);

  const handleApply = async (tpl: IndustryTemplate) => {
    setApplying(tpl.id);
    await setDoc(doc(db, `tenants/${tenantId}/settings/crm`), {
      tenantId,
      dealStages: tpl.dealStages,
      defaultTaxRate: tpl.defaultTaxRate,
      leadScoreThresholds: tpl.leadScoreThresholds,
      npsScheduleDays: tpl.npsScheduleDays,
      appliedTemplate: tpl.id,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    // Add default services to bookingServices
    for (const svc of tpl.defaultServices) {
      await setDoc(
        doc(db, `tenants/${tenantId}/bookingServices`, `${tpl.id}_${svc.name.replace(/\s/g, '_')}`),
        { tenantId, ...svc, currency: 'PLN', color: '#6366f1', bufferAfter: 0, maxDaysAdvance: 30, active: true, category: tpl.sector }
      );
    }
    setApplied(a => [...a, tpl.id]);
    setApplying(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Szablony branżowe</h3>
        <p className="text-xs text-slate-500 mt-0.5">Gotowe konfiguracje CRM + Booking dla każdej branży — kliknij "Zastosuj" aby wdrożyć</p>
      </div>

      <div className="grid gap-4">
        {TEMPLATES.map(tpl => {
          const isExpanded = expanded === tpl.id;
          const isApplied = applied.includes(tpl.id);
          const isApplying = applying === tpl.id;

          return (
            <div key={tpl.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-4 p-5">
                <div className="text-3xl">{tpl.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900">{tpl.name}</span>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg ${SECTOR_COLORS[tpl.sector] ?? 'bg-slate-100 text-slate-600'}`}>{tpl.sector}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">{tpl.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setExpanded(isExpanded ? null : tpl.id)}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-500">
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                  <button onClick={() => handleApply(tpl)} disabled={isApplying || isApplied}
                    className={`flex items-center gap-2 font-black text-xs px-4 py-2.5 rounded-xl transition-all ${
                      isApplied ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50'
                    }`}>
                    {isApplying ? <RefreshCw size={11} className="animate-spin" /> : isApplied ? <CheckCircle2 size={11} /> : <Layers size={11} />}
                    {isApplied ? 'Zastosowano!' : 'Zastosuj'}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 pt-0 border-t border-slate-100 space-y-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Etapy pipeline</p>
                    <div className="flex flex-wrap gap-2">
                      {tpl.dealStages.map((s, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-3 py-1.5">
                          <span className="w-4 h-4 bg-indigo-100 rounded text-indigo-600 text-[8px] font-black flex items-center justify-center">{i + 1}</span>
                          <span className="text-[10px] font-bold text-slate-700">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {tpl.defaultServices.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Domyślne usługi</p>
                      <div className="space-y-1.5">
                        {tpl.defaultServices.map((s, i) => (
                          <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                            <span className="text-xs font-bold text-slate-700">{s.name}</span>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500">
                              {s.duration > 0 && <span>{s.duration} min</span>}
                              <span className="font-black text-slate-700">{s.price > 0 ? s.price + ' PLN' : 'Wycena'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-6 text-[10px] text-slate-500">
                    <span>VAT: <strong>{tpl.defaultTaxRate}%</strong></span>
                    <span>NPS co: <strong>{tpl.npsScheduleDays} dni</strong></span>
                    <span>Hot lead ≥ <strong>{tpl.leadScoreThresholds.hot} pkt</strong></span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
