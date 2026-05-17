/**
 * Data: 2026-05-15
 * Zmiany: Konfiguracja wielu domen e-mail per tenant (OAuth2, domyślna skrzynka).
 * Ścieżka: /src/modules/settings/components/MultimailSettings.tsx
 */
import React, { useState, useEffect } from 'react';
import { db } from '../../../shared/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { Mail, CheckCircle2, AlertTriangle, Plus, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface Mailbox {
  id: string;
  email: string;
  tenant: string;
  status: 'connected' | 'error';
  isDefault: boolean;
}

const INITIAL_MAILBOXES: Mailbox[] = [
  { id: 'mb-1', email: 'jan@firma-a.pl', tenant: 'Firma A sp. z o.o.', status: 'connected', isDefault: true },
  { id: 'mb-2', email: 'jan@firma-b.com', tenant: 'Firma B GmbH', status: 'error', isDefault: false },
];

// --- Sub-components ---
function OAuthBadge({ status }: { status: 'connected' | 'error' }) {
  return status === 'connected' ? (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-[9px] font-black uppercase tracking-widest">
      <CheckCircle2 size={10} /> Polaczono
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/10 text-red-700 text-[9px] font-black uppercase tracking-widest">
      <AlertTriangle size={10} /> Blad OAuth2
    </span>
  );
}

// --- Add Mailbox Modal ---
interface AddModalProps {
  onClose: () => void;
  onAdd: (mailbox: Mailbox) => void;
  tenants: string[];
}

function AddMailboxModal({ onClose, onAdd, tenants }: AddModalProps) {
  const [email, setEmail] = useState('');
  const [tenant, setTenant] = useState(tenants[0] ?? '');
  const [authState, setAuthState] = useState<'idle' | 'loading' | 'done'>('idle');

  const handleAuth = () => {
    if (!email) return;
    setAuthState('loading');
    setTimeout(() => setAuthState('done'), 2000);
  };

  const handleAdd = () => {
    if (authState !== 'done' || !email) return;
    onAdd({
      id: `mb-${Date.now()}`,
      email,
      tenant,
      status: 'connected',
      isDefault: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl shadow-slate-200"
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Dodaj skrzynke</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Adres email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jan@twoja-firma.pl"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[11px] text-slate-900 focus:outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tenant (firma)</label>
            <div className="relative">
              <select
                value={tenant}
                onChange={e => setTenant(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-[11px] font-black text-slate-900 uppercase tracking-tight pr-10 focus:outline-none focus:border-indigo-400"
              >
                {tenants.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <button
            onClick={handleAuth}
            disabled={authState === 'loading' || authState === 'done' || !email}
            className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all
              ${authState === 'done'
                ? 'bg-emerald-500 text-white'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'}`}
          >
            {authState === 'idle' && 'Autoryzuj przez OAuth2'}
            {authState === 'loading' && 'Laczenie z providerem...'}
            {authState === 'done' && 'Polaczono — OAuth2'}
          </button>

          <button
            onClick={handleAdd}
            disabled={authState !== 'done'}
            className="w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-30 transition-all"
          >
            Dodaj skrzynke
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// --- Main Export ---
export default function MultimailSettings() {
  const { activeTenantId } = useAuth() as any;
  const [mailboxes, setMailboxes] = useState<Mailbox[]>(INITIAL_MAILBOXES);
  const [showModal, setShowModal] = useState(false);
  const [tenantNames, setTenantNames] = useState<string[]>([]);

  useEffect(() => {
    if (!activeTenantId) return;
    (async () => {
      const snap = await getDoc(doc(db, 'tenants', activeTenantId));
      const name: string = snap.data()?.name ?? snap.data()?.companyName ?? activeTenantId;
      setTenantNames([name]);
    })();
  }, [activeTenantId]);

  const handleDisconnect = (id: string) =>
    setMailboxes(prev => prev.filter(m => m.id !== id));

  const handleSetDefault = (id: string) =>
    setMailboxes(prev => prev.map(m => ({ ...m, isDefault: m.id === id })));

  const handleAdd = (mb: Mailbox) =>
    setMailboxes(prev => [...prev, mb]);

  const defaultBox = mailboxes.find(m => m.isDefault);

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
      {/* Header */}
      <div className="bg-slate-900 rounded-[3rem] px-10 py-8 mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Multimail</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mt-1">
            Email Domains per Tenant
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
        >
          <Plus size={16} /> Dodaj skrzynke
        </button>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Info banner */}
        {defaultBox && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-6 py-4">
            <p className="text-[10px] font-black text-indigo-700 uppercase tracking-tight">
              Wysylka jako {defaultBox.email} dla kontrahentow firmy: {defaultBox.tenant}
            </p>
          </div>
        )}

        {/* Mailbox list */}
        <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-6">Podpiete skrzynki</h3>

          <AnimatePresence>
            {mailboxes.map(mb => (
              <motion.div
                key={mb.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Mail size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{mb.email}</p>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">{mb.tenant}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <OAuthBadge status={mb.status} />

                  {/* Default switch */}
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">Domyslna</span>
                    <div
                      onClick={() => handleSetDefault(mb.id)}
                      className={`w-10 h-5 rounded-full cursor-pointer transition-all relative ${mb.isDefault ? 'bg-indigo-600' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${mb.isDefault ? 'left-5' : 'left-0.5'}`} />
                    </div>
                  </div>

                  <button
                    onClick={() => handleDisconnect(mb.id)}
                    className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                  >
                    Odlacz
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {mailboxes.length === 0 && (
            <div className="text-center py-10">
              <Mail size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brak podpietych skrzynek</p>
            </div>
          )}
        </div>

        {/* System notifications default */}
        <div className="bg-white rounded-[3rem] border border-slate-100 p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Powiadomienia systemowe</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">
                Wyslij z: {defaultBox?.email ?? '—'}
              </p>
            </div>
            <div className="w-12 h-6 rounded-full bg-indigo-600 relative cursor-pointer">
              <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full shadow" />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <AddMailboxModal onClose={() => setShowModal(false)} onAdd={handleAdd} tenants={tenantNames} />
        )}
      </AnimatePresence>
    </div>
  );
}
