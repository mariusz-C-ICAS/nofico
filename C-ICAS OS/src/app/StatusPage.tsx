import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Server, Database, Globe, CheckCircle2, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { db } from '../shared/lib/firebase';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';

type ServiceStatus = 'checking' | 'operational' | 'degraded';

interface Service {
  name: string;
  label: string;
  url: string;
  icon: React.ReactNode;
}

const SERVICES: Service[] = [
  { name: 'app',      label: 'Firebase Hosting',      url: 'https://app-c-icas-os.web.app',                       icon: <Server size={20} /> },
  { name: 'ksef',     label: 'KSeF Test API',         url: 'https://ksef-test.mf.gov.pl/api/online',              icon: <Globe size={20} /> },
  { name: 'nbp',      label: 'NBP Kursy Walut API',   url: 'https://api.nbp.pl/api/exchangerates/tables/A/?format=json', icon: <Globe size={20} /> },
];

async function pingService(url: string): Promise<ServiceStatus> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: ctrl.signal });
    clearTimeout(t);
    // no-cors returns opaque response (type='opaque') — network reachable = operational
    return r.type === 'opaque' || r.ok ? 'operational' : 'degraded';
  } catch {
    return 'degraded';
  }
}

export default function StatusPage() {
  const [dbStatus, setDbStatus]       = useState<ServiceStatus>('checking');
  const [svcStatus, setSvcStatus]     = useState<Record<string, ServiceStatus>>({});
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [sysTime, setSysTime]         = useState(new Date().toISOString());
  const [refreshing, setRefreshing]   = useState(false);

  const checkAll = useCallback(async () => {
    setRefreshing(true);
    setSvcStatus(Object.fromEntries(SERVICES.map(s => [s.name, 'checking'])));
    const results = await Promise.all(SERVICES.map(s => pingService(s.url).then(st => [s.name, st] as const)));
    setSvcStatus(Object.fromEntries(results));
    setLastChecked(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const un = onSnapshot(query(collection(db, 'system_logs'), limit(1)), {
      next: () => setDbStatus('operational'),
      error: () => setDbStatus('degraded'),
    });
    const clock = setInterval(() => setSysTime(new Date().toISOString()), 1000);
    checkAll();
    return () => { un(); clearInterval(clock); };
  }, [checkAll]);

  const allStatuses = [dbStatus, ...Object.values(svcStatus)];
  const overallOk   = allStatuses.every(s => s === 'operational');
  const anyChecking = allStatuses.some(s => s === 'checking');

  function StatusBadge({ status }: { status: ServiceStatus }) {
    if (status === 'checking') return <span className="text-[10px] font-black uppercase text-slate-400 italic">Checking...</span>;
    return (
      <div className={`flex items-center gap-1.5 ${status === 'operational' ? 'text-emerald-600' : 'text-rose-600'}`}>
        {status === 'operational' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
        <span className="font-black uppercase italic text-[10px]">
          {status === 'operational' ? 'Operational' : 'Degraded'}
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="w-full max-w-3xl bg-white rounded-[3rem] shadow-2xl border border-slate-200 p-12">

        <div className="flex justify-between items-start mb-10 border-b border-slate-100 pb-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-4">
              <Activity size={36} className={anyChecking ? 'text-slate-300' : overallOk ? 'text-emerald-500 animate-pulse' : 'text-rose-500'} />
              Status Systemu
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">C-ICAS OS • Real-Time Health Check</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-sm font-bold text-slate-900 border border-slate-200 px-4 py-2 rounded-xl inline-flex items-center gap-2">
              <Clock size={16} className="text-indigo-500" /> {sysTime}
            </div>
            {lastChecked && (
              <div className="text-[9px] text-slate-400 font-bold">
                Ostatni check: {lastChecked.toLocaleTimeString('pl-PL')}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 mb-10">
          {/* Firestore */}
          <div className="flex items-center justify-between p-5 rounded-2xl border border-slate-100 bg-slate-50">
            <div className="flex items-center gap-3 text-slate-600">
              <Database size={20} />
              <div>
                <div className="text-[11px] font-black text-slate-800 uppercase italic">Firestore Database</div>
                <div className="text-[9px] text-slate-400 font-bold">app-c-icas-os.firebaseio.com</div>
              </div>
            </div>
            <StatusBadge status={dbStatus} />
          </div>

          {/* External services */}
          {SERVICES.map(svc => (
            <div key={svc.name} className="flex items-center justify-between p-5 rounded-2xl border border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3 text-slate-600">
                {svc.icon}
                <div>
                  <div className="text-[11px] font-black text-slate-800 uppercase italic">{svc.label}</div>
                  <div className="text-[9px] text-slate-400 font-bold">{svc.url}</div>
                </div>
              </div>
              <StatusBadge status={svcStatus[svc.name] ?? 'checking'} />
            </div>
          ))}
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100 flex justify-between items-center">
          <button
            onClick={checkAll}
            disabled={refreshing}
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Odśwież
          </button>
          <a href="/" className="px-8 py-3 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-colors shadow-xl">
            Wróć do aplikacji
          </a>
        </div>
      </div>
    </div>
  );
}
