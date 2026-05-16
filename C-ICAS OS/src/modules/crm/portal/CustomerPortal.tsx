/**
 * Data: 2026-05-12
 * Zmiany: Portal kontrahenta - widok dla klienta zewnętrznego.
 * Ścieżka: /src/modules/crm/portal/CustomerPortal.tsx
 */
import React from 'react';
import { 
  FileText, Download, CreditCard, 
  Settings, LogOut, Bell, LayoutDashboard,
  Clock, ShieldCheck
} from 'lucide-react';

export default function CustomerPortal() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100">
       {/* Sidebar */}
       <aside className="fixed left-0 top-0 bottom-0 w-80 bg-white border-r border-slate-100 p-10 z-50">
          <div className="flex items-center gap-3 mb-20 px-4">
             <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black italic">P</div>
             <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Portal Klienta</h2>
          </div>

          <nav className="space-y-2">
             {[
                { label: 'Dashboard', icon: LayoutDashboard, active: true },
                { label: 'Moje Faktury', icon: FileText },
                { label: 'Płatności', icon: CreditCard },
                { label: 'Moje Dane', icon: Settings },
             ].map(item => (
                <button 
                   key={item.label}
                   className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${
                     item.active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                   }`}
                >
                   <item.icon size={18} />
                   {item.label}
                </button>
             ))}
          </nav>

          <button className="absolute bottom-10 left-10 right-10 flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 transition-all">
             <LogOut size={18} /> Wyloguj
          </button>
       </aside>

       {/* Main Content */}
       <main className="pl-80 p-20">
          <div className="max-w-6xl mx-auto space-y-12">
             <div className="flex justify-between items-center">
                <div>
                   <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Witamy, Acme Corp!</h1>
                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Twoja strefa NoFiCo Cloud</p>
                </div>
                <div className="flex gap-4">
                   <button className="bg-white p-4 rounded-2xl border border-slate-100 text-slate-400 hover:text-indigo-600 transition-all relative">
                      <Bell size={20} />
                      <div className="absolute top-3 right-3 w-3 h-3 bg-rose-500 rounded-full border-2 border-white"></div>
                   </button>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                   <Clock className="text-amber-500 mb-6" size={32} />
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Do zapłaty</div>
                   <div className="text-3xl font-black text-slate-900 italic">4,200.00 <span className="text-sm">PLN</span></div>
                </div>
                <div className="bg-emerald-600 p-10 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100">
                   <ShieldCheck className="text-emerald-200 mb-6" size={32} />
                   <div className="text-[10px] font-black text-emerald-200 uppercase tracking-widest mb-1 italic">Status Konta</div>
                   <div className="text-2xl font-black uppercase italic">Zweryfikowany</div>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                   <FileText className="text-indigo-500 mb-6" size={32} />
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Ostatnia Faktura</div>
                   <div className="text-xl font-black text-slate-900 italic">FV/2026/05/122</div>
                </div>
             </div>

             <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-12">
                <h3 className="text-xl font-black text-slate-900 uppercase italic mb-10 tracking-tighter">Ostatnie Dokumenty</h3>
                <div className="space-y-4">
                   {[
                      { nr: 'FV/2026/05/122', date: '2026-05-12', amount: '1,200 PLN', status: 'Paid' },
                      { nr: 'FV/2026/04/098', date: '2026-04-10', amount: '3,000 PLN', status: 'Pending' },
                   ].map(doc => (
                      <div key={doc.nr} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all group">
                         <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-300 group-hover:text-indigo-600 transition-colors">
                               <FileText size={24} />
                            </div>
                            <div>
                               <div className="text-sm font-black text-slate-900 italic uppercase">{doc.nr}</div>
                               <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{doc.date}</div>
                            </div>
                         </div>
                         <div className="flex items-center gap-8">
                            <span className="text-sm font-black italic">{doc.amount}</span>
                            <div className={`px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                               doc.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                               {doc.status}
                            </div>
                            <button className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all">
                               <Download size={18} />
                            </button>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>
       </main>
    </div>
  );
}
