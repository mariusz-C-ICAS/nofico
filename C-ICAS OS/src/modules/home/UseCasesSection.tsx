import { useState } from 'react';
import { CheckCircle2, X, List, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { USE_CASE_DATA, BT_META, BT_ALL, BusinessTypeId } from './useCasesData';

const COLOR_MAP: Record<string, string> = {
  emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  blue:    'text-blue-700 bg-blue-50 border-blue-200',
  violet:  'text-violet-700 bg-violet-50 border-violet-200',
  cyan:    'text-cyan-700 bg-cyan-50 border-cyan-200',
  teal:    'text-teal-700 bg-teal-50 border-teal-200',
  orange:  'text-orange-700 bg-orange-50 border-orange-200',
  rose:    'text-rose-700 bg-rose-50 border-rose-200',
  indigo:  'text-indigo-700 bg-indigo-50 border-indigo-200',
};

const BADGE_DOT: Record<string, string> = {
  emerald: 'bg-emerald-500', blue: 'bg-blue-500', violet: 'bg-violet-500',
  cyan: 'bg-cyan-500', teal: 'bg-teal-500', orange: 'bg-orange-500',
  rose: 'bg-rose-500', indigo: 'bg-indigo-500',
};

const TOTAL_CASES = USE_CASE_DATA.reduce((s, c) => s + c.cases.length, 0);

export function UseCasesSection({ lang }: { lang: string }) {
  const isPl = lang !== 'en';
  const [view, setView] = useState<'all' | 'filter'>('all');
  const [selectedType, setSelectedType] = useState<BusinessTypeId | null>(null);

  const filteredData = USE_CASE_DATA.map(cat => ({
    ...cat,
    cases: selectedType ? cat.cases.filter(uc => uc.bt.includes(selectedType)) : cat.cases,
  })).filter(cat => cat.cases.length > 0);

  const visibleCount = filteredData.reduce((s, c) => s + c.cases.length, 0);

  return (
    <section id="use-cases" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-3">
            {isPl
              ? `${TOTAL_CASES} przypadków użycia — jeden system`
              : `${TOTAL_CASES} use cases — one system`}
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            {isPl
              ? 'C-ICAS OS obsługuje codzienne operacje całej firmy. Wybierz widok lub filtruj po rodzaju działalności.'
              : 'C-ICAS OS covers your entire company operations. Browse all or filter by your business type.'}
          </p>
        </div>

        {/* View switcher */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-slate-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => { setView('all'); setSelectedType(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                view === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List size={15} />
              {isPl ? `Pełna lista (${TOTAL_CASES})` : `Full list (${TOTAL_CASES})`}
            </button>
            <button
              onClick={() => setView('filter')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                view === 'filter' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Filter size={15} />
              {isPl ? 'Filtruj po rodzaju firmy' : 'Filter by business type'}
              {selectedType && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
            </button>
          </div>
        </div>

        {/* Filter panel — only visible in filter view */}
        {view === 'filter' && (
          <div className="mb-8 bg-slate-50 rounded-2xl border border-slate-200 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 text-center">
              {isPl ? 'Wybierz rodzaj działalności' : 'Select your business type'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {BT_ALL.map(btId => {
                const meta = BT_META[btId];
                const isSelected = selectedType === btId;
                return (
                  <button
                    key={btId}
                    onClick={() => setSelectedType(isSelected ? null : btId)}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  >
                    {isPl ? meta.shortPl : meta.shortEn}
                    {isSelected && <X size={11} />}
                  </button>
                );
              })}
            </div>
            {selectedType && (
              <div className="text-center mt-4">
                <p className="text-sm text-slate-600 font-medium">
                  {isPl
                    ? <>{visibleCount} przypadków użycia dla: <strong>{BT_META[selectedType].fullPl}</strong></>
                    : <>{visibleCount} use cases for: <strong>{BT_META[selectedType].shortEn}</strong></>
                  }
                  {' · '}
                  <button onClick={() => setSelectedType(null)} className="text-indigo-600 underline hover:text-indigo-800">
                    {isPl ? 'Pokaż wszystkie' : 'Show all'}
                  </button>
                </p>
              </div>
            )}
            {!selectedType && (
              <p className="text-center text-xs text-slate-400 mt-3">
                {isPl
                  ? 'Kliknij rodzaj działalności, aby zobaczyć dopasowane przypadki użycia'
                  : 'Click a business type to see relevant use cases'}
              </p>
            )}
          </div>
        )}

        {/* Use cases grid — semantic HTML for SEO */}
        <div className="space-y-10">
          {(view === 'all' ? USE_CASE_DATA : filteredData).map(cat => {
            const colorClass = COLOR_MAP[cat.color] ?? 'text-slate-700 bg-slate-50 border-slate-200';
            const dotClass = BADGE_DOT[cat.color] ?? 'bg-slate-500';
            const cases = view === 'filter' && selectedType
              ? cat.cases.filter(uc => uc.bt.includes(selectedType))
              : cat.cases;
            if (cases.length === 0) return null;
            return (
              <div key={cat.id}>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold border ${colorClass}`}>
                    <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                    {isPl ? cat.titlePl : cat.titleEn}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{cases.length} {isPl ? 'przypadków' : 'use cases'}</span>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cases.map(uc => (
                    <article key={uc.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4 hover:border-indigo-200 hover:shadow-sm transition-all">
                      <h3 className="font-semibold text-slate-900 text-sm mb-1.5 leading-snug flex items-start gap-1.5">
                        <CheckCircle2 size={13} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                        {isPl ? uc.titlePl : uc.titleEn}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed pl-5">
                        {isPl ? uc.descPl : uc.descEn}
                      </p>
                      {view === 'all' && (
                        <div className="flex flex-wrap gap-1 mt-2 pl-5">
                          {uc.bt.slice(0, 4).map(btId => (
                            <span key={btId} className="text-[10px] px-1.5 py-0.5 bg-white border border-slate-200 text-slate-500 rounded-full">
                              {BT_META[btId].shortPl}
                            </span>
                          ))}
                          {uc.bt.length > 4 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-white border border-slate-200 text-slate-400 rounded-full">
                              +{uc.bt.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats bar */}
        <div className="mt-10 flex flex-wrap justify-center gap-6 py-6 border-t border-slate-100">
          {[
            { val: `${TOTAL_CASES}+`, labelPl: 'przypadków użycia', labelEn: 'use cases' },
            { val: `${USE_CASE_DATA.length}`, labelPl: 'obszarów funkcjonalnych', labelEn: 'functional areas' },
            { val: `${BT_ALL.length}`, labelPl: 'form prawnych', labelEn: 'business types' },
            { val: '1', labelPl: 'system dla wszystkich', labelEn: 'system for all' },
          ].map(s => (
            <div key={s.val} className="text-center">
              <div className="text-2xl font-black text-indigo-600">{s.val}</div>
              <div className="text-xs text-slate-400 font-medium">{isPl ? s.labelPl : s.labelEn}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all shadow-sm hover:shadow-lg hover:shadow-indigo-500/20"
          >
            {isPl ? 'Zacznij bezpłatnie — wszystkie moduły dostępne od razu' : 'Start free — all modules available immediately'}
          </Link>
          <p className="mt-3 text-xs text-slate-400">
            {isPl ? 'Rejestracja bezpłatna · Dane w UE · Pełna kontrola nad danymi' : 'Free registration · EU data · Full data control'}
          </p>
        </div>
      </div>
    </section>
  );
}
