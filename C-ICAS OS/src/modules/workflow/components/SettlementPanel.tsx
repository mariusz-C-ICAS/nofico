import React, { useEffect, useState } from 'react';
import { Banknote, CheckCircle2, AlertTriangle, Loader2, Clock, Send } from 'lucide-react';
import type { SettlementRecord, DocumentInstance } from '../types';
import {
  createSettlementRecord, getSettlementRecord,
  updateSettlementIban, markSettlementInitiated, markSettlementCompleted,
} from '../services/settlementService';

interface Props {
  tenantId: string;
  document: DocumentInstance;
  actorId: string;
}

const STATUS_CONFIG: Record<SettlementRecord['status'], { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Oczekuje',    color: 'text-amber-700 bg-amber-50 border-amber-200',  icon: <Clock size={14} /> },
  initiated: { label: 'W realizacji', color: 'text-blue-700 bg-blue-50 border-blue-200',   icon: <Send size={14} /> },
  completed: { label: 'Wypłacono',   color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: <CheckCircle2 size={14} /> },
  failed:    { label: 'Błąd',        color: 'text-red-700 bg-red-50 border-red-200',       icon: <AlertTriangle size={14} /> },
};

export default function SettlementPanel({ tenantId, document: docInstance, actorId }: Props) {
  const [settlement, setSettlement] = useState<SettlementRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [iban, setIban] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, [docInstance.id]);

  const load = async () => {
    setLoading(true);
    try {
      let rec = await getSettlementRecord(tenantId, docInstance.id);
      if (!rec) rec = await createSettlementRecord(tenantId, docInstance, actorId);
      setSettlement(rec);
      setIban(rec.recipientIban ?? '');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateIban = async () => {
    if (!settlement || !iban.trim()) return;
    setSaving(true);
    await updateSettlementIban(tenantId, settlement.id, iban.trim());
    setSettlement(s => s ? { ...s, recipientIban: iban.trim() } : s);
    setSaving(false);
  };

  const handleInitiate = async () => {
    if (!settlement || !transferRef.trim()) {
      setError('Podaj referencję przelewu');
      return;
    }
    setError('');
    setSaving(true);
    await markSettlementInitiated(tenantId, settlement.id, transferRef.trim());
    setSettlement(s => s ? { ...s, status: 'initiated', transferRef: transferRef.trim() } : s);
    setSaving(false);
  };

  const handleComplete = async () => {
    if (!settlement) return;
    setSaving(true);
    await markSettlementCompleted(tenantId, settlement.id);
    setSettlement(s => s ? { ...s, status: 'completed' } : s);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={18} className="text-teal-400 animate-spin" />
      </div>
    );
  }

  if (!settlement) return null;

  const statusCfg = STATUS_CONFIG[settlement.status];

  return (
    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-[2rem] border border-teal-100 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Banknote size={16} className="text-teal-600" />
          <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
            Rozliczenie — zwrot gotówki
          </span>
        </div>
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase border ${statusCfg.color}`}>
          {statusCfg.icon}{statusCfg.label}
        </span>
      </div>

      {/* Who / What / How much */}
      <div className="bg-white rounded-2xl p-4 space-y-2.5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <SettlRow label="Komu" value={settlement.recipientName ?? settlement.recipientEmail} />
          <SettlRow label="Email" value={settlement.recipientEmail} />
          <SettlRow label="Ile" value={`${settlement.amount.toFixed(2)} ${settlement.currency}`} highlight />
          <SettlRow label="Za co" value={docInstance.metadata.title} />
        </div>
        <div className="pt-2 border-t border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Tytuł przelewu</p>
          <p className="text-xs font-mono text-slate-700 break-all">{settlement.transferTitle}</p>
        </div>
      </div>

      {/* IBAN */}
      <div className="space-y-2">
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
          IBAN odbiorcy
        </label>
        <div className="flex gap-2">
          <input
            value={iban}
            onChange={e => setIban(e.target.value)}
            placeholder="PL00 0000 0000 0000 0000 0000 0000"
            className="flex-1 bg-white rounded-xl px-4 py-3 text-xs font-mono text-slate-800 border border-slate-200 focus:ring-2 focus:ring-teal-400"
            disabled={settlement.status === 'completed'}
          />
          {settlement.status === 'pending' && (
            <button
              onClick={handleUpdateIban}
              disabled={saving || !iban.trim()}
              className="px-4 py-3 bg-slate-800 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase transition-colors disabled:opacity-40"
            >
              Zapisz
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      {settlement.status === 'pending' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              value={transferRef}
              onChange={e => setTransferRef(e.target.value)}
              placeholder="Nr referencyjny przelewu / ID transakcji"
              className="flex-1 bg-white rounded-xl px-4 py-3 text-xs font-bold text-slate-800 border border-slate-200 focus:ring-2 focus:ring-teal-400"
            />
          </div>
          {error && <p className="text-xs text-red-600 font-bold">{error}</p>}
          <button
            onClick={handleInitiate}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          >
            <Send size={14} /> Inicjuj przelew
          </button>
        </div>
      )}

      {settlement.status === 'initiated' && (
        <div className="space-y-2">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs font-bold text-blue-700">
            Przelew w realizacji · ref: {settlement.transferRef}
          </div>
          <button
            onClick={handleComplete}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          >
            <CheckCircle2 size={14} /> Potwierdź wypłatę
          </button>
        </div>
      )}

      {settlement.status === 'completed' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-black text-emerald-800">Wypłacono</p>
            <p className="text-xs text-emerald-600">ref: {settlement.transferRef}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SettlRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase">{label}</p>
      <p className={`text-sm font-black ${highlight ? 'text-teal-700' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}
