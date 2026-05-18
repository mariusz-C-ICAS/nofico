import React, { useEffect, useState } from 'react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, orderBy, getDocs, limit, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useTenant } from '../../../shared/hooks/useTenant';
import { Search, ShieldCheck, Clock, RefreshCw, CreditCard } from 'lucide-react';
import { motion } from 'motion/react';
import PaymentInitiator from '../psd2/PaymentInitiator';

interface KsefInvoice {
  id: string;
  ksefReferenceNumber: string;
  hashSHA: string;
  issuerNip: string;
  syncedAt: { toDate: () => Date } | null;
  status: string;
}

export default function KsefInvoiceList({ type }: { type: 'purchase' | 'sales' }) {
  const { activeTenantId } = useTenant();
  const [invoices, setInvoices] = useState<KsefInvoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search,  setSearch]    = useState('');
  const [payInvoice, setPayInvoice] = useState<KsefInvoice | null>(null);

  const load = async () => {
    if (!activeTenantId) return;
    setLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, `tenants/${activeTenantId}/ksefInvoices`),
          orderBy('syncedAt', 'desc'),
          limit(200),
        )
      );
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as KsefInvoice)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [activeTenantId]);

  const filtered = invoices.filter(inv =>
    !search || inv.ksefReferenceNumber.toLowerCase().includes(search.toLowerCase()) ||
    inv.issuerNip.includes(search)
  );

  return (
    <>
    <div className="space-y-6">
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj po numerze KSeF lub NIP…"
            className="w-full bg-slate-50 border-none rounded-2xl pl-16 pr-8 py-5 text-sm font-black uppercase italic tracking-tighter"
          />
        </div>
        <div className="flex gap-4">
          <button onClick={load} className="bg-slate-50 text-slate-500 px-6 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-100 hover:bg-slate-100 flex items-center gap-2 transition-all">
            <RefreshCw size={14} />
          </button>
          <div className="bg-indigo-600 text-white px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
            <ShieldCheck size={14} />
            {type === 'purchase' ? 'Zakupowe' : 'Sprzedażowe'}
          </div>
        </div>
      </div>

      {type === 'sales' && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-8 py-5 text-xs font-semibold text-amber-700 flex items-center gap-3">
          <AlertCircle size={16} />
          Faktury sprzedażowe wysyłane są przez moduł Fakturowania. Tu widoczne są faktury zsynchronizowane z KSeF (zakupowe).
        </div>
      )}

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Numer KSeF</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">NIP Wystawcy</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hash SHA</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data synchronizacji</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              {type === 'purchase' && <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Akcja</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading && (
              <tr>
                <td colSpan={5} className="px-8 py-12 text-center text-slate-400 text-sm">
                  <RefreshCw className="animate-spin inline mr-2" size={16} />Ładowanie…
                </td>
              </tr>
            )}
            {!loading && !filtered.length && (
              <tr>
                <td colSpan={5} className="px-8 py-12 text-center text-slate-400 text-sm">
                  Brak faktur KSeF — zainicjuj sesję w zakładce Konfiguracja i poczekaj na synchronizację
                </td>
              </tr>
            )}
            {filtered.map(inv => (
              <motion.tr key={inv.id} whileHover={{ backgroundColor: 'rgba(248,250,252,0.5)' }} className="group">
                <td className="px-8 py-6">
                  <span className="text-[10px] font-mono font-black text-indigo-600 tracking-tighter">
                    {inv.ksefReferenceNumber}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <span className="text-sm font-mono font-semibold text-slate-700">{inv.issuerNip || '—'}</span>
                </td>
                <td className="px-8 py-6">
                  <span className="text-[9px] font-mono text-slate-400 truncate max-w-[120px] block" title={inv.hashSHA}>
                    {inv.hashSHA ? inv.hashSHA.slice(0, 16) + '…' : '—'}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <Clock size={12} />
                    {inv.syncedAt?.toDate?.()?.toLocaleDateString('pl-PL') ?? '—'}
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-100 inline-flex items-center gap-1.5">
                    <ShieldCheck size={11} strokeWidth={3} />
                    <span className="text-[9px] font-black uppercase tracking-widest italic">{inv.status}</span>
                  </div>
                </td>
                {type === 'purchase' && (
                  <td className="px-8 py-6">
                    <button
                      onClick={() => setPayInvoice(inv)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                    >
                      <CreditCard size={11} /> Zapłać
                    </button>
                  </td>
                )}
              </motion.tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length > 0 && (
          <div className="px-8 py-4 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
            {filtered.length} faktur
          </div>
        )}
      </div>
    </div>

    {payInvoice && (
      <PaymentInitiator
        onClose={() => setPayInvoice(null)}
        onSuccess={async () => {
          if (!activeTenantId) return;
          await updateDoc(doc(db, `tenants/${activeTenantId}/ksefInvoices`, payInvoice.id), {
            status: 'PAID', paidAt: serverTimestamp(),
          });
          setInvoices(prev => prev.map(i => i.id === payInvoice.id ? { ...i, status: 'PAID' } : i));
        }}
        invoice={{
          id: payInvoice.id,
          number: payInvoice.ksefReferenceNumber,
          amount: 0,
          counterpart: payInvoice.issuerNip,
          iban: '',
        }}
      />
    )}
    </>
  );
}
