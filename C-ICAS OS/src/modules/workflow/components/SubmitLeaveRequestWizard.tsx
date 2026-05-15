import React, { useState } from 'react';
import { CalendarDays, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props {
  onComplete: (docId: string) => void;
  onCancel: () => void;
}

type LeaveType = 'vacation' | 'sick' | 'childcare' | 'unpaid' | 'special' | 'parental';
type Step = 'leave' | 'review';

const LEAVE_LABELS: Record<LeaveType, string> = {
  vacation: 'Urlop wypoczynkowy',
  sick: 'Zwolnienie lekarskie (L4)',
  childcare: 'Opieka nad dzieckiem (art. 188 KP)',
  unpaid: 'Urlop bezpłatny',
  special: 'Urlop okolicznościowy',
  parental: 'Urlop macierzyński / rodzicielski',
};

const LEAVE_COLORS: Record<LeaveType, string> = {
  vacation: 'bg-blue-50 border-blue-200 text-blue-700',
  sick: 'bg-red-50 border-red-200 text-red-700',
  childcare: 'bg-pink-50 border-pink-200 text-pink-700',
  unpaid: 'bg-slate-50 border-slate-200 text-slate-600',
  special: 'bg-amber-50 border-amber-200 text-amber-700',
  parental: 'bg-purple-50 border-purple-200 text-purple-700',
};

function calcWorkdays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start), e = new Date(end);
  if (s > e) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export default function SubmitLeaveRequestWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [step, setStep] = useState<Step>('leave');
  const [leaveType, setLeaveType] = useState<LeaveType>('vacation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const days = calcWorkdays(startDate, endDate);
  const canProceed = startDate && endDate && new Date(startDate) <= new Date(endDate);

  const handleSubmit = async () => {
    if (!user || !activeTenantId) return;
    setLoading(true);
    setError('');
    try {
      const title = `${LEAVE_LABELS[leaveType]} — ${user.email} — ${startDate} → ${endDate}`;
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '', 'LEAVE_REQUEST', 'default-leave',
        { title, leaveType, leaveStartDate: startDate, leaveEndDate: endDate, leaveDays: days, leaveReason: reason.trim() || undefined },
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL',
        { stepType: 'APPROVAL', note: `Wniosek urlopowy: ${days} dni roboczych.` });
      onComplete(docId);
    } catch (e: any) {
      setError(e.message ?? 'Błąd wysyłania.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <button onClick={onCancel} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 mb-4 block">← Anuluj</button>
        <div className="flex items-center gap-3 mb-1">
          <CalendarDays size={20} className="text-blue-600" />
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Wniosek urlopowy</h3>
        </div>
        <p className="text-slate-400 text-sm font-medium">Urlop, L4, opieka, urlop bezpłatny — trafia do przełożonego.</p>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {(['leave', 'review'] as Step[]).map((s, i) => (
          <div key={s} className="flex-1 flex flex-col gap-1">
            <div className={`h-1 rounded-full ${i <= (['leave', 'review'] as Step[]).indexOf(step) ? 'bg-blue-600' : 'bg-slate-200'}`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${s === step ? 'text-blue-600' : 'text-slate-400'}`}>
              {s === 'leave' ? 'Wniosek' : 'Wyślij'}
            </span>
          </div>
        ))}
      </div>

      {step === 'leave' && (
        <div className="space-y-5">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Typ nieobecności</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(LEAVE_LABELS) as LeaveType[]).map(t => (
                <button key={t} onClick={() => setLeaveType(t)}
                  className={`p-3 rounded-2xl border text-left transition-all ${leaveType === t ? LEAVE_COLORS[t] + ' ring-2 ring-current' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                  <p className="text-xs font-black">{LEAVE_LABELS[t]}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Od *</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Do *</label>
              <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          {days > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3">
              <p className="text-sm font-black text-blue-700">{days} dni roboczych</p>
            </div>
          )}
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Powód / uwagi (opcjonalnie)</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="Planowany wypoczynek, hospitalizacja, opieka nad chorym dzieckiem..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-[2rem] p-6 space-y-3">
            <Row label="Typ" value={LEAVE_LABELS[leaveType]} />
            <Row label="Od" value={startDate} />
            <Row label="Do" value={endDate} />
            <Row label="Dni roboczych" value={String(days)} />
            {reason && <Row label="Powód" value={reason} />}
          </div>
          <div className="bg-blue-50 rounded-[2rem] p-4 border border-blue-100">
            <p className="text-[10px] text-blue-700 font-bold">Wniosek trafi do przełożonego. Po zatwierdzeniu zostanie zapisany w systemie HR.</p>
          </div>
          {error && <p className="text-red-600 text-xs font-bold flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={() => step === 'leave' ? onCancel() : setStep('leave')}
          className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">
          ← {step === 'leave' ? 'Anuluj' : 'Wstecz'}
        </button>
        {step === 'leave' ? (
          <button disabled={!canProceed} onClick={() => setStep('review')}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest">
            Dalej →
          </button>
        ) : (
          <button disabled={loading} onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-blue-500/20">
            {loading ? 'Wysyłanie...' : <><CheckCircle2 size={14} /> Wyślij wniosek</>}
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">{label}</span>
      <span className="text-xs font-bold text-slate-800 text-right">{value}</span>
    </div>
  );
}
