import React, { useEffect, useState } from 'react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { GrantCost, GrantProject, GrantCostCategory } from '../types';
import { CheckCircle2, XCircle } from 'lucide-react';

const CATEGORY_LABELS: Record<GrantCostCategory, string> = {
  PERSONAL:       'Koszty osobowe',
  EQUIPMENT:      'Wyposażenie',
  SUBCONTRACTING: 'Podwykonawstwo',
  OTHER_DIRECT:   'Inne bezpośrednie',
  INDIRECT:       'Pośrednie (ryczałt)',
};

export default function GrantCostPanel() {
  const { activeTenantId } = useAuth() as any;
  const [projects, setProjects]           = useState<GrantProject[]>([]);
  const [costs, setCosts]                 = useState<GrantCost[]>([]);
  const [selectedProject, setSelected]   = useState<string>('');
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    if (!activeTenantId) return;
    getDocs(query(collection(db, `tenants/${activeTenantId}/grantProjects`), orderBy('startDate', 'desc')))
      .then(snap => {
        const ps = snap.docs.map(d => ({ id: d.id, ...d.data() } as GrantProject));
        setProjects(ps);
        if (ps.length) setSelected(ps[0].id);
      }).finally(() => setLoading(false));
  }, [activeTenantId]);

  useEffect(() => {
    if (!activeTenantId || !selectedProject) return;
    getDocs(query(collection(db, `tenants/${activeTenantId}/grantCosts`), orderBy('createdAt', 'desc')))
      .then(snap => setCosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as GrantCost)).filter(c => c.grantProjectId === selectedProject)));
  }, [activeTenantId, selectedProject]);

  const eligible   = costs.filter(c => c.isEligible).reduce((s, c) => s + c.amount, 0);
  const ineligible = costs.filter(c => !c.isEligible).reduce((s, c) => s + c.amount, 0);

  if (loading) return <div className="text-center py-16 text-gray-400">Ładowanie…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={selectedProject}
          onChange={e => setSelected(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
        >
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex gap-4 text-sm">
          <span>Kwalifikowalne: <strong className="text-emerald-600">{eligible.toLocaleString('pl-PL')} PLN</strong></span>
          <span>Niekwalifikowalne: <strong className="text-rose-600">{ineligible.toLocaleString('pl-PL')} PLN</strong></span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-3 text-left">Nr dokumentu</th>
              <th className="px-6 py-3 text-left">Kategoria</th>
              <th className="px-6 py-3 text-right">Kwota</th>
              <th className="px-6 py-3 text-right">VAT</th>
              <th className="px-6 py-3 text-center">Kwalif.</th>
              <th className="px-6 py-3 text-left">Przyczyna odrzucenia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {costs.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{c.documentNumber}</td>
                <td className="px-6 py-4 text-gray-600">{CATEGORY_LABELS[c.category]}</td>
                <td className="px-6 py-4 text-right font-medium">{c.amount.toLocaleString('pl-PL')} PLN</td>
                <td className="px-6 py-4 text-right text-gray-500">{c.vatAmount.toLocaleString('pl-PL')} PLN</td>
                <td className="px-6 py-4 text-center">
                  {c.isEligible
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                    : <XCircle className="w-4 h-4 text-rose-500 mx-auto" />}
                </td>
                <td className="px-6 py-4 text-xs text-gray-400">{c.ineligibilityReason ?? '—'}</td>
              </tr>
            ))}
            {!costs.length && <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Brak kosztów</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
