import React, { useState, useEffect, useRef } from 'react';
import { Building2, RefreshCw, TrendingUp } from 'lucide-react';
import { db } from '../../../shared/lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { computeLeadScore, scoreLabel } from '../services/leadScoringService';
import type { CustomerStatus } from '../types';

interface Props {
  tenantId: string;
  onSelectCustomer?: (cust: any) => void;
}

const COLUMNS: { id: CustomerStatus; label: string; color: string; headerBg: string }[] = [
  { id: 'prospect', label: 'Prospect',    color: 'border-amber-300',   headerBg: 'bg-amber-50' },
  { id: 'active',   label: 'Aktywny',     color: 'border-emerald-300', headerBg: 'bg-emerald-50' },
  { id: 'churned',  label: 'Utracony',    color: 'border-slate-300',   headerBg: 'bg-slate-100' },
  { id: 'blocked',  label: 'Zablokowany', color: 'border-red-300',     headerBg: 'bg-red-50' },
];

export default function CustomerKanban({ tenantId, onSelectCustomer }: Props) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<CustomerStatus | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'customers'), where('tenantId', '==', tenantId)),
      snap => { setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }
    );
  }, [tenantId]);

  const handleDragStart = (e: React.DragEvent, custId: string) => {
    setDragging(custId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, col: CustomerStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(col);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: CustomerStatus) => {
    e.preventDefault();
    if (!dragging) return;
    const cust = customers.find(c => c.id === dragging);
    if (!cust || cust.status === newStatus) { setDragging(null); setDragOver(null); return; }
    setUpdating(dragging);
    await updateDoc(doc(db, 'customers', dragging), { status: newStatus });
    setUpdating(null);
    setDragging(null);
    setDragOver(null);
  };

  const byStatus = (status: CustomerStatus) =>
    customers.filter(c => c.status === status);

  const fmt = (n: number) => (n / 1000).toFixed(0) + 'k';

  if (loading) {
    return <div className="flex justify-center py-20"><RefreshCw size={20} className="animate-spin text-indigo-400" /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Kanban Klientów</h3>
        <p className="text-xs text-slate-500 mt-0.5">Przeciągnij klienta do kolumny aby zmienić status</p>
      </div>

      <div className="grid grid-cols-4 gap-4 min-h-[500px]">
        {COLUMNS.map(col => {
          const colCustomers = byStatus(col.id);
          const totalRevenue = colCustomers.reduce((s, c) => s + (c.totalRevenue ?? 0), 0);
          const isOver = dragOver === col.id;
          return (
            <div key={col.id}
              onDragOver={e => handleDragOver(e, col.id)}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => handleDrop(e, col.id)}
              className={`rounded-2xl border-2 transition-all flex flex-col ${col.color} ${isOver ? 'bg-indigo-50 scale-[1.01]' : 'bg-white'}`}>
              {/* Column header */}
              <div className={`${col.headerBg} rounded-t-2xl px-4 py-3 border-b-2 ${col.color}`}>
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{col.label}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] font-bold text-slate-500">{colCustomers.length} klientów</span>
                  {totalRevenue > 0 && (
                    <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                      <TrendingUp size={9} />{fmt(totalRevenue)} PLN
                    </span>
                  )}
                </div>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[600px]">
                {colCustomers.map(cust => {
                  const score = computeLeadScore({
                    lastActivityMs: cust.lastActivityAt?.toDate?.()?.getTime() ?? 0,
                    totalRevenue: cust.totalRevenue ?? 0,
                    hasActiveDeal: false,
                    serviceEventCount: cust.serviceEventCount ?? 0,
                    activityCount30Days: 0,
                  }).total;
                  const sl = scoreLabel(score);
                  const isUpdating = updating === cust.id;
                  return (
                    <div key={cust.id}
                      draggable
                      onDragStart={e => handleDragStart(e, cust.id)}
                      onDragEnd={() => { setDragging(null); setDragOver(null); }}
                      onClick={() => onSelectCustomer?.(cust)}
                      className={`bg-white rounded-xl border border-slate-200 p-3 cursor-grab active:cursor-grabbing transition-all select-none ${
                        dragging === cust.id ? 'opacity-40 scale-95' : 'hover:border-indigo-300 hover:shadow-sm'
                      } ${isUpdating ? 'animate-pulse' : ''}`}>
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 size={12} className="text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-slate-800 truncate leading-tight">{cust.name}</p>
                          {cust.city && <p className="text-[9px] text-slate-400">{cust.city}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${sl.bg} ${sl.color}`}>{score}</span>
                        {cust.totalRevenue > 0 && (
                          <span className="text-[8px] text-emerald-700 font-bold">{fmt(cust.totalRevenue)}</span>
                        )}
                        {(cust.tags ?? []).slice(0, 1).map((t: string) => (
                          <span key={t} className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {colCustomers.length === 0 && (
                  <div className={`rounded-xl border-2 border-dashed p-4 text-center text-[9px] text-slate-400 transition-all ${isOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'}`}>
                    {isOver ? 'Upuść tutaj' : 'Brak klientów'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
