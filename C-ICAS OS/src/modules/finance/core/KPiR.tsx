import React, { useState, useEffect } from 'react';
import {
  FileText, Printer, ArrowUpRight, ArrowDownLeft,
  Calculator, Calendar, ChevronLeft, ChevronRight, Loader2, MoreHorizontal,
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, getDocs, where, orderBy, Timestamp } from 'firebase/firestore';
import { useTenant } from '../../../shared/hooks/useTenant';

interface KPiREntry {
  lp:          number;
  date:        string;
  docNo:       string;
  contractor:  string;
  description: string;
  col7:        number;
  col13:       number;
}

const MONTHS = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];

const columns = [
  { id: 1,  name: 'Lp.'                     },
  { id: 2,  name: 'Data zdarzenia'           },
  { id: 3,  name: 'Nr dowodu'               },
  { id: 4,  name: 'Kontrahent'              },
  { id: 5,  name: 'Adres'                   },
  { id: 6,  name: 'Opis'                    },
  { id: 7,  name: 'Przychód (Wartość)'      },
  { id: 8,  name: 'Pozostałe'              },
  { id: 9,  name: 'Razem Przychód (7+8)'   },
  { id: 10, name: 'Zakup tow. hand.'        },
  { id: 11, name: 'Koszty uboczne'          },
  { id: 12, name: 'Wynagrodzenia'           },
  { id: 13, name: 'Pozostałe wydatki'       },
  { id: 14, name: 'Inwestycje'              },
  { id: 15, name: 'Inne'                    },
  { id: 16, name: 'Uwagi'                   },
];

