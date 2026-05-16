/**
 * Data: 2026-05-14
 * Ścieżka: /src/modules/lms/components/CertificateManager.tsx
 */
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Award, Download, Search, AlertTriangle,
  CheckCircle2, XCircle, Bell, Filter
} from 'lucide-react';

interface Certificate {
  id: string; certNo: string;
  employee: string; employeeDept: string;
  course: string; category: string;
  issuedDate: string; expiryDate: string | null;
  status: 'active' | 'expiring' | 'expired';
}

const CERTS: Certificate[] = [
  { id: 'cert1', certNo: 'CIAS-2026-0041', employee: 'Anna Kowalska', employeeDept: 'HR', course: 'BHP Podstawowe 2026', category: 'BHP', issuedDate: '2026-04-12', expiryDate: '2027-04-12', status: 'active' },
  { id: 'cert2', certNo: 'CIAS-2026-0042', employee: 'Piotr Nowak', employeeDept: 'IT', course: 'RODO / GDPR Compliance', category: 'Compliance', issuedDate: '2026-04-28', expiryDate: '2027-04-28', status: 'active' },
  { id: 'cert3', certNo: 'CIAS-2026-0043', employee: 'Marek Wisniewski', employeeDept: 'Produkcja', course: 'BHP Podstawowe 2026', category: 'BHP', issuedDate: '2025-05-10', expiryDate: '2026-05-10', status: 'expiring' },
  { id: 'cert4', certNo: 'CIAS-2025-0011', employee: 'Katarzyna Zielinska', employeeDept: 'Finanse', course: 'RODO / GDPR Compliance', category: 'Compliance', issuedDate: '2025-01-15', expiryDate: '2026-01-15', status: 'expired' },
  { id: 'cert5', certNo: 'CIAS-2026-0044', employee: 'Tomasz Kaminski', employeeDept: 'Logistyka', course: 'Onboarding C-ICAS', category: 'Onboarding', issuedDate: '2026-03-01', expiryDate: null, status: 'active' },
  { id: 'cert6', certNo: 'CIAS-2026-0045', employee: 'Agnieszka Lewandowska', employeeDept: 'Sprzedaz', course: 'Komunikacja i Feedback', category: 'Soft Skills', issuedDate: '2026-05-02', expiryDate: null, status: 'active' },
  { id: 'cert7', certNo: 'CIAS-2026-0046', employee: 'Robert Wojcik', employeeDept: 'Produkcja', course: 'Pierwsza Pomoc (Urazowa)', category: 'BHP', issuedDate: '2025-05-14', expiryDate: '2026-06-14', status: 'expiring' },
  { id: 'cert8', certNo: 'CIAS-2026-0047', employee: 'Anna Kowalska', employeeDept: 'HR', course: 'Onboarding C-ICAS', category: 'Onboarding', issuedDate: '2026-01-08', expiryDate: null, status: 'active' },
];

const STATUS_CONFIG = {
  active: { label: 'Aktywny', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, iconCls: 'text-emerald-500' },
  expiring: { label: 'Wygasa wkrotce', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle, iconCls: 'text-amber-500' },
  expired: { label: 'Wygasl', cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle, iconCls: 'text-rose-500' },
};

