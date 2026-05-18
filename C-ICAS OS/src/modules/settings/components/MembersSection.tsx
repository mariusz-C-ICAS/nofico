import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, CheckCircle2, X, AlertTriangle, RefreshCw, UserPlus, Lock } from 'lucide-react';
import { useTenant } from '../../../core/auth/TenantContext';
import { useAuth } from '../../../core/auth/AuthContext';
import { db } from '../../../core/firebase/config';
import {
  collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';

interface Member {
  id: string;
  userId: string;
  tenantId: string;
  email: string;
  displayName?: string;
  role: string;
  companies?: string[];
  createdAt?: any;
}

const ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'VIEWER'] as const;
type Role = typeof ROLES[number];

const ROLE_STYLE: Record<string, string> = {
  OWNER:    'bg-violet-100 text-violet-700',
  ADMIN:    'bg-indigo-100 text-indigo-700',
  MANAGER:  'bg-cyan-100 text-cyan-700',
  EMPLOYEE: 'bg-slate-100 text-slate-600',
  VIEWER:   'bg-slate-50 text-slate-400',
};

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Owner', ADMIN: 'Admin', MANAGER: 'Manager', EMPLOYEE: 'Pracownik', VIEWER: 'Podgląd',
};

export default function MembersSection() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showAddInternal, setShowAddInternal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('EMPLOYEE');
  const [internalName, setInternalName] = useState('');
  const [internalPin, setInternalPin] = useState('');
  const [internalRole, setInternalRole] = useState<Role>('EMPLOYEE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const hashPin = async (pin: string): Promise<string> => {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(pin));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleAddInternal = async () => {
    if (!internalName.trim() || !currentTenant) return;
    if (internalPin.length < 4) { setError('PIN musi mieć co najmniej 4 cyfry.'); return; }
    setSaving(true); setError('');
    try {
      const pinHash = await hashPin(internalPin);
      await addDoc(collection(db, 'tenantMemberships'), {
        tenantId: currentTenant.id,
        displayName: internalName.trim(),
        email: '',
        role: internalRole,
        userId: '',
        accountType: 'internal',
        pinHash,
        status: 'ACTIVE',
        createdBy: user?.uid,
        createdAt: serverTimestamp(),
      });
      setInternalName(''); setInternalPin(''); setInternalRole('EMPLOYEE');
      setShowAddInternal(false);
      await fetchMembers();
    } catch (e: any) {
      setError(e.message ?? 'Błąd dodawania konta.');
    } finally {
      setSaving(false);
    }
  };

  const fetchMembers = async () => {
    if (!currentTenant) return;
    setLoading(true);
    try {
      const q = query(collection(db, "tenantMemberships"), where("tenantId", "==", currentTenant.id));
      const snap = await getDocs(q);
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Member)));
    } catch (e) {
      console.error("Błąd pobierania członków:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, [currentTenant?.id]);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !currentTenant) return;
    setSaving(true); setError('');
    try {
      await addDoc(collection(db, "tenantMemberships"), {
        tenantId: currentTenant.id,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        userId: '',
        status: 'INVITED',
        invitedBy: user?.uid,
        createdAt: serverTimestamp(),
      });
      setInviteEmail('');
      setInviteRole('EMPLOYEE');
      setShowInvite(false);
      await fetchMembers();
    } catch (e: any) {
      setError(e.message ?? 'Błąd zaproszenia.');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: Role) => {
    try {
      await updateDoc(doc(db, "tenantMemberships", memberId), { role });
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
    } catch (e: any) {
      setError(e.message ?? 'Błąd zmiany roli.');
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await deleteDoc(doc(db, "tenantMemberships", memberId));
      setMembers(prev => prev.filter(m => m.id !== memberId));
      setConfirmDelete(null);
    } catch (e: any) {
      setError(e.message ?? 'Błąd usuwania.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Users size={18} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Użytkownicy</h3>
              <p className="text-[9px] text-slate-400 font-bold mt-0.5">{currentTenant?.name ?? ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchMembers} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 flex items-center justify-center transition-all">
              <RefreshCw size={13} />
            </button>
            <button
              onClick={() => { setShowAddInternal(true); setShowInvite(false); }}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-2xl transition-all"
            >
              <Lock size={13} /> Dodaj
            </button>
            <button
              onClick={() => { setShowInvite(true); setShowAddInternal(false); }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-2xl transition-all"
            >
              <UserPlus size={13} /> Zaproś
            </button>
          </div>
        </div>

        <div className="p-8 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm font-bold">Ładowanie...</div>
          ) : members.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm font-bold">Brak członków. Zaproś pierwszego użytkownika.</div>
          ) : (
            members.map(m => (
              <div key={m.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xs italic">
                    {(m.displayName ?? m.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900 italic">{m.displayName ?? m.email}</div>
                    <div className="text-[9px] text-slate-400 font-bold">{m.email}</div>
                    {(m as any).status === 'INVITED' && (
                      <span className="text-[8px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-black uppercase">Zaproszenie wysłane</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={m.role}
                    onChange={e => handleRoleChange(m.id, e.target.value as Role)}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-0 outline-none cursor-pointer ${ROLE_STYLE[m.role] ?? ROLE_STYLE.VIEWER}`}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                  {confirmDelete === m.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleRemove(m.id)} className="text-[9px] font-black text-red-600 hover:text-red-700 px-2">Usuń</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-[9px] font-black text-slate-400">Anuluj</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(m.id)}
                      disabled={m.userId === user?.uid}
                      className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-red-100 text-slate-300 hover:text-red-500 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Internal account form */}
          {showAddInternal && (
            <div className="mt-4 p-6 bg-slate-900 border border-slate-700 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2"><Lock size={12} /> Konto wewnętrzne (bez emaila)</span>
                <button onClick={() => setShowAddInternal(false)}><X size={16} className="text-slate-400 hover:text-white" /></button>
              </div>
              <div className="text-[9px] text-slate-400 font-bold">Konta wewnętrzne logują się przez nazwę użytkownika i PIN. Przeznaczone dla pracowników bez konta email.</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Imię i nazwisko / nazwa</label>
                  <input
                    value={internalName}
                    onChange={e => setInternalName(e.target.value)}
                    placeholder="Jan Kowalski"
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm font-black text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">PIN (4-6 cyfr)</label>
                  <input
                    type="password"
                    value={internalPin}
                    onChange={e => setInternalPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••"
                    maxLength={6}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Rola</label>
                  <select
                    value={internalRole}
                    onChange={e => setInternalRole(e.target.value as Role)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm font-black text-white focus:outline-none"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                </div>
              </div>
              {error && <p className="flex items-center gap-2 text-red-400 text-xs font-bold"><AlertTriangle size={12} />{error}</p>}
              <button
                disabled={saving || !internalName.trim() || internalPin.length < 4}
                onClick={handleAddInternal}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all"
              >
                <CheckCircle2 size={13} /> {saving ? 'Tworzę...' : 'Utwórz konto'}
              </button>
            </div>
          )}

          {/* Invite form */}
          {showInvite && (
            <div className="mt-4 p-6 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Zaproś użytkownika</span>
                <button onClick={() => setShowInvite(false)}><X size={16} className="text-slate-400 hover:text-slate-600" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="pracownik@firma.pl"
                    className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Rola</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as Role)}
                    className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-sm font-black text-slate-900 focus:outline-none"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                </div>
              </div>
              {error && <p className="flex items-center gap-2 text-red-600 text-xs font-bold"><AlertTriangle size={12} />{error}</p>}
              <button
                disabled={saving || !inviteEmail.trim()}
                onClick={handleInvite}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all"
              >
                <CheckCircle2 size={13} /> {saving ? 'Zapraszam...' : 'Wyślij zaproszenie'}
              </button>
            </div>
          )}

          {error && !showInvite && (
            <p className="flex items-center gap-2 text-red-600 text-xs font-bold"><AlertTriangle size={12} />{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
