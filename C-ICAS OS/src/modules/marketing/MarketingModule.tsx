import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../shared/lib/firebase';
import { useAuth } from '../../shared/hooks/AuthContext';
import { useTenant } from '../../shared/hooks/useTenant';
import { transitionDocument } from '../workflow/services/workflowEngine';
import { STATUS_LABELS, STATUS_COLORS } from '../workflow/types';
import type { DocumentInstance } from '../workflow/types';
import { ImageIcon, CheckCircle2, XCircle, ArrowLeft, RefreshCw, FileImage } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import AttachmentPreview from '../workflow/components/AttachmentPreview';
import IdesGenerateButton from '../../shared/components/IdesGenerateButton';

export default function MarketingModule() {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [docs, setDocs] = useState<DocumentInstance[]>([]);
  const [selected, setSelected] = useState<DocumentInstance | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeTenantId) return;
    setLoading(true);
    const q = query(
      collection(db, `tenants/${activeTenantId}/documentInstances`),
      where('status', '==', 'MARKETING_REVIEW')
    );
    return onSnapshot(q, snap => {
      const result = snap.docs.map(d => ({ id: d.id, ...d.data() }) as DocumentInstance);
      result.sort((a, b) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0));
      setDocs(result);
      setLoading(false);
    });
  }, [activeTenantId]);

  const act = async (target: 'MARKETING_APPROVED' | 'APPROVED') => {
    if (!selected || !activeTenantId || !user) return;
    setActionLoading(true);
    setError('');
    try {
      await transitionDocument(
        activeTenantId,
        selected.id,
        target === 'MARKETING_APPROVED' ? 'APPROVE' : 'REJECT',
        user.uid,
        user.email ?? '',
        target,
        { stepType: 'APPROVAL', note: note.trim() || undefined }
      );
      setSelected(null);
      setNote('');
    } catch (e: any) {
      setError(e.message ?? 'Błąd operacji.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!user || !activeTenantId) return null;

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 p-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10">
          {selected && (
            <button onClick={() => { setSelected(null); setNote(''); setError(''); }}
              className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest mb-4 transition-colors">
              <ArrowLeft size={14} /> Powrót do listy
            </button>
          )}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 bg-slate-800/50 w-fit px-4 py-1.5 rounded-full border border-slate-700/50">
              <ImageIcon className="text-pink-400" size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest text-pink-200">Marketing Review</span>
            </div>
            <IdesGenerateButton moduleKey="crm" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">
            Zatwierdzanie <span className="text-pink-500">Materiałów</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            Zdjęcia i filmy z realizacji projektów oczekujące na publikację na stronie firmowej.
          </p>
        </div>
      </div>

      {/* Detail view */}
      {selected ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className={`text-[9px] font-black px-3 py-1 rounded-full ${STATUS_COLORS[selected.status]}`}>
                {STATUS_LABELS[selected.status]}
              </span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 mt-3">{selected.metadata.title}</h2>
              {selected.metadata.projectId && (
                <p className="text-xs font-bold text-slate-400 uppercase mt-1">Projekt: {selected.metadata.projectId}</p>
              )}
            </div>
          </div>

          {selected.metadata.description && (
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{selected.metadata.description}</p>
            </div>
          )}

          {/* Attachments */}
          <div className="space-y-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{selected.attachments.length} plik(ów) do przeglądu</p>
            {selected.attachments.map(att => (
              <AttachmentPreview key={att.id} attachment={att} />
            ))}
          </div>

          {/* Action area */}
          <div className="space-y-4 border-t border-slate-100 pt-6">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Opcjonalna notatka dla zgłaszającego..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-pink-500 resize-none"
            />
            {error && <p className="text-red-600 text-xs font-bold">{error}</p>}
            <div className="flex gap-3">
              <button
                disabled={actionLoading}
                onClick={() => act('MARKETING_APPROVED')}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-fuchsia-500/20"
              >
                <CheckCircle2 size={15} /> Zatwierdź do publikacji
              </button>
              <button
                disabled={actionLoading}
                onClick={() => act('APPROVED')}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-slate-200"
              >
                <XCircle size={15} /> Odrzuć
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* List view */
        <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-20">
              <RefreshCw className="animate-spin text-slate-300" size={24} />
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <FileImage size={32} className="text-slate-200" />
              <p className="text-slate-400 text-sm font-black uppercase tracking-tight">Brak materiałów do przeglądu</p>
              <p className="text-[10px] text-slate-300 font-bold">Pojawią się tu gdy szef zatwierdzi realizację projektu i skieruje do marketingu</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {docs.map(doc => {
                const date = doc.updatedAt?.seconds
                  ? format(new Date(doc.updatedAt.seconds * 1000), 'd MMM yyyy', { locale: pl })
                  : '—';
                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelected(doc)}
                    className="w-full text-left px-8 py-5 hover:bg-slate-50 transition-colors flex items-center gap-5"
                  >
                    <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <ImageIcon size={18} className="text-pink-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate">{doc.metadata.title}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                        {doc.metadata.projectId ?? 'Bez projektu'} · {doc.attachments.length} plik(ów) · {date}
                      </p>
                    </div>
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full flex-shrink-0 ${STATUS_COLORS[doc.status]}`}>
                      {STATUS_LABELS[doc.status]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
