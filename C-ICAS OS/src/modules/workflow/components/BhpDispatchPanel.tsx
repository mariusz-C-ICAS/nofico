import React, { useState } from 'react';
import {
  AlertOctagon, CheckCircle2, Shield, Banknote,
  Phone, Users, Briefcase, Scale, AlertTriangle, Lock,
} from 'lucide-react';
import type { DocumentInstance, DocumentStatus } from '../types';
import { STATUS_LABELS, STATUS_COLORS } from '../types';
import { transitionDocument } from '../services/workflowEngine';
import { dispatchToMany, dispatchNotification } from '../services/notificationService';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

interface Props {
  document: DocumentInstance;
  actorId: string;
  actorEmail: string;
  actorRole?: string;
  onActionComplete: () => void;
}

interface Recipient {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  required: boolean;
  roleQuery?: string;
}

const RECIPIENTS: Recipient[] = [
  { id: 'bhp_officer', label: 'BeHaPowiec (BHP)', description: 'Wymagane przez Kodeks Pracy — specjalista BHP', icon: Shield, color: 'red', required: true, roleQuery: 'bhp_officer' },
  { id: 'insurance', label: 'Ubezpieczyciel / Backoffice', description: 'Roszczenie wypadkowe ZUS i/lub prywatne', icon: Banknote, color: 'orange', required: true, roleQuery: 'backoffice' },
  { id: 'management', label: 'Zarząd', description: 'Powiadomienie kierownictwa firmy', icon: Briefcase, color: 'slate', required: true, roleQuery: 'management' },
  { id: 'hr', label: 'HR / Kadry', description: 'Dokumentacja pracownicza i zwolnienie lekarskie', icon: Users, color: 'emerald', required: false, roleQuery: 'hr' },
  { id: 'police', label: 'Policja (zewnętrzna)', description: 'Wypadki ciężkie i śmiertelne — zgłoszenie zewnętrzne przez e-mail', icon: Phone, color: 'blue', required: false },
  { id: 'legal', label: 'Obsługa prawna', description: 'Sprawy sporne, odpowiedzialność cywilna', icon: Scale, color: 'violet', required: false, roleQuery: 'legal' },
];

const COLOR_RING: Record<string, string> = {
  red: 'ring-red-400 bg-red-50',
  orange: 'ring-orange-400 bg-orange-50',
  slate: 'ring-slate-400 bg-slate-100',
  emerald: 'ring-emerald-400 bg-emerald-50',
  blue: 'ring-blue-400 bg-blue-50',
  violet: 'ring-violet-400 bg-violet-50',
};

const ICON_COLOR: Record<string, string> = {
  red: 'text-red-600', orange: 'text-orange-600', slate: 'text-slate-600',
  emerald: 'text-emerald-600', blue: 'text-blue-600', violet: 'text-violet-600',
};