export default function CertificateManager() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');
  const [notifications, setNotifications] = useState(true);

  const stats = useMemo(() => ({
    total: CERTS.length,
    expiring: CERTS.filter((c) => c.status === 'expiring').length,
    expired: CERTS.filter((c) => c.status === 'expired').length,
    active: CERTS.filter((c) => c.status === 'active').length,
  }), []);

  const filtered = useMemo(() => {
    return CERTS.filter((c) => {
      const matchSearch =
        c.employee.toLowerCase().includes(search.toLowerCase()) ||
        c.course.toLowerCase().includes(search.toLowerCase()) ||
        c.certNo.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || c.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [search, filterStatus]);

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[
          { label: 'Wystawione', value: stats.total, color: 'indigo', Icon: Award },
          { label: 'Aktywne', value: stats.active, color: 'emerald', Icon: CheckCircle2 },
          { label: 'Wygasaja', value: stats.expiring, color: 'amber', Icon: AlertTriangle },
          { label: 'Wygasle', value: stats.expired, color: 'rose', Icon: XCircle },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="bg-white border-2 border-slate-100 rounded-[2rem] p-7 shadow-sm flex items-center gap-5">
            <Icon size={22} className={
              color === 'indigo' ? 'text-indigo-500' :
              color === 'emerald' ? 'text-emerald-500' :
              color === 'amber' ? 'text-amber-500' : 'text-rose-500'
            } />
            <div>
              <div className="text-2xl font-black italic text-slate-900">{value}</div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Notification Setting */}
      {stats.expiring > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between bg-amber-50 border-2 border-amber-200 rounded-[2rem] p-6"
        >
          <div className="flex items-center gap-4">
            <Bell size={20} className="text-amber-600" />
            <div>
              <div className="text-sm font-black text-slate-800 uppercase italic tracking-tight">
                {stats.expiring} certyfikaty wygasaja w ciagu 30 dni
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                Automatyczne powiadomienia email dla pracownikow i HR
              </div>
            </div>
          </div>
          <button
            onClick={() => setNotifications(!notifications)}
            className={`flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
              notifications
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            }`}
          >
            <Bell size={13} />
            {notifications ? 'Powiadomienia wl.' : 'Wlacz powiadomienia'}
          </button>
        </motion.div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj po pracowniku, kursie lub nr certyfikatu..."
            className="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-100 rounded-[2rem] outline-none focus:border-indigo-400 transition-all text-sm font-black text-slate-700 placeholder:font-normal placeholder:text-slate-400 shadow-sm"
          />
        </div>
        <div className="flex gap-2 items-center">
          <Filter size={14} className="text-slate-400" />
          {(['all', 'active', 'expiring', 'expired'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-5 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                filterStatus === s
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {s === 'all' ? 'Wszystkie' : s === 'active' ? 'Aktywne' : s === 'expiring' ? 'Wygasaja' : 'Wygasle'}
            </button>
          ))}
        </div>
      </div>

      {/* Certificates Table */}
      <div className="bg-white border-2 border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto] gap-px bg-slate-100">
          {['Nr Certyfikatu', 'Pracownik / Dzial', 'Kurs', 'Wystawiony', 'Wygasa', 'Akcje'].map((h) => (
            <div key={h} className="bg-slate-50 px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              {h}
            </div>
          ))}
        </div>

        {filtered.map((cert, i) => {
          const cfg = STATUS_CONFIG[cert.status];
          return (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto] gap-px bg-slate-100 hover:bg-indigo-50 transition-colors group"
            >
              <div className="bg-white px-6 py-5 flex items-center gap-3">
                <Award size={14} className="text-indigo-500 shrink-0" />
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{cert.certNo}</span>
              </div>
              <div className="bg-white px-6 py-5">
                <div className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{cert.employee}</div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{cert.employeeDept}</div>
              </div>
              <div className="bg-white px-6 py-5">
                <div className="text-[11px] font-black text-slate-700 leading-tight">{cert.course}</div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{cert.category}</div>
              </div>
              <div className="bg-white px-6 py-5 flex items-center">
                <span className="text-[11px] font-black text-slate-600">{cert.issuedDate}</span>
              </div>
              <div className="bg-white px-6 py-5 flex items-center">
                {cert.expiryDate ? (
                  <div className="flex items-center gap-2">
                    <cfg.icon size={13} className={cfg.iconCls} />
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${cfg.cls} uppercase tracking-widest`}>
                      {cert.expiryDate}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bezterminowy</span>
                )}
              </div>
              <div className="bg-white px-6 py-5 flex items-center">
                <button className="flex items-center gap-2 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-600 px-5 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all">
                  <Download size={13} /> PDF
                </button>
              </div>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Award size={40} className="text-slate-200" />
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Brak certyfikatow spelniajacych kryteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
