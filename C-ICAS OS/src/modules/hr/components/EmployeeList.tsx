/**
 * Data: 2026-05-16
 * Ścieżka: /src/modules/hr/components/EmployeeList.tsx
 */
import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, Eye, Pencil, UserMinus, Plus, X, Loader2, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../../shared/lib/firebase';
import { storage } from '../../../shared/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, getDocs, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  contractType: 'UoP' | 'B2B' | 'UoZ';
  startDate: string;
  status: 'active' | 'onLeave' | 'terminated';
  photoURL?: string;
}

const DEPARTMENTS = ['Wszystkie', 'IT', 'HR', 'Finanse', 'Produkcja', 'Sprzedaż'];
const CONTRACT_TYPES: ('Wszystkie' | 'UoP' | 'B2B' | 'UoZ')[] = ['Wszystkie', 'UoP', 'B2B', 'UoZ'];
const STATUSES: ('Wszystkie' | 'active' | 'onLeave' | 'terminated')[] = ['Wszystkie', 'active', 'onLeave', 'terminated'];

const STATUS_MAP: Record<string, { labelKey: string; classes: string }> = {
  active:     { labelKey: 'hr.employees.status.active',     classes: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  onLeave:    { labelKey: 'hr.employees.status.onLeave',    classes: 'bg-amber-50 text-amber-600 border-amber-100'       },
  terminated: { labelKey: 'hr.employees.status.terminated', classes: 'bg-rose-50 text-rose-600 border-rose-100'          },
};

function initials(e: Employee) {
  return `${e.firstName[0]}${e.lastName[0]}`.toUpperCase();
}

function AvatarCircle({ emp, size = 'md' }: { emp: Employee; size?: 'sm' | 'md' | 'lg' }) {
  const colors: Record<string, string> = {
    IT: 'bg-indigo-100 text-indigo-700', HR: 'bg-rose-100 text-rose-700',
    Finanse: 'bg-emerald-100 text-emerald-700', Produkcja: 'bg-amber-100 text-amber-700',
    Sprzedaż: 'bg-violet-100 text-violet-700',
  };
  const sz = size === 'sm' ? 'w-8 h-8 text-[10px]' : size === 'lg' ? 'w-16 h-16 text-lg' : 'w-11 h-11 text-xs';
  if (emp.photoURL) {
    return <img src={emp.photoURL} alt={initials(emp)} className={`${sz} rounded-2xl object-cover border border-slate-100`} />;
  }
  return (
    <div className={`${sz} rounded-2xl flex items-center justify-center font-black ${colors[emp.department] ?? 'bg-slate-100 text-slate-600'}`}>
      {initials(emp)}
    </div>
  );
}

const EMPTY_FORM = { firstName: '', lastName: '', position: '', department: 'IT', startDate: '', contractType: 'UoP' as 'UoP' | 'B2B' | 'UoZ', photoURL: '' };

export default function EmployeeList() {
  const { t } = useTranslation();
  const { activeTenantId } = useAuth() as any;
  const [search, setSearch]         = useState('');
  const [deptFilter, setDeptFilter] = useState('Wszystkie');
  const [ctFilter, setCtFilter]     = useState<'Wszystkie' | 'UoP' | 'B2B' | 'UoZ'>('Wszystkie');
  const [stFilter, setStFilter]     = useState<'Wszystkie' | 'active' | 'onLeave' | 'terminated'>('Wszystkie');
  const [showModal, setShowModal]   = useState(false);
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const [viewEmp, setViewEmp]       = useState<Employee | null>(null);

  useEffect(() => {
    if (!activeTenantId) return;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, `tenants/${activeTenantId}/employees`));
        setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() } as Employee)));
      } finally {
        setLoading(false);
      }
    })();
  }, [activeTenantId]);

  const filtered = employees.filter(e => {
    const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
    if (search && !fullName.includes(search.toLowerCase())) return false;
    if (deptFilter !== 'Wszystkie' && e.department !== deptFilter)  return false;
    if (ctFilter   !== 'Wszystkie' && e.contractType !== ctFilter)  return false;
    if (stFilter   !== 'Wszystkie' && e.status !== stFilter)        return false;
    return true;
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, empId?: string) => {
    const file = e.target.files?.[0];
    if (!file || !activeTenantId) return;
    setPhotoUploading(true);
    try {
      const id = empId ?? `new_${Date.now()}`;
      const ref = storageRef(storage, `employees/${activeTenantId}/${id}/${file.name}`);
      await uploadBytes(ref, file);
      const url = await getDownloadURL(ref);
      if (empId) {
        // Update existing employee
        await updateDoc(doc(db, `tenants/${activeTenantId}/employees`, empId), { photoURL: url });
        setEmployees(prev => prev.map(emp => emp.id === empId ? { ...emp, photoURL: url } : emp));
        if (viewEmp?.id === empId) setViewEmp(v => v ? { ...v, photoURL: url } : v);
      } else {
        setForm(f => ({ ...f, photoURL: url }));
      }
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleAdd = async () => {
    if (!activeTenantId || !form.firstName || !form.lastName) return;
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, `tenants/${activeTenantId}/employees`), {
        firstName: form.firstName, lastName: form.lastName,
        position: form.position, department: form.department,
        contractType: form.contractType,
        startDate: form.startDate || new Date().toISOString().split('T')[0],
        status: 'active', isActive: true, tenantId: activeTenantId,
        ...(form.photoURL && { photoURL: form.photoURL }),
        createdAt: Timestamp.now(),
      });
      setEmployees(prev => [...prev, { id: docRef.id, ...form, startDate: form.startDate || new Date().toISOString().split('T')[0], status: 'active' }]);
      setForm(EMPTY_FORM);
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('hr.employees.searchPlaceholder')}
              className="pl-10 pr-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-400 w-56 uppercase tracking-wide" />
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-2xl p-1">
            <Filter size={12} className="text-slate-400 ml-2" />
            {DEPARTMENTS.map(d => (
              <button key={d} onClick={() => setDeptFilter(d)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${deptFilter === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {d}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-2xl p-1">
            {CONTRACT_TYPES.map(ct => (
              <button key={ct} onClick={() => setCtFilter(ct)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${ctFilter === ct ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {ct}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-2xl p-1">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStFilter(s)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${stFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {s === 'Wszystkie' ? t('hr.employees.statusFilter.all') : s === 'active' ? t('hr.employees.statusFilter.active') : s === 'onLeave' ? t('hr.employees.statusFilter.onLeave') : t('hr.employees.statusFilter.terminated')}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setShowModal(true)}
          className="bg-slate-900 text-white px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 whitespace-nowrap">
          <Plus size={15} /> {t('hr.employees.add')}
        </button>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {[t('hr.employees.columns.employee'), t('hr.employees.columns.department'), t('hr.employees.columns.position'), t('hr.employees.columns.contract'), t('hr.employees.columns.startDate'), t('hr.employees.columns.status'), t('hr.employees.columns.actions')].map(h => (
                  <th key={h} className="text-left px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-8 py-10 text-center text-slate-400">
                  <Loader2 className="animate-spin inline mr-2" size={16} /> {t('hr.employees.loading')}
                </td></tr>
              )}
              {!loading && filtered.map((emp, i) => (
                <motion.tr key={emp.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <AvatarCircle emp={emp} />
                      <div>
                        <div className="text-xs font-black text-slate-900 uppercase italic">{emp.firstName} {emp.lastName}</div>
                        <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{emp.id.slice(0, 8).toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5"><span className="text-xs font-black text-slate-600 italic">{emp.department}</span></td>
                  <td className="px-8 py-5"><span className="text-xs font-black text-slate-600 italic">{emp.position}</span></td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${emp.contractType === 'B2B' ? 'bg-violet-50 text-violet-600 border-violet-100' : emp.contractType === 'UoP' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                      {emp.contractType}
                    </span>
                  </td>
                  <td className="px-8 py-5"><span className="text-xs font-black text-slate-500 italic">{emp.startDate}</span></td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${STATUS_MAP[emp.status]?.classes ?? 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                      {STATUS_MAP[emp.status] ? t(STATUS_MAP[emp.status].labelKey) : emp.status}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setViewEmp(emp)} className="p-2.5 rounded-xl bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-500 transition-all"><Eye size={14} /></button>
                      <label className="p-2.5 rounded-xl bg-slate-100 hover:bg-emerald-500 hover:text-white text-slate-500 transition-all cursor-pointer">
                        <Camera size={14} />
                        <input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e, emp.id)} />
                      </label>
                      <button className="p-2.5 rounded-xl bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-500 transition-all"><Pencil size={14} /></button>
                      <button className="p-2.5 rounded-xl bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-500 transition-all"><UserMinus size={14} /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-xs font-black text-slate-300 uppercase tracking-widest italic">{t('hr.employees.noResults')}</p>
            </div>
          )}
        </div>
        <div className="px-8 py-5 border-t border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
            {t('hr.employees.showing', { filtered: filtered.length, total: employees.length })}
          </span>
        </div>
      </div>

      {/* Employee profile view modal */}
      <AnimatePresence>
        {viewEmp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setViewEmp(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()} className="bg-white rounded-[3rem] p-10 w-full max-w-sm shadow-2xl text-center">
              <button onClick={() => setViewEmp(null)} className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"><X size={18} /></button>
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <AvatarCircle emp={viewEmp} size="lg" />
                  <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 rounded-xl flex items-center justify-center cursor-pointer hover:bg-indigo-700 transition-all">
                    <Camera size={12} className="text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e, viewEmp.id)} />
                  </label>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{viewEmp.firstName} {viewEmp.lastName}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{viewEmp.position}</p>
                </div>
              </div>
              <div className="mt-6 space-y-3 text-left">
                {[
                  [t('hr.employees.profileDetail.department'), viewEmp.department],
                  [t('hr.employees.profileDetail.contract'), viewEmp.contractType],
                  [t('hr.employees.profileDetail.startDate'), viewEmp.startDate],
                  [t('hr.employees.profileDetail.status'), STATUS_MAP[viewEmp.status] ? t(STATUS_MAP[viewEmp.status].labelKey) : viewEmp.status],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
                    <span className="text-xs font-black text-slate-700 italic">{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()} className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{t('hr.employees.newEmployee')}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                {/* Photo upload */}
                <div className="flex items-center gap-5">
                  <div className="relative">
                    {form.photoURL
                      ? <img src={form.photoURL} className="w-16 h-16 rounded-2xl object-cover border border-slate-200" alt="avatar" />
                      : <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300"><Camera size={22} /></div>
                    }
                    {photoUploading && <div className="absolute inset-0 rounded-2xl bg-white/70 flex items-center justify-center"><Loader2 size={14} className="animate-spin text-indigo-500" /></div>}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all">
                    <Camera size={13} /> {t('hr.employees.addPhoto')}
                    <input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e)} />
                  </label>
                </div>
                {([
                  { labelKey: 'hr.employees.form.firstName', key: 'firstName', placeholder: 'Jan' },
                  { labelKey: 'hr.employees.form.lastName', key: 'lastName', placeholder: 'Kowalski' },
                  { labelKey: 'hr.employees.form.position', key: 'position', placeholder: 'Developer' },
                  { labelKey: 'hr.employees.form.startDate', key: 'startDate', placeholder: '2026-05-16' },
                ] as const).map(f => (
                  <div key={f.key}>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t(f.labelKey)}</label>
                    <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-700 focus:outline-none focus:border-indigo-400 uppercase tracking-wide" />
                  </div>
                ))}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('hr.employees.form.department')}</label>
                  <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-700 focus:outline-none focus:border-indigo-400 uppercase tracking-wide">
                    {['IT', 'HR', 'Finanse', 'Produkcja', 'Sprzedaż'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('hr.employees.form.contractType')}</label>
                  <select value={form.contractType} onChange={e => setForm(p => ({ ...p, contractType: e.target.value as 'UoP' | 'B2B' | 'UoZ' }))}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-700 focus:outline-none focus:border-indigo-400 uppercase tracking-wide">
                    <option value="UoP">UoP</option>
                    <option value="B2B">B2B</option>
                    <option value="UoZ">UoZ</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
                  {t('hr.employees.cancel')}
                </button>
                <button onClick={handleAdd} disabled={saving || !form.firstName || !form.lastName}
                  className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {t('hr.employees.add')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