export default function BhpDispatchPanel({ document: doc, actorId, actorEmail, actorRole, onActionComplete }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(RECIPIENTS.filter(r => r.required).map(r => r.id))
  );
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dispatched, setDispatched] = useState(doc.status === 'BHP_DISPATCHED');

  const toggle = (id: string) => {
    const r = RECIPIENTS.find(r => r.id === id);
    if (r?.required) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDispatch = async () => {
    if (!actorId || !doc.tenantId) return;
    setLoading(true);
    setError('');
    try {
      const dispatchList = Array.from(selected);
      const dispatchNote = `Wysłano do: ${dispatchList.join(', ')}. ${note.trim()}`.trim();

      await transitionDocument(
        doc.tenantId, doc.id, 'DISPATCH', actorId, actorEmail,
        'BHP_DISPATCHED',
        { actorRole, stepType: 'APPROVAL', note: dispatchNote }
      );

      // Resolve role-based user IDs and dispatch notifications
      for (const r of RECIPIENTS) {
        if (!selected.has(r.id) || !r.roleQuery) continue;
        try {
          const q = query(
            collection(db, `tenants/${doc.tenantId}/userRoles`),
            where('role', '==', r.roleQuery)
          );
          const snap = await getDocs(q);
          const recipientIds = snap.docs.map(d => d.data().userId as string).filter(Boolean);
          if (recipientIds.length > 0) {
            await dispatchToMany(recipientIds, {
              tenantId: doc.tenantId,
              documentInstanceId: doc.id,
              documentTitle: doc.metadata.title,
              type: 'BHP_DISPATCHED',
              message: `[BHP] ${doc.metadata.title} — wypadek ${doc.metadata.injuredPersonName ?? ''}. Twoja rola: ${r.label}. Wymagane działanie.`,
            });
          }
        } catch { /* non-blocking */ }
      }

      setDispatched(true);
      onActionComplete();
    } catch (e: any) {
      setError(e.message ?? 'Błąd dyspozycji.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    setLoading(true);
    try {
      await transitionDocument(
        doc.tenantId, doc.id, 'CLOSE_CLAIM', actorId, actorEmail,
        'BHP_CLOSED',
        { actorRole, stepType: 'APPROVAL', note: note.trim() || 'Sprawa BHP zamknięta.' }
      );
      onActionComplete();
    } catch (e: any) {
      setError(e.message ?? 'Błąd zamknięcia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="bg-red-950 text-white p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-red-500/20 rounded-2xl flex items-center justify-center">
          <AlertOctagon size={18} className="text-red-400" />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-red-300 mb-0.5">BHP — Dyspozycja incydentu</p>
          <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${STATUS_COLORS[doc.status]}`}>
            {STATUS_LABELS[doc.status]}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-red-300 text-[9px] font-black uppercase">
          <Lock size={10} /> WORM zabezpieczono
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* Incident summary */}
        {doc.metadata.injuredPersonName && (
          <div className="bg-red-50 rounded-[2rem] p-5 border border-red-100 grid grid-cols-2 gap-3 text-[10px] font-bold text-red-800 uppercase">
            {doc.metadata.injuredPersonName && <span>Poszkodowany: <span className="font-black">{doc.metadata.injuredPersonName}</span></span>}
            {doc.metadata.injuryType && <span>Uraz: <span className="font-black">{doc.metadata.injuryType}</span></span>}
            {doc.metadata.incidentDate && <span>Data: <span className="font-black">{doc.metadata.incidentDate.replace('T', ' ')}</span></span>}
            {doc.metadata.policeRequired && <span className="text-blue-700 font-black">! Wymagane zgłoszenie do policji</span>}
            {doc.metadata.ambulanceCalled && <span className="text-emerald-700 font-black">✓ Karetka wezwana</span>}
          </div>
        )}

        {/* APPROVED → dispatch */}
        {doc.status === 'APPROVED' && !dispatched && (
          <>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Wybierz odbiorców dyspozycji</p>
              <div className="space-y-2">
                {RECIPIENTS.map(r => {
                  const isSelected = selected.has(r.id);
                  const Icon = r.icon;
                  return (
                    <label key={r.id} onClick={() => toggle(r.id)}
                      className={`flex items-start gap-4 p-4 rounded-[2rem] border cursor-pointer transition-all ${
                        r.required ? 'opacity-80 cursor-default' : 'hover:shadow-sm'
                      } ${isSelected ? `ring-2 ${COLOR_RING[r.color]}` : 'bg-slate-50 border-slate-200'}`}>
                      <input type="checkbox" checked={isSelected} readOnly className="mt-1 w-4 h-4 flex-shrink-0" style={{ accentColor: 'currentColor' }} />
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/80`}>
                        <Icon size={14} className={ICON_COLOR[r.color]} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{r.label}</p>
                          {r.required && <span className="text-[8px] font-black text-red-500 uppercase bg-red-50 px-1.5 py-0.5 rounded-full">Wymagane</span>}
                        </div>
                        <p className="text-[9px] text-slate-500 font-medium mt-0.5">{r.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Notatka dla odbiorców (opcjonalnie)</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                placeholder="Dodatkowe informacje dla BHP, ubezpieczyciela..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:ring-2 focus:ring-red-400 resize-none" />
            </div>

            {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}

            <button disabled={loading} onClick={handleDispatch}
              className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-red-500/20 transition-all">
              <AlertOctagon size={14} />
              {loading ? 'Wysyłanie...' : `Wyślij do ${selected.size} odbiorców — zabezpiecz dowody`}
            </button>
          </>
        )}

        {/* BHP_DISPATCHED → show dispatch confirmation + close */}
        {(doc.status === 'BHP_DISPATCHED' || dispatched) && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-5 bg-emerald-50 rounded-[2rem] border border-emerald-100">
              <CheckCircle2 className="text-emerald-600 flex-shrink-0" size={20} />
              <div>
                <p className="text-sm font-black text-emerald-800 uppercase tracking-tight">Dyspozycja wysłana — dowody WORM zabezpieczone</p>
                <p className="text-[10px] text-emerald-600 font-bold mt-0.5">BeHaPowiec, ubezpieczyciel i zarząd zostali powiadomieni. Sprawa w toku.</p>
              </div>
            </div>
            {doc.metadata.dispatchedTo && (
              <div className="flex flex-wrap gap-2">
                {doc.metadata.dispatchedTo.map(r => (
                  <span key={r} className="text-[9px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase">{r}</span>
                ))}
              </div>
            )}
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Notatka zamknięcia</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                placeholder="Wynik postępowania, wnioski, status poszkodowanego..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-slate-400 resize-none" />
            </div>
            <button disabled={loading} onClick={handleClose}
              className="w-full py-4 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
              {loading ? 'Zamykam...' : 'Zamknij sprawę BHP'}
            </button>
          </div>
        )}

        {doc.status === 'BHP_CLOSED' && (
          <div className="flex items-center gap-3 p-5 bg-slate-100 rounded-[2rem]">
            <Lock className="text-slate-500 flex-shrink-0" size={18} />
            <div>
              <p className="text-sm font-black text-slate-700 uppercase tracking-tight">Sprawa zamknięta</p>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">Pełny log dostępny w archiwum — niepodważalny zapis wszystkich zdarzeń.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
