import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, Package, CheckCircle2, Trash2, MinusCircle } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

interface Props { tenantId: string }
interface BookingService { id: string; name: string; color: string }
interface VisitPackageDef { id: string; name: string; serviceIds: string[] | null; count: number; price: number; validDays: number; color: string; active: boolean }
interface CustomerPackage {
  id: string; packageId: string; customerName: string; customerId?: string;
  total: number; used: number; expiresAt: string; status: 'active' | 'exhausted' | 'expired'; purchasedAt?: any;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];
const VALID_DAYS = [90, 180, 365];
const COUNTS = [5, 10, 20];

function addDaysToDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function VisitPackages({ tenantId }: Props) {
  const [packages, setPackages] = useState<VisitPackageDef[]>([]);
  const [customerPackages, setCustomerPackages] = useState<CustomerPackage[]>([]);
  const [services, setServices] = useState<BookingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'packages' | 'customers'>('packages');
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pkgForm, setPkgForm] = useState({
    name: '', serviceIds: null as string[] | null, count: 10, price: 0, validDays: 180, color: COLORS[0], active: true,
  });
  const [assignForm, setAssignForm] = useState({ packageId: '', customerName: '', customerId: '' });

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, `tenants/${tenantId}/bookingPackages`), where('tenantId', '==', tenantId)), snap => {
        setPackages(snap.docs.map(d => ({ id: d.id, ...d.data() } as VisitPackageDef)));
        setLoading(false);
      }),
      onSnapshot(query(collection(db, `tenants/${tenantId}/customerPackages`), where('tenantId', '==', tenantId)), snap => {
        setCustomerPackages(snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerPackage)));
      }),
      onSnapshot(query(collection(db, `tenants/${tenantId}/bookingServices`), where('tenantId', '==', tenantId)), snap => {
        setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as BookingService)));
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [tenantId]);

  const handleSavePackage = async () => {
    setSaving(true);
    await addDoc(collection(db, `tenants/${tenantId}/bookingPackages`), { tenantId, ...pkgForm, createdAt: serverTimestamp() });
    setSaving(false);
    setShowPackageForm(false);
    setPkgForm({ name: '', serviceIds: null, count: 10, price: 0, validDays: 180, color: COLORS[0], active: true });
  };

  const handleAssign = async () => {
    if (!assignForm.packageId || !assignForm.customerName.trim()) return;
    const pkg = packages.find(p => p.id === assignForm.packageId);
    if (!pkg) return;
    setSaving(true);
    await addDoc(collection(db, `tenants/${tenantId}/customerPackages`), {
      tenantId,
      packageId: assignForm.packageId,
      customerName: assignForm.customerName.trim(),
      customerId: assignForm.customerId.trim() || null,
      total: pkg.count,
      used: 0,
      expiresAt: addDaysToDate(pkg.validDays),
      status: 'active',
      purchasedAt: serverTimestamp(),
    });
    setSaving(false);
    setShowAssignForm(false);
    setAssignForm({ packageId: '', customerName: '', customerId: '' });
  };

  const handleUseCredit = async (cp: CustomerPackage) => {
    const newUsed = cp.used + 1;
    const newStatus: CustomerPackage['status'] = newUsed >= cp.total ? 'exhausted' : 'active';
    await updateDoc(doc(db, `tenants/${tenantId}/customerPackages`, cp.id), {
      used: newUsed, status: newStatus, lastUsedAt: serverTimestamp(),
    });
  };

  const handleToggleActive = async (pkg: VisitPackageDef) => {
    await updateDoc(doc(db, `tenants/${tenantId}/bookingPackages`, pkg.id), { active: !pkg.active });
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Pakiety wizyt</h3>
          <p className="text-xs text-slate-500 mt-0.5">Sprzedaj klientom pakiety wielokrotnych wizyt</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAssignForm(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white font-black text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-all">
            <Plus size={12} /> Przypisz klientowi
          </button>
          <button onClick={() => setShowPackageForm(true)}
            className="flex items-center gap-2 bg-slate-900 text-white font-black text-xs px-4 py-2.5 rounded-xl hover:bg-slate-700 transition-all">
            <Package size={12} /> Nowy pakiet
          </button>
        </div>
      </div>

      {/* Tab switch */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
        {(['packages', 'customers'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
            {v === 'packages' ? `Katalog (${packages.length})` : `Klienci (${customerPackages.filter(c => c.status === 'active').length})`}
          </button>
        ))}
      </div>

      {/* Package catalog form */}
      {showPackageForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nowy pakiet</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nazwa pakietu</label>
              <input value={pkgForm.name} onChange={e => setPkgForm(p => ({ ...p, name: e.target.value }))}
                placeholder="np. Pakiet 10 wizyt"
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Liczba wizyt</label>
              <div className="flex gap-2 mt-1">
                {COUNTS.map(c => (
                  <button key={c} onClick={() => setPkgForm(p => ({ ...p, count: c }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-black border-2 transition-all ${pkgForm.count === c ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500'}`}>
                    {c}×
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ważność</label>
              <div className="flex gap-2 mt-1">
                {VALID_DAYS.map(d => (
                  <button key={d} onClick={() => setPkgForm(p => ({ ...p, validDays: d }))}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black border-2 transition-all ${pkgForm.validDays === d ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500'}`}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cena pakietu (PLN)</label>
              <input type="number" value={pkgForm.price} onChange={e => setPkgForm(p => ({ ...p, price: Number(e.target.value) }))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kolor</label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setPkgForm(p => ({ ...p, color: c }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${pkgForm.color === c ? 'border-slate-900 scale-125' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSavePackage} disabled={!pkgForm.name.trim() || saving}
              className="bg-indigo-600 text-white font-black text-xs px-5 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50">
              {saving ? <RefreshCw size={12} className="animate-spin" /> : 'Zapisz pakiet'}
            </button>
            <button onClick={() => setShowPackageForm(false)} className="text-slate-500 text-xs font-black px-4 py-2.5 hover:text-slate-700">
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* Assign form */}
      {showAssignForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Przypisz pakiet do klienta</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pakiet</label>
              <select value={assignForm.packageId} onChange={e => setAssignForm(p => ({ ...p, packageId: e.target.value }))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                <option value="">— wybierz pakiet —</option>
                {packages.filter(p => p.active).map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.count}×, {p.price} PLN)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Klient *</label>
              <input value={assignForm.customerName} onChange={e => setAssignForm(p => ({ ...p, customerName: e.target.value }))}
                placeholder="Imię i nazwisko"
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAssign} disabled={!assignForm.packageId || !assignForm.customerName.trim() || saving}
              className="bg-indigo-600 text-white font-black text-xs px-5 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50">
              Przypisz pakiet
            </button>
            <button onClick={() => setShowAssignForm(false)} className="text-slate-500 text-xs font-black px-4 py-2.5">Anuluj</button>
          </div>
        </div>
      )}

      {/* Packages list */}
      {view === 'packages' && (
        <div className="space-y-3">
          {packages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
              <Package size={24} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Brak pakietów — utwórz pierwszy</p>
            </div>
          ) : packages.map(pkg => (
            <div key={pkg.id} className={`bg-white rounded-2xl border-2 p-5 flex items-center gap-4 transition-all ${pkg.active ? 'border-slate-200' : 'border-slate-100 opacity-50'}`}>
              <div className="w-3 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: pkg.color }} />
              <div className="flex-1">
                <p className="font-black text-slate-900">{pkg.name}</p>
                <p className="text-xs text-slate-500">{pkg.count} wizyt · ważny {pkg.validDays} dni</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-indigo-700">{pkg.price.toLocaleString('pl-PL')} PLN</p>
                <p className="text-[9px] text-slate-400">{Math.round(pkg.price / pkg.count)} PLN / wizyta</p>
              </div>
              <button onClick={() => handleToggleActive(pkg)}
                className={`px-3 py-1.5 rounded-xl text-[9px] font-black ${pkg.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                {pkg.active ? 'Aktywny' : 'Ukryty'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Customer packages list */}
      {view === 'customers' && (
        <div className="space-y-3">
          {customerPackages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
              Brak sprzedanych pakietów
            </div>
          ) : customerPackages.map(cp => {
            const pkg = packages.find(p => p.id === cp.packageId);
            const pct = cp.total > 0 ? Math.round((cp.used / cp.total) * 100) : 0;
            const isExpired = cp.expiresAt < new Date().toISOString().slice(0, 10);
            return (
              <div key={cp.id} className={`bg-white rounded-2xl border-2 p-5 ${cp.status === 'active' && !isExpired ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-black text-slate-900">{cp.customerName}</p>
                    <p className="text-xs text-slate-500">{pkg?.name ?? cp.packageId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${
                      cp.status === 'active' && !isExpired ? 'bg-emerald-100 text-emerald-700' :
                      cp.status === 'exhausted' ? 'bg-slate-100 text-slate-500' :
                      'bg-red-100 text-red-500'
                    }`}>
                      {isExpired ? 'Wygasły' : cp.status === 'exhausted' ? 'Wyczerpany' : 'Aktywny'}
                    </span>
                    {cp.status === 'active' && !isExpired && (
                      <button onClick={() => handleUseCredit(cp)}
                        className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black text-xs px-3 py-1.5 rounded-xl transition-all">
                        <MinusCircle size={12} /> Użyj wizyty
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Użyte: {cp.used} / {cp.total}</span>
                    <span>Pozostało: {cp.total - cp.used}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[9px] text-slate-400">Ważny do: {cp.expiresAt}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
