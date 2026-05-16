/**
 * Data: 2026-05-12
 * Zmiany: Dashboard analityczny (BI) z wykresami Recharts.
 * Ścieżka: /src/modules/finance/reporting/BusinessIntelligence.tsx
 */
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area,
  LineChart, Line, Cell
} from 'recharts';
import { 
  Sparkles, TrendingUp, Filter, RefreshCw, 
  ArrowUpRight, ArrowDownLeft, Info
} from 'lucide-react';

const data = [
  { name: 'Jan', sales: 4000, costs: 2400, cash: 10000 },
  { name: 'Feb', sales: 3000, costs: 1398, cash: 12000 },
  { name: 'Mar', sales: 2000, costs: 9800, cash: 8000 },
  { name: 'Apr', sales: 2780, costs: 3908, cash: 9500 },
  { name: 'May', sales: 1890, costs: 4800, cash: 11000 },
  { name: 'Jun', sales: 2390, costs: 3800, cash: 12500 },
];

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

export default function BusinessIntelligence() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm relative overflow-hidden group">
             <div className="flex justify-between items-center mb-10">
                <div>
                   <h4 className="text-xl font-black text-slate-900 uppercase italic">Cash Flow Forecast</h4>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">AI Powered Prediction (Next 30 days)</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-2xl">
                   <Sparkles className="text-indigo-600" size={24} />
                </div>
             </div>
             
             <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={data}>
                      <defs>
                        <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} 
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                      />
                      <Area type="monotone" dataKey="cash" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorCash)" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm relative overflow-hidden group">
             <div className="flex justify-between items-center mb-10">
                <div>
                   <h4 className="text-xl font-black text-slate-900 uppercase italic">Margin Analysis</h4>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Sales vs Operational Costs</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl">
                   <TrendingUp className="text-emerald-600" size={24} />
                </div>
             </div>
             
             <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={data} barGap={12}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} 
                      />
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: '900' }}
                      />
                      <Bar dataKey="sales" fill="#6366f1" radius={[8, 8, 8, 8]} barSize={20} />
                      <Bar dataKey="costs" fill="#f43f5e" radius={[8, 8, 8, 8]} barSize={20} />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white md:col-span-2">
             <div className="flex justify-between items-start mb-8">
                <div>
                   <h5 className="text-2xl font-black uppercase italic tracking-tighter mb-1">Looker AI Dashboard</h5>
                   <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest italic leading-none">Automatyczna korelacja BigQuery x Firestore</p>
                </div>
                <Info size={18} className="text-indigo-400" />
             </div>
             
             <div className="grid grid-cols-2 gap-8 mt-10">
                <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10">
                   <div className="text-[9px] font-black text-indigo-300 uppercase mb-2 italic">Średni Czas Zapłaty (DSO)</div>
                   <div className="text-3xl font-black italic tracking-tighter">14.2 <span className="text-xs text-slate-400">dni</span></div>
                </div>
                <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10">
                   <div className="text-[9px] font-black text-indigo-300 uppercase mb-2 italic">Zaległości Tax Rezerwa</div>
                   <div className="text-3xl font-black italic tracking-tighter text-emerald-400">82% <span className="text-xs text-slate-400">coverage</span></div>
                </div>
             </div>
          </div>
          
          <div className="bg-indigo-600 rounded-[3rem] p-10 text-white flex flex-col justify-between">
             <TrendingUp size={32} strokeWidth={3} className="mb-6" />
             <div>
                <h5 className="text-2xl font-black uppercase italic tracking-tighter mb-4">Wartość Firmy (Equity)</h5>
                <div className="text-5xl font-black italic tracking-tighter mb-2">2.4M</div>
                <div className="text-[10px] font-black text-indigo-200 uppercase tracking-widest italic">Estymacja na bazia EBITDA x4</div>
             </div>
          </div>
       </div>
    </div>
  );
}
