import React, { useEffect, useState } from 'react';
import { useTenant } from '../../../shared/hooks/useTenant';
import { getDeMinimisStatus } from '../services/deMinimisService';
import { DeMinimisStatus } from '../types';
import { Banknote, AlertTriangle } from 'lucide-react';

export default function DeMinimisPanel() {
  const { activeTenantId } = useTenant();
  const [status, setStatus] = useState<DeMinimisStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTenantId) return;
    getDeMinimisStatus(activeTenantId).then(setStatus).finally(() => setLoading(false));
  }, [activeTenantId]);

  if (loading) return <div className="text-center py-16 text-gray-400">Ładowanie…</div>;
  if (!status)  return <div className="text-center py-16 text-gray-400">Brak danych de minimis</div>;

  const barWidth = Math.min(100, status.utilizationPercent);
  const barColor = status.isExceeded ? 'bg-red-500' : status.isApproachingLimit ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Banknote className="w-5 h-5 text-purple-600" />
          <h2 className="font-semibold text-gray-800">Limit de minimis (3-letni rolling window)</h2>
          {status.isExceeded && (
            <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              <AlertTriangle className="w-3 h-3" /> Przekroczony!
            </span>
          )}
          {status.isApproachingLimit && !status.isExceeded && (
            <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              <AlertTriangle className="w-3 h-3" /> Bliski limitu
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Wykorzystano', value: `${status.totalEUR.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} EUR`, cls: 'text-gray-900' },
            { label: 'Limit',        value: `${status.limitEUR.toLocaleString('pl-PL')} EUR`,                                cls: 'text-gray-900' },
            { label: 'Pozostało',    value: `${status.remainingEUR.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} EUR`, cls: status.isExceeded ? 'text-red-600' : 'text-emerald-600' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-xl font-bold ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div className={`h-3 rounded-full transition-all ${barColor}`} style={{ width: `${barWidth}%` }} />
        </div>
        <p className="text-right text-xs text-gray-500">{status.utilizationPercent.toFixed(1)}% limitu</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Wpisy de minimis</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-3 text-left">Program</th>
              <th className="px-6 py-3 text-right">Kwota PLN</th>
              <th className="px-6 py-3 text-right">Kwota EUR</th>
              <th className="px-6 py-3 text-right">Kurs</th>
              <th className="px-6 py-3 text-left">Data</th>
              <th className="px-6 py-3 text-left">Ważny do</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {status.entries.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{e.program}</td>
                <td className="px-6 py-4 text-right">{e.amountPLN.toLocaleString('pl-PL')} PLN</td>
                <td className="px-6 py-4 text-right font-medium text-purple-600">{e.amountEUR.toLocaleString('pl-PL', { maximumFractionDigits: 2 })} EUR</td>
                <td className="px-6 py-4 text-right text-gray-500">{e.eurPlnRate.toFixed(4)}</td>
                <td className="px-6 py-4 text-xs text-gray-500">{(e.grantedAt as any)?.toDate?.()?.toLocaleDateString('pl-PL')}</td>
                <td className="px-6 py-4 text-xs text-gray-500">{(e.validUntil as any)?.toDate?.()?.toLocaleDateString('pl-PL')}</td>
              </tr>
            ))}
            {!status.entries.length && <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Brak wpisów</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
