/**
 * Data: 2026-05-12
 * Zmiany: Prognozy płynności ML.
 * Ścieżka: /src/modules/payments/components/CashFlowForecasting.tsx
 */
import React from 'react';
import { 
  TrendingUp, Activity, PieChart, AlertCircle, 
  ArrowUpRight, Target, Sparkles, ShieldCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';

const data = [
  { month: 'Jan', revenue: 450000, costs: 380000 },
  { month: 'Feb', revenue: 520000, costs: 410000 },
  { month: 'Mar', revenue: 480000, costs: 390000 },
  { month: 'Apr', revenue: 610000, costs: 450000 },
  { month: 'May', revenue: 590000, costs: 440000 },
  { month: 'Jun', revenue: 680000, costs: 470000, forecast: true },
  { month: 'Jul', revenue: 720000, costs: 490000, forecast: true },
  { month: 'Aug', revenue: 750000, costs: 510000, forecast: true },
];

export default function CashFlowForecasting() {
  return (
    <div className="space-y-10">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
             { label: 'Prognozowany Saldo', value: '2.4M', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
             { label: 'Burn Rate (ML)', value: '12K/day', icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50' },
             { label: 'Płynność (Quick Ratio)', value: '1.85', icon: PieChart, color: 'text-emerald-600', bg: 'bg-emerald-50' },
             { label: 'Zagrożenie Zatorami', value: 'Low', icon: ShieldCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((stat, i) => (
             <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
                <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-6`}>
                   {stat.icon && <stat.icon size={28} />}
                </div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{stat.label}</div>
                <div className="text-3xl font-black text-slate-900 italic tracking-tighter">{stat.value}</div>
             </div>
          ))}
       </div>

       <div className="bg-white rounded-[3rem] border border-slate-100 p-12 shadow-sm">
          <div className="flex justify-between items-center mb-12">
             <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">BigQuery ML Cash Flow Model</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none">Prognoza przychodów i kosztów (Next 3 Months)</p>
             </div>
             <div className="flex gap-4">
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                   <span className="text-[9px] font-black uppercase italic text-slate-400">Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 bg-rose-400 rounded-full"></div>
                   <span className="text-[9px] font-black uppercase italic text-slate-400">Costs</span>
                </div>
             </div>
          </div>

          <div className="h-[400px] w-full">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                   <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                         <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                      dy={20}
                   />
                   <YAxis hide />
                   <Tooltip 
                      contentStyle={{ 
                         backgroundColor: '#0f172a', 
                         border: 'none', 
                         borderRadius: '16px',
                         color: '#fff',
                         fontSize: '10px',
                         fontWeight: 900,
                         textTransform: 'uppercase'
                      }}
                      itemStyle={{ color: '#fff' }}
                   />
                   <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#4f46e5" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorRev)" 
                      animationDuration={2000}
                   />
                   <Area 
                      type="monotone" 
                      dataKey="costs" 
                      stroke="#fb7185" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fillOpacity={0}
                      animationDuration={2000}
                   />
                </AreaChart>
             </ResponsiveContainer>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8">
             <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
                <Sparkles size={48} className="text-indigo-400 absolute top-12 right-12 opacity-20" />
                <h4 className="text-xl font-black uppercase italic tracking-tighter mb-8">Rekomendacje AI Finance</h4>
                <div className="space-y-6">
                   {[
                      { icon: ArrowUpRight, text: 'ML wykrył sezonowy wzrost przychodów w Q3. Sugerowana optymalizacja rezerw gotówkowych.', priority: 'High' },
                      { icon: Target, text: 'Zwiększ limit kredytowy o 15% przed planowanymi wydatkami w lipcu.', priority: 'Medium' },
                      { icon: AlertCircle, text: 'Wykryto 3 potencjalne opóźnienia w płatnościach od kluczowych kontrahentów.', priority: 'Urgent' }
                   ].map((rec, i) => (
                      <div key={i} className="flex gap-6 p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                         <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            rec.priority === 'Urgent' ? 'bg-rose-500' : 'bg-indigo-600'
                         }`}>
                            <rec.icon size={24} />
                         </div>
                         <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">{rec.priority} Priority</div>
                            <p className="text-[11px] font-black italic uppercase leading-relaxed text-white/80">{rec.text}</p>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="lg:col-span-4 bg-white border border-slate-100 rounded-[3rem] p-12 shadow-sm text-center">
             <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-50">
                <Activity size={40} />
             </div>
             <h5 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-4">Accuracy Rate</h5>
             <div className="text-5xl font-black text-indigo-600 italic mb-4">94.2%</div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic leading-relaxed">System uczący się na podstawie Twoich danych z ostatnich 2 lat (Standard ML-ERP V2).</p>
          </div>
       </div>
    </div>
  );
}

