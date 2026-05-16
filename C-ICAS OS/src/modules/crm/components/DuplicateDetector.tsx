import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Merge, Building2, CheckCircle2, Trash2 } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface Props { tenantId: string }

interface DuplicateGroup {
  reason: 'nip' | 'name';
  key: string;
  customers: any[];
}

function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/sp\. z o\.o\.?/g, 'sp zoo')
    .replace(/spółka z ograniczoną odpowiedzialnością/g, 'sp zoo')
    .replace(/s\.a\.?$/g, 'sa')
    .replace(/[.,\-]/g, '')
    .trim();
}

function findDuplicates(customers: any[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];

  // NIP duplicates (exact match, ignoring empty)
  const byNip: Record<string, any[]> = {};
  customers.forEach(c => {
    const nip = c.nip?.replace(/\D/g, '');
    if (nip && nip.length >= 10) {
      if (!byNip[nip]) byNip[nip] = [];
      byNip[nip].push(c);
    }
  });
  Object.entries(byNip).forEach(([nip, custs]) => {
    if (custs.length > 1) groups.push({ reason: 'nip', key: nip, customers: custs });
  });

  // Name duplicates (normalized)
  const byName: Record<string, any[]> = {};
  customers.forEach(c => {
    if (!c.name) return;
    const key = normalize(c.name);
    if (!byName[key]) byName[key] = [];
    byName[key].push(c);
  });
  Object.entries(byName).forEach(([key, custs]) => {
    if (custs.length > 1) {
      // Only flag if not already flagged by NIP
      const nipsMatch = custs.every(c => c.nip && custs[0].nip === c.nip);
      if (!nipsMatch) groups.push({ reason: 'name', key, customers: custs });
    }
  });

  return groups;
}

export default function DuplicateDetector({ tenantId }: Props) {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  const scan = async () => {
    setLoading(true);
    const snap = await getDocs(query(collection(db, 'customers'), where('tenantId', '==', tenantId)));
    const customers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setGroups(findDuplicates(customers));
    setLoading(false);
  };

  useEffect(() => { scan(); }, [tenantId]);

  // Merge: keep primary (most data), delete others, update totalRevenue sum
  const handleMerge = async (group: DuplicateGroup) => {
    setMerging(group.key);
    try {
      // Primary = first (most complete: most fields filled)
      const primary = [...group.customers].sort((a, b) => {
        const scoreA = Object.values(a).filter(Boolean).length;
        const scoreB = Object.values(b).filter(Boolean).length;
        return scoreB - scoreA;
      })[0];

      const mergedRevenue = group.customers.reduce((s, c) => s + (c.totalRevenue ?? 0), 0);
      const mergedTags = Array.from(new Set(group.customers.flatMap(c => c.tags ?? [])));

      await updateDoc(doc(db, 'customers', primary.id), {
        totalRevenue: mergedRevenue,
        tags: mergedTags,
        updatedAt: serverTimestamp(),
      });

      // Delete duplicates
      await Promise.all(
        group.customers
          .filter(c => c.id !== primary.id)
          .map(c => deleteDoc(doc(db, 'customers', c.id)))
      );

      setResolved(prev => new Set([...prev, group.key]));
    } finally {
      setMerging(null);
    }
  };

  const handleDismiss = (key: string) => setResolved(prev => new Set([...prev, key]));

  const visible = groups.filter(g => !resolved.has(g.key));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Wykrywanie Duplikatów</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {visible.length > 0 ? `${visible.length} grup duplikatów wykrytych` : 'Brak duplikatów'}
          </p>
        </div>
        <button onClick={scan} disabled={loading}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-black text-xs uppercase tracking-widest">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Skanuj ponownie
        </button>
      </div>

      {loading && <div className="flex justify-center py-10"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>}

      {!loading && visible.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-400" />
          <p className="text-sm font-black uppercase tracking-widest">Brak duplikatów</p>
        </div>
      )}

      <div className="space-y-4">
        {visible.map(group => (
          <div key={group.key} className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
            <div className="bg-amber-50 px-5 py-3 flex items-center gap-3 border-b border-amber-200">
              <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-black text-slate-800">
                  {group.reason === 'nip' ? `Duplikat NIP: ${group.key}` : `Podobna nazwa: "${group.key}"`}
                </p>
                <p className="text-[10px] text-slate-500">{group.customers.length} rekordów</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleMerge(group)} disabled={merging === group.key}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] px-3 py-1.5 rounded-xl">
                  {merging === group.key ? <RefreshCw size={10} className="animate-spin" /> : <Merge size={10} />}
                  Scal
                </button>
                <button onClick={() => handleDismiss(group.key)}
                  className="text-[10px] font-black text-slate-400 hover:text-slate-600 px-2 py-1.5">
                  Ignoruj
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {group.customers.map((cust, i) => (
                <div key={cust.id} className="px-5 py-3 flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${i === 0 ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                    <Building2 size={12} className={i === 0 ? 'text-indigo-600' : 'text-slate-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">{cust.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {[cust.nip && `NIP: ${cust.nip}`, cust.email, cust.city].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {cust.totalRevenue > 0 && (
                      <p className="text-[10px] font-black text-emerald-700">{(cust.totalRevenue as number).toLocaleString('pl-PL')} PLN</p>
                    )}
                    {i === 0 && <p className="text-[8px] font-black text-indigo-600 uppercase">Podstawowy</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-2 bg-slate-50 border-t border-slate-100">
              <p className="text-[9px] text-slate-400">Scal: zachowa rekord z największą ilością danych, zsumuje przychody, połączy tagi.</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
