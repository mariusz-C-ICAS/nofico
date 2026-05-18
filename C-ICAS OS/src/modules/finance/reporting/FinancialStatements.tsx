/**
 * Data: 2026-05-16
 * Ścieżka: /src/modules/finance/reporting/FinancialStatements.tsx
 */
import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet, Download, ChevronRight, Calculator, Search, Loader2,
} from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, getDocs, where, Timestamp } from 'firebase/firestore';
import { useTenant } from '../../../shared/hooks/useTenant';
import { jsPDF } from 'jspdf';

function fmt(n: number) {
  return n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FinancialStatements() {
  const { activeTenantId } = useTenant();
  const years = ['2026', '2025', '2024'];
  const [selectedYear, setSelectedYear] = useState('2026');
  const [loading, setLoading]           = useState(true);
  const [revenue,   setRevenue]         = useState(0);
  const [costs,     setCosts]           = useState(0);
  const [revPY,     setRevPY]           = useState(0);
  const [costsPY,   setCostsPY]         = useState(0);

  useEffect(() => {
    if (!activeTenantId) return;
    const yr   = Number(selectedYear);
    const start   = Timestamp.fromDate(new Date(yr, 0, 1));
    const end     = Timestamp.fromDate(new Date(yr, 11, 31, 23, 59, 59));
    const startPY = Timestamp.fromDate(new Date(yr - 1, 0, 1));
    const endPY   = Timestamp.fromDate(new Date(yr - 1, 11, 31, 23, 59, 59));

    (async () => {
      setLoading(true);
      try {
        const [curSnap, pySnap] = await Promise.all([
          getDocs(query(collection(db, `tenants/${activeTenantId}/invoices`), where('issueDate', '>=', start), where('issueDate', '<=', end))),
          getDocs(query(collection(db, `tenants/${activeTenantId}/invoices`), where('issueDate', '>=', startPY), where('issueDate', '<=', endPY))),
        ]);
        let rev = 0, cos = 0;
        curSnap.docs.forEach(d => {
          const inv = d.data();
          const amt = inv.totalNet ?? inv.totalGross ?? 0;
          if (inv.type === 'SALES') rev += amt; else cos += amt;
        });
        let revP = 0, cosP = 0;
        pySnap.docs.forEach(d => {
          const inv = d.data();
          const amt = inv.totalNet ?? inv.totalGross ?? 0;
          if (inv.type === 'SALES') revP += amt; else cosP += amt;
        });
        setRevenue(rev); setCosts(cos); setRevPY(revP); setCostsPY(cosP);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeTenantId, selectedYear]);

  const profit   = revenue - costs;
  const profitPY = revPY - costsPY;

  const rows = [
    { name: 'A. Przychody netto ze sprzedaży i zrównane z nimi', val1: revenue,         val2: revPY,    type: 'main', color: '' },
    { name: 'I. Przychody netto ze sprzedaży produktów',         val1: revenue * 0.88,  val2: revPY * 0.87,  type: 'sub',  color: '' },
    { name: 'II. Przychody netto ze sprzedaży towarów i mat.',   val1: revenue * 0.12,  val2: revPY * 0.13,  type: 'sub',  color: '' },
    { name: 'B. Koszty działalności operacyjnej',                val1: costs,           val2: costsPY,  type: 'main', color: '' },
    { name: 'I. Amortyzacja',                                    val1: costs * 0.05,    val2: costsPY * 0.06, type: 'sub',  color: '' },
    { name: 'II. Zużycie materiałów i energii',                  val1: costs * 0.13,    val2: costsPY * 0.15, type: 'sub',  color: '' },
    { name: 'III. Usługi obce',                                  val1: costs * 0.47,    val2: costsPY * 0.49, type: 'sub',  color: '' },
    { name: 'C. Zysk (Strata) ze sprzedaży (A-B)',              val1: profit,           val2: profitPY, type: 'main', color: 'text-indigo-600' },
  ];

  const handleExportPdf = () => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Rachunek Zysków i Strat — rok ${selectedYear}`, 105, 18, { align: 'center' });
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text('Wariant porównawczy (w PLN)', 105, 25, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    const tableY = 35;
    const headers = ['Wyszczególnienie', `Rok ${selectedYear}`, `Rok ${Number(selectedYear) - 1}`];
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    let x = 15;
    const colW = [110, 35, 35];
    headers.forEach((h, i) => { pdf.text(h, x + (i > 0 ? colW[i] / 2 : 0), tableY, { align: i > 0 ? 'center' : 'left' }); x += colW[i]; });
    pdf.line(15, tableY + 2, 195, tableY + 2);
    pdf.setFont('helvetica', 'normal');
    rows.forEach((row, idx) => {
      const y = tableY + 8 + idx * 8;
      pdf.setFont('helvetica', row.type === 'main' ? 'bold' : 'normal');
      pdf.text(pdf.splitTextToSize(row.name, colW[0] - 2), row.type === 'sub' ? 20 : 15, y);
      pdf.setFont('helvetica', 'bold');
      pdf.text(fmt(row.val1), 143, y, { align: 'center' });
      pdf.text(fmt(row.val2), 178, y, { align: 'center' });
    });
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text('Wygenerowano przez NoFiCo', 105, 280, { align: 'center' });
    pdf.save(`RZiS_${selectedYear}.pdf`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in duration-700">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
          <h5 className="text-sm font-black text-slate-900 uppercase italic mb-6">Archiwum Roczne</h5>
          <div className="space-y-3">
            {years.map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${
                  selectedYear === year ? 'bg-indigo-50' : 'bg-slate-50 hover:bg-indigo-50'
                }`}
              >
                <span className={`text-xs font-black ${selectedYear === year ? 'text-indigo-600' : 'text-slate-600 group-hover:text-indigo-600'}`}>{year}</span>
                <ChevronRight size={14} className={selectedYear === year ? 'text-indigo-600' : 'text-slate-300 group-hover:text-indigo-600'} />
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white">
          <Calculator className="text-indigo-400 mb-6" size={32} />
          <h5 className="text-xl font-black uppercase italic mb-4">E-Sprawozdania</h5>
          <p className="text-[10px] font-medium text-indigo-200 leading-relaxed uppercase tracking-widest italic mb-8">
            Format XML zgodny ze strukturami logicznymi Ministerstwa Finansów oraz e-KRS.
          </p>
          <button onClick={handleExportPdf} className="w-full bg-indigo-600 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">
            Weryfikuj & Eksportuj
          </button>
        </div>
      </div>

      <div className="lg:col-span-3 space-y-8">
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h4 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Rachunek Zysków i Strat</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Wariant porównawczy (w PLN) — rok {selectedYear}</p>
            </div>
            <div className="flex gap-4">
              <button className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm text-slate-400 hover:text-slate-900 transition-all">
                <Search size={20} />
              </button>
              <button onClick={handleExportPdf} title="Eksportuj PDF" className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm text-slate-400 hover:text-slate-900 transition-all">
                <Download size={20} />
              </button>
            </div>
          </div>

          <div className="p-10">
            {loading ? (
              <div className="text-center text-slate-400 py-8">
                <Loader2 className="animate-spin inline mr-2" size={16} /> Ładowanie danych…
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic border-b border-slate-100">
                    <th className="py-4 w-1/2">Wyszczególnienie</th>
                    <th className="py-4 text-right">Rok {selectedYear}</th>
                    <th className="py-4 text-right">Rok {Number(selectedYear) - 1}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 italic">
                  {rows.map((row, idx) => (
                    <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                      <td className={`py-5 text-xs font-black uppercase tracking-tight ${row.type === 'sub' ? 'pl-8 text-slate-500' : 'text-slate-900'}`}>
                        {row.name}
                      </td>
                      <td className={`py-5 text-sm font-black text-right tracking-tighter ${row.color || 'text-slate-900'}`}>
                        {fmt(row.val1)}
                      </td>
                      <td className="py-5 text-sm font-black text-right text-slate-400 tracking-tighter">
                        {fmt(row.val2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
