import React, { useState, useEffect } from 'react';
import { Activity, Server, Database, Globe, CheckCircle2, AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { db } from '../shared/lib/firebase';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';

const UPPTIME_API = 'https://raw.githubusercontent.com/mariusz-C-ICAS/c-icas-os-status/master/history/summary.json';
const UPPTIME_URL = 'https://mariusz-C-ICAS.github.io/c-icas-os-status';

interface UptimeSite {
  name: string;
  url: string;
  status: 'up' | 'down' | 'degraded';
  uptime: string;
  time: number;
}

export default function StatusPage() {
  const [dbStatus, setDbStatus] = useState<'checking' | 'operational' | 'degraded'>('checking');
  const [sysTime, setSysTime] = useState(new Date().toISOString());
  const [uptimeSites, setUptimeSites] = useState<UptimeSite[]>([]);
  const [uptimeLoading, setUptimeLoading] = useState(true);

  useEffect(() => {
    const un = onSnapshot(query(collection(db, 'system_logs'), limit(1)), {
      next: () => setDbStatus('operational'),
      error: () => setDbStatus('degraded'),
    });
    const clock = setInterval(() => setSysTime(new Date().toISOString()), 1000);
    return () => { un(); clearInterval(clock); };
  }, []);

  useEffect(() => {
    fetch(UPPTIME_API)
      .then(r => r.json())
      .then((data: UptimeSite[]) => { setUptimeSites(data); setUptimeLoading(false); })
      .catch(() => setUptimeLoading(false));
  }, []);

  const overallOk = !uptimeLoading && uptimeSites.length > 0
    ? uptimeSites.every(s => s.status === 'up')
    : dbStatus === 'operational';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-[3rem] shadow-2xl border border-slate-200 p-12">

        <div className="flex justify-between items-start mb-12 border-b border-slate-100 pb-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-4">
              <Activity size={36} className={overallOk ? 'text-emerald-500 animate-pulse' : 'text-amber-500'} />
              Status Systemu
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">C-ICAS OS • Real-Time Diagnostics</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-slate-900 border border-slate-200 px-4 py-2 rounded-xl inline-flex items-center gap-2">
              <Clock size={16} className="text-indigo-500" /> {sysTime}
            </div>
          </div>
        </div>

        {/* Firestore ping */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-3xl border border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3 mb-4 text-slate-600">
              <Database size={20} />
              <h3 className="font-bold uppercase tracking-widest text-[10px]">Database (Firestore)</h3>
            </div>
            <div className={`flex items-center gap-2 ${dbStatus === 'operational' ? 'text-emerald-600' : 'text-amber-500'}`}>
              {dbStatus === 'operational' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <span className="font-black italic uppercase">
                {dbStatus === 'checking' ? 'Checking...' : dbStatus}
              </span>
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4 text-slate-600">
              <Server size={20} />
              <h3 className="font-bold uppercase tracking-widest text-[10px]">Upptime Monitoring</h3>
            </div>
            <a
              href={UPPTIME_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <ExternalLink size={13} /> Pełna strona statusu
            </a>
          </div>
        </div>

        {/* Upptime sites */}
        <div className="mb-8">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Monitorowane usługi (GitHub Upptime)</div>
          {uptimeLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : uptimeSites.length === 0 ? (
            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 text-[11px] font-bold text-amber-700">
              Dane upptime będą dostępne po pierwszym uruchomieniu GitHub Actions (~5 min).
              <a href={UPPTIME_URL} target="_blank" rel="noopener noreferrer" className="ml-2 text-indigo-600 underline">
                Sprawdź status repo →
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {uptimeSites.map(site => (
                <div key={site.name} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-3">
                    {site.status === 'up'
                      ? <CheckCircle2 size={16} className="text-emerald-500" />
                      : <AlertTriangle size={16} className="text-rose-500" />}
                    <div>
                      <div className="text-[11px] font-black text-slate-800 uppercase italic">{site.name}</div>
                      <div className="text-[9px] text-slate-400 font-bold">{site.url}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-[10px] font-black uppercase ${site.status === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {site.status === 'up' ? 'Operational' : site.status}
                    </div>
                    {site.uptime && (
                      <div className="text-[9px] text-slate-400 font-bold">{site.uptime} uptime</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100 flex justify-between items-center">
          <a
            href={UPPTIME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-1"
          >
            <Globe size={12} /> mariusz-C-ICAS/c-icas-os-status
          </a>
          <a href="/" className="px-8 py-3 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-colors shadow-xl">
            Wróć do aplikacji
          </a>
        </div>
      </div>
    </div>
  );
}
