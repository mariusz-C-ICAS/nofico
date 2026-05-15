import React, { useEffect, useState } from 'react';
import { ClipboardList, AlertOctagon, AlertTriangle, Eye } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../shared/lib/firebase';
import { useAuth } from '../../shared/hooks/AuthContext';
import { useTenant } from '../../shared/hooks/useTenant';
import type { DocumentInstance } from '../workflow/types';
import { STATUS_LABELS, STATUS_COLORS } from '../workflow/types';
import QualityNcrPanel from '../workflow/components/QualityNcrPanel';

const SEV_COLOR: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-300',
  major: 'bg-orange-100 text-orange-700 border-orange-300',
  minor: 'bg-amber-100 text-amber-700 border-amber-300',
  observation: 'bg-slate-100 text-slate-600 border-slate-300',
};

export default function QualityModule() {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [docs, setDocs] = useState<DocumentInstance[]>([]);
  const [selected, setSelected] = useState<DocumentInstance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTenantId) return;
    const q = query(
      collection(db, `tenants/${activeTenantId}/documentInstances`),
      where('type', '==', 'QUALITY_NCR'),
      where('status', 'in', ['PENDING_APPROVAL', 'APPROVED', 'NCR_OPEN', 'NCR_VERIFIED'])
    );
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as DocumentInstance);
      list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setDocs(list);
      setLoading(false);
    });
    return unsub;
  }, [activeTenantId]);

  const handleActionComplete = () => {
    setSelected(null);
  };

  if (!user || !activeTenantId) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 p-8">
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white">
        <div className="flex items-center gap-3 mb-2">
          <ClipboardList size={20} className="text-yellow-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-yellow-300">Moduł Jakości</span>
        </div>
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">
          NCR <span className="text-yellow-400">&</span> CAPA
        </h1>
        <p className="text-slate-400 text-sm font-medium">
          Karty Niezgodności ISO 9001 — od wykrycia do weryfikacji działań korygujących.
        </p>
      </div>

      {selected && (
        <div className="space-y-4">
          <button
            onClick={() => setSelected(null)}
            className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600"
          >
            ← Powrót do listy
          </button>
          <div className="bg-white rounded-[2rem] border border-slate-100 p-6 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-black text-slate-900">{selected.metadata.title}</h2>
              <span className={`text-[9px] font-black px-3 py-1 rounded-full ${STATUS_COLORS[selected.status]}`}>
                {STATUS_LABELS[selected.status]}
              </span>
            </div>
            {selected.metadata.ncrSeverity && (
              <span className={`inline-block text-[9px] font-black px-3 py-1 rounded-full border ${SEV_COLOR[selected.metadata.ncrSeverity] ?? 'bg-slate-100 text-slate-600'}`}>
                {selected.metadata.ncrSeverity.toUpperCase()}
              </span>
            )}
            {selected.metadata.ncrProcessArea && (
              <p className="text-xs text-slate-600"><span className="font-black">Obszar:</span> {selected.metadata.ncrProcessArea}</p>
            )}
            {selected.metadata.description && (
              <p className="text-xs text-slate-600 leading-relaxed">{selected.metadata.description}</p>
            )}
          </div>
          <QualityNcrPanel
            document={selected}
            actorId={user.uid}
            actorEmail={user.email ?? ''}
            onActionComplete={handleActionComplete}
          />
        </div>
      )}

      {!selected && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Otwarte NCR', statuses: ['APPROVED', 'NCR_OPEN'], color: 'text-yellow-600' },
              { label: 'Do weryfikacji', statuses: ['NCR_OPEN'], color: 'text-orange-600' },
              { label: 'Zweryfikowane', statuses: ['NCR_VERIFIED'], color: 'text-teal-600' },
            ].map(({ label, statuses, color }) => (
              <div key={label} className="bg-white rounded-[2rem] border border-slate-100 p-5 text-center">
                <p className={`text-3xl font-black ${color}`}>
                  {docs.filter(d => statuses.includes(d.status)).length}
                </p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight">Aktywne karty NCR</h3>
            </div>
            {loading ? (
              <div className="p-10 text-center text-slate-300 text-xs font-bold uppercase">Ładowanie...</div>
            ) : docs.length === 0 ? (
              <div className="p-10 text-center text-slate-300 text-xs font-bold uppercase">Brak aktywnych NCR</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {docs.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => setSelected(doc)}
                    className="w-full text-left px-6 py-4 hover:bg-slate-50 transition-colors flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {doc.metadata.ncrSeverity === 'critical' && <AlertOctagon size={12} className="text-red-600 flex-shrink-0" />}
                        {doc.metadata.ncrSeverity === 'major' && <AlertTriangle size={12} className="text-orange-600 flex-shrink-0" />}
                        <p className="text-xs font-black text-slate-800 truncate">{doc.metadata.title}</p>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium truncate">{doc.metadata.ncrProcessArea}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {doc.metadata.ncrSeverity && (
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${SEV_COLOR[doc.metadata.ncrSeverity] ?? ''}`}>
                          {doc.metadata.ncrSeverity.toUpperCase()}
                        </span>
                      )}
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${STATUS_COLORS[doc.status]}`}>
                        {STATUS_LABELS[doc.status]}
                      </span>
                      <Eye size={14} className="text-slate-300" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
