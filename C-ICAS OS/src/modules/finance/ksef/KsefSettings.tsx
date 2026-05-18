import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../../shared/lib/firebase';
import app from '../../../shared/lib/firebase';
import { useTenant } from '../../../shared/hooks/useTenant';
import { Activity, Key, CheckCircle2, AlertCircle, Loader2, RefreshCw, Cloud, CloudOff } from 'lucide-react';

interface KsefConfig {
  nip?: string;
  sessionToken?: string;
  sessionStartedAt?: { toDate: () => Date };
  environment?: 'test' | 'prod';
}

export default function KsefSettings() {
  const { activeTenantId } = useTenant();
  const [config, setConfig]   = useState<KsefConfig | null>(null);
  const [nip,    setNip]      = useState('');
  const [token,  setToken]    = useState('');
  const [saving, setSaving]   = useState(false);
  const [result, setResult]   = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!activeTenantId) return;
    return onSnapshot(doc(db, 'tenants', activeTenantId), snap => {
      const d = snap.data();
      setConfig(d?.ksefConfig ?? null);
      if (!nip) setNip(d?.ksefConfig?.nip ?? d?.nip ?? '');
    });
  }, [activeTenantId]);

  const initSession = async () => {
    if (!nip.trim() || !token.trim()) return;
    setSaving(true);
    setResult(null);
    try {
      const idToken   = await auth.currentUser?.getIdToken();
      const projectId = (app as any).options.projectId as string;
      const cfUrl     = `https://europe-west1-${projectId}.cloudfunctions.net/ksefInitSession`;
      const resp = await fetch(cfUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body:    JSON.stringify({ tenantId: activeTenantId, nip: nip.trim(), apiToken: token.trim() }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setResult({ ok: true, msg: `Sesja KSeF aktywna. Token: ${data.preview}` });
        setToken('');
      } else {
        setResult({ ok: false, msg: data.error ?? 'Błąd inicjalizacji sesji' });
      }
    } catch (err: any) {
      setResult({ ok: false, msg: err.message ?? 'Nieznany błąd' });
    } finally {
      setSaving(false);
    }
  };

  const sessionDate = config?.sessionStartedAt?.toDate?.()?.toLocaleDateString('pl-PL') ?? '—';

  return (
    <div className="max-w-2xl space-y-6">

      {/* Status sesji */}
      <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic mb-6 flex items-center gap-3">
          <Activity className="text-indigo-500" size={18} />
          Status sesji KSeF
        </h3>
        {config?.sessionToken ? (
          <div className="flex items-start gap-3 text-emerald-600">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold">Sesja aktywna</p>
              <p className="text-xs text-slate-500 mt-1">
                Środowisko: <span className="font-semibold">{config.environment ?? 'test'}</span>
                {' · '}NIP: <span className="font-semibold font-mono">{config.nip ?? '—'}</span>
                {' · '}Uruchomiono: <span className="font-semibold">{sessionDate}</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-amber-600">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-sm font-medium">Brak aktywnej sesji — skonfiguruj poniżej</p>
          </div>
        )}
      </div>

      {/* Inicjalizacja sesji */}
      <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-5">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic flex items-center gap-3">
          <Key className="text-indigo-500" size={18} />
          Inicjalizacja sesji tokenem
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Wprowadź NIP firmy i token API z panelu bramki KSeF (test lub prod).
          Token służy wyłącznie do uzyskania tokenu sesji — nie jest zapisywany.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">NIP</label>
            <input
              type="text"
              value={nip}
              onChange={e => setNip(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="1234567890"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Token API KSeF</label>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Token z panelu MF / bramki KSeF"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        {result && (
          <div className={`flex items-center gap-2 p-4 rounded-xl text-sm font-medium ${result.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
            {result.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {result.msg}
          </div>
        )}

        <button
          onClick={initSession}
          disabled={!nip || !token || saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-widest px-8 py-4 rounded-xl transition-all"
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          {saving ? 'Inicjalizuję…' : 'Zainicjuj sesję KSeF'}
        </button>
      </div>

      {/* Środowisko */}
      <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 flex items-center gap-4 text-xs text-slate-500">
        {config?.environment === 'prod'
          ? <Cloud className="text-emerald-500 shrink-0" size={18} />
          : <CloudOff className="text-amber-500 shrink-0" size={18} />
        }
        <div>
          <span className="font-bold text-slate-700">
            {config?.environment === 'prod' ? 'Środowisko produkcyjne' : 'Środowisko testowe (ksef-test.mf.gov.pl)'}
          </span>
          <br />
          Zmień zmienną KSEF_URL w konfiguracji Cloud Functions, aby przełączyć środowisko.
        </div>
      </div>
    </div>
  );
}
