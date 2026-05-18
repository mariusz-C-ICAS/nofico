/**
 * Data: 2026-05-18
 * Ścieżka: /src/modules/hr/components/EmployeeSelfView.tsx
 * Widok profilu pracownika — wyświetlany gdy zalogowany user jest pracownikiem (nie adminem).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Mail, Briefcase, Calendar, Building2, Clock } from 'lucide-react';
import { db, storage } from '../../../shared/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../../shared/hooks/AuthContext';

interface EmployeeRecord {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  contractType: string;
  startDate: string;
  status: string;
  photoURL?: string;
}

export default function EmployeeSelfView() {
  const { user, activeTenantId } = useAuth() as any;
  const [emp, setEmp] = useState<EmployeeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !activeTenantId) return;
    (async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, `tenants/${activeTenantId}/employees`),
          where('email', '==', user.email)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setEmp({ id: snap.docs[0].id, ...snap.docs[0].data() } as EmployeeRecord);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user, activeTenantId]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !emp || !activeTenantId) return;
    setUploading(true);
    try {
      const ref = storageRef(storage, `employees/${activeTenantId}/${emp.id}/${file.name}`);
      await uploadBytes(ref, file);
      const url = await getDownloadURL(ref);
      await updateDoc(doc(db, `tenants/${activeTenantId}/employees`, emp.id), { photoURL: url });
      setEmp(prev => prev ? { ...prev, photoURL: url } : prev);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="py-20 text-center text-[11px] font-black text-slate-300 uppercase tracking-widest italic">
        Nie znaleziono profilu pracownika dla tego konta.
      </div>
    );
  }

  const STATUS_LABEL: Record<string, string> = {
    active: 'Aktywny', onLeave: 'Na urlopie', terminated: 'Zwolniony',
  };
  const STATUS_COLOR: Record<string, string> = {
    active: 'text-emerald-600 bg-emerald-50', onLeave: 'text-amber-600 bg-amber-50', terminated: 'text-rose-600 bg-rose-50',
  };

  return (
    <div className="max-w-md mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 flex flex-col items-center gap-5">
        {/* Avatar */}
        <div className="relative">
          {emp.photoURL
            ? <img src={emp.photoURL} className="w-24 h-24 rounded-[2rem] object-cover border-2 border-slate-100" alt="avatar" />
            : <div className="w-24 h-24 rounded-[2rem] bg-indigo-100 flex items-center justify-center text-2xl font-black text-indigo-700">
                {emp.firstName[0]}{emp.lastName[0]}
              </div>
          }
          <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center justify-center cursor-pointer transition-all">
            {uploading
              ? <Loader2 size={13} className="animate-spin text-white" />
              : <Camera size={13} className="text-white" />
            }
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
        </div>

        {/* Name & status */}
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">
            {emp.firstName} {emp.lastName}
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{emp.position}</p>
          <span className={`inline-block mt-2 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${STATUS_COLOR[emp.status] ?? 'bg-slate-50 text-slate-500'}`}>
            {STATUS_LABEL[emp.status] ?? emp.status}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 space-y-4">
        {[
          { icon: Building2, label: 'Dział', value: emp.department },
          { icon: Briefcase, label: 'Kontrakt', value: emp.contractType },
          { icon: Calendar, label: 'Data zatrudnienia', value: emp.startDate },
          { icon: Mail, label: 'Email', value: user?.email ?? '—' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-4 py-2 border-b border-slate-50 last:border-0">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
              <Icon size={14} />
            </div>
            <div className="flex-1 flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
              <span className="text-xs font-black text-slate-700 italic">{value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
