import React, { useEffect, useState } from 'react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { GrantProject, GrantStatus } from '../types';
import { CheckCircle2, PauseCircle, XCircle, Clock } from 'lucide-react';

const STATUS_META: Record<GrantStatus, { label: string; color: string; Icon: React.ElementType }> = {
  ACTIVE:    { label: 'Aktywny',    color: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2 },
  COMPLETED: { label: 'Zakończony', color: 'bg-blue-100 text-blue-700',     Icon: CheckCircle2 },
  SUSPENDED: { label: 'Zawieszony', color: 'bg-amber-100 text-amber-700',   Icon: PauseCircle },
  CLOSED:    { label: 'Zamknięty',  color: 'bg-gray-100 text-gray-600',     Icon: XCircle },
};

export default function GrantProjectList() {
  const { activeTenantId } = useAuth() as any;
  const [projects, setProjects] = useState<GrantProject[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!activeTenantId) return;
    getDocs(query(collection(db, `tenants/${activeTenantId}/grantProjects`), orderBy('startDate', 'desc')))
      .then(snap => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as GrantProject))))
      .finally(() => setLoading(false));
  }, [activeTenantId]);

  if (loading) return <div className="text-center py-16 text-gray-400">Ładowanie…</div>;

  if (!projects.length) {
    return (
      <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
        Brak projektów grantowych
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {projects.map(p => {
        const meta = STATUS_META[p.status];
        const grantAmount = p.budgetPLN * (p.coFinancingRate / 100);
        const daysLeft    = Math.ceil(((p.endDate as any)?.toDate?.()?.getTime?.() ?? 0 - Date.now()) / 86400000);
        return (
          <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>{meta.label}</span>
              <span className="text-xs font-medium bg-purple-50 text-purple-600 px-2 py-0.5 rounded">{p.program}</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{p.name}</h3>
            <p className="text-xs text-gray-400 font-mono mb-3">{p.grantNumber}</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Budżet:</span>
                <span className="font-medium">{p.budgetPLN.toLocaleString('pl-PL')} PLN</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Dofinans. ({p.coFinancingRate}%):</span>
                <span className="font-medium text-emerald-600">{grantAmount.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Instytucja:</span>
                <span className="font-medium truncate max-w-[12rem] text-right">{p.grantor}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-400">
              <span>{(p.startDate as any)?.toDate?.()?.toLocaleDateString('pl-PL')} – {(p.endDate as any)?.toDate?.()?.toLocaleDateString('pl-PL')}</span>
              {daysLeft > 0
                ? <span className={daysLeft < 30 ? 'text-rose-500 font-medium' : ''}>{daysLeft}d</span>
                : <span className="text-gray-300">Zakończony</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