export default function KPiR() {
  const { activeTenantId } = useTenant();
  const now = new Date();
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [year,       setYear]       = useState(now.getFullYear());
  const [entries,    setEntries]    = useState<KPiREntry[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!activeTenantId) return;
    const start = Timestamp.fromDate(new Date(year, monthIndex, 1));
    const end   = Timestamp.fromDate(new Date(year, monthIndex + 1, 0, 23, 59, 59));
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(
          collection(db, `tenants/${activeTenantId}/invoices`),
          where('issueDate', '>=', start),
          where('issueDate', '<=', end),
          orderBy('issueDate'),
        ));
        setEntries(snap.docs.map((d, i) => {
          const inv    = d.data();
          const isSale = inv.type === 'SALES';
          const amt    = inv.totalNet ?? inv.totalGross ?? 0;
          return {
            lp:          i + 1,
            date:        inv.issueDate?.toDate?.()?.toLocaleDateString('pl-PL') ?? '—',
            docNo:       inv.invoiceNumber ?? inv.number ?? d.id.slice(0, 8),
            contractor:  inv.sellerName ?? inv.customerName ?? inv.counterpartName ?? '—',
            description: inv.subject ?? inv.description ?? '—',
            col7:        isSale ? amt : 0,
            col13:       !isSale ? amt : 0,
          };
        }));
      } finally {
        setLoading(false);
      }
    })();
  }, [activeTenantId, monthIndex, year]);

  const totalRev  = entries.reduce((s, e) => s + e.col7, 0);
  const totalCost = entries.reduce((s, e) => s + e.col13, 0);
  const income    = totalRev - totalCost;

  const prevMonth = () => { if (monthIndex === 0) { setMonthIndex(11); setYear(y => y - 1); } else setMonthIndex(m => m - 1); };
  const nextMonth = () => { if (monthIndex === 11) { setMonthIndex(0);  setYear(y => y + 1); } else setMonthIndex(m => m + 1); };

  const fmt = (n: number) => n.toLocaleString('pl-PL', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic flex items-center gap-2">
            <FileText className="text-indigo-600" size={20} /> Podatkowa Księga Przychodów i Rozchodów
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Ewidencja uproszczona (JDG) • Zgodna z Rozp. MF</p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl px-4 py-2 shadow-sm">
            <button onClick={prevMonth} className="text-slate-400 hover:text-slate-700 p-1"><ChevronLeft size={16} /></button>
            <span className="text-sm font-black text-slate-900 uppercase italic min-w-[140px] text-center">{MONTHS[monthIndex]} {year}</span>
            <button onClick={nextMonth} className="text-slate-400 hover:text-slate-700 p-1"><ChevronRight size={16} /></button>
          </div>
          <button className="bg-white text-slate-500 px-6 py-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
            <Printer size={16} /> Drukuj KPiR
          </button>
          <button className="bg-slate-900 text-white px-8 py-3 rounded-xl shadow-xl hover:bg-indigo-600 transition-all text-[10px] font-black uppercase tracking-widest">
            Zamknij Miesiąc
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-emerald-600 rounded-[2rem] p-8 text-white shadow-xl shadow-emerald-100 flex flex-col justify-between">
          <ArrowUpRight className="opacity-40 mb-4" size={24} />
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Przychód (Razem)</div>
            <div className="text-3xl font-black tracking-tighter italic leading-none">{loading ? '…' : fmt(totalRev)}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-40 mt-1">Kolumna 7 + 8</div>
          </div>
        </div>
        <div className="bg-rose-600 rounded-[2rem] p-8 text-white shadow-xl shadow-rose-100 flex flex-col justify-between">
          <ArrowDownLeft className="opacity-40 mb-4" size={24} />
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Koszty (Razem)</div>
            <div className="text-3xl font-black tracking-tighter italic leading-none">{loading ? '…' : fmt(totalCost)}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-40 mt-1">Kolumna 10-13</div>
          </div>
        </div>
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
          <Calculator className="text-indigo-600 mb-4" size={24} />
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Dochód Miesięczny</div>
            <div className={`text-3xl font-black tracking-tighter italic leading-none ${income < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{loading ? '…' : fmt(income)}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mt-1">Przychód − Koszty</div>
          </div>
        </div>
        <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 flex flex-col justify-between">
          <Calendar className="text-slate-400 mb-4" size={24} />
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pozycji</div>
            <div className="text-3xl font-black tracking-tighter italic leading-none text-slate-600">{loading ? '…' : entries.length}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mt-1 italic">wpisów w księdze</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm overflow-x-auto">
        <div className="min-w-[1400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 divide-x divide-slate-100">
                {columns.map(col => (
                  <th key={col.id} className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center leading-tight">
                    {col.id}.<br />{col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && (
                <tr><td colSpan={16} className="px-4 py-8 text-center text-slate-400 text-sm">
                  <Loader2 className="animate-spin inline mr-2" size={16} /> Ładowanie…
                </td></tr>
              )}
              {!loading && !entries.length && (
                <tr><td colSpan={16} className="px-4 py-8 text-center text-slate-400 text-sm">
                  Brak faktur za {MONTHS[monthIndex]} {year}
                </td></tr>
              )}
              {entries.map(entry => (
                <tr key={entry.lp} className="hover:bg-slate-50/50 transition-colors divide-x divide-slate-50">
                  <td className="px-4 py-3 text-[10px] font-black text-slate-300 text-center">{entry.lp}</td>
                  <td className="px-4 py-3 text-[10px] font-black text-slate-900 text-center">{entry.date}</td>
                  <td className="px-4 py-3 text-[10px] font-black text-indigo-600 uppercase italic text-center">{entry.docNo}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-800 uppercase italic" colSpan={2}>{entry.contractor}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-600 uppercase italic">{entry.description}</td>
                  <td className="px-4 py-3 text-[11px] font-black text-slate-900 text-right italic">{entry.col7 > 0 ? fmt(entry.col7) : '-'}</td>
                  <td className="px-4 py-3 text-[11px] font-black text-slate-900 text-right italic">-</td>
                  <td className="px-4 py-3 text-[11px] font-black text-slate-900 text-right italic">{entry.col7 > 0 ? fmt(entry.col7) : '-'}</td>
                  <td className="px-4 py-3 text-[11px] font-black text-slate-900 text-right italic">-</td>
                  <td className="px-4 py-3 text-[11px] font-black text-slate-900 text-right italic">-</td>
                  <td className="px-4 py-3 text-[11px] font-black text-slate-900 text-right italic">-</td>
                  <td className="px-4 py-3 text-[11px] font-black text-slate-900 text-right italic">{entry.col13 > 0 ? fmt(entry.col13) : '-'}</td>
                  <td className="px-4 py-3 text-[11px] font-black text-slate-900 text-right italic">-</td>
                  <td className="px-4 py-3 text-center" colSpan={2}>
                    <MoreHorizontal size={14} className="text-slate-300 mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
            {entries.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white divide-x divide-slate-800">
                  <td colSpan={6} className="px-4 py-6 text-xs font-black uppercase tracking-widest italic text-right">Suma strony / Podsumowanie miesięczne</td>
                  <td className="px-4 py-6 text-xs font-black text-right italic">{fmt(totalRev)}</td>
                  <td className="px-4 py-6 text-xs font-black text-right italic">0.00</td>
                  <td className="px-4 py-6 text-xs font-black text-right italic">{fmt(totalRev)}</td>
                  <td className="px-4 py-6 text-xs font-black text-right italic">0.00</td>
                  <td className="px-4 py-6 text-xs font-black text-right italic">0.00</td>
                  <td className="px-4 py-6 text-xs font-black text-right italic">0.00</td>
                  <td className="px-4 py-6 text-xs font-black text-right italic">{fmt(totalCost)}</td>
                  <td className="px-4 py-6 text-xs font-black text-right italic">0.00</td>
                  <td className="bg-slate-800 px-4 py-6" colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
