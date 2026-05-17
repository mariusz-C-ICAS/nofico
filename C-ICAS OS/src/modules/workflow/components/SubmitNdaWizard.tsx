import React, { useState } from 'react';
import { ArrowLeft, Check, AlertTriangle, Lock, FileText } from 'lucide-react';
import { useAuth } from '../../../shared/hooks/AuthContext';
import { useTenant } from '../../../shared/hooks/useTenant';
import { useCompany } from '../../../core/auth/CompanyContext';
import { createDocumentInstance, transitionDocument } from '../services/workflowEngine';

interface Props { onComplete: (docId: string) => void; onCancel: () => void; }

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-slate-400 focus:border-transparent outline-none transition-all';

export default function SubmitNdaWizard({ onComplete, onCancel }: Props) {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [parties, setParties] = useState('');
  const [scope, setScope] = useState('');
  const [durationYears, setDurationYears] = useState(3);
  const [penalty, setPenalty] = useState('');
  const [governingLaw, setGoverningLaw] = useState('polskie');
  const [hasAttachment, setHasAttachment] = useState(false);
  const [ndaType, setNdaType] = useState<'mutual' | 'one-way'>('mutual');

  const isValid = title.trim().length > 2 && parties.trim().length > 5 && scope.trim().length > 10;

  const handleSubmit = async () => {
    if (!user || !activeTenantId || !isValid) return;
    setLoading(true); setError('');
    try {
      const docId = await createDocumentInstance(
        activeTenantId, user.uid, user.email ?? '',
        'NDA', 'default-nda',
        {
          title,
          invoiceDate: new Date().toISOString().split('T')[0],
          vendor: parties.split('\n')[0]?.trim() || '',
          description: `Typ: ${ndaType === 'mutual' ? 'Wzajemny' : 'Jednostronny'}\nStrony:\n${parties}\n\nZakres poufności:\n${scope}\n\nOkres: ${durationYears} lat\nKary umowne: ${penalty}\nPrawo właściwe: ${governingLaw}`,
        },
        hasAttachment ? [{ id: 'tmp', name: 'nda-draft.pdf', size: 0, mimeType: 'application/pdf', hash: '', isLocalOnly: true, uploadedAt: null, uploadedBy: user.uid }] : [],
        currentCompany?.id
      );
      await transitionDocument(activeTenantId, docId, 'SUBMIT', user.uid, user.email ?? '', 'PENDING_APPROVAL', {
        stepDefId: 'step-submit', stepType: 'APPROVAL', note: 'NDA wysłane do przeglądu prawnego.',
      });
      onComplete(docId);
    } catch (e: any) { setError(e.message ?? 'Błąd podczas wysyłania.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center"><Lock size={18} className="text-slate-600" /></div>
        <div>
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">NDA / CONFIDENTIALITY</span>
          <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 leading-none">Umowa o Poufności</h3>
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Tytuł umowy *"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="NDA z [nazwa firmy] – [rok]" className={INPUT} /></Field>

        <Field label="Typ NDA">
          <div className="flex gap-3">
            {[{ val: 'mutual', label: 'Wzajemny (NDA)' }, { val: 'one-way', label: 'Jednostronny' }].map(t => (
              <button key={t.val} type="button" onClick={() => setNdaType(t.val as any)}
                className={`flex-1 py-2.5 rounded-2xl text-[9px] font-black uppercase transition-all border ${ndaType === t.val ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Strony umowy * (każda w nowej linii: Nazwa | Rola)">
          <textarea value={parties} onChange={e => setParties(e.target.value)} rows={3} placeholder="Acme Sp. z o.o. | Ujawniający&#10;XYZ S.A. | Odbierający" className={INPUT + ' resize-none'} />
        </Field>

        <Field label="Zakres poufności * (min. 10 znaków)">
          <textarea value={scope} onChange={e => setScope(e.target.value)} rows={3} placeholder="Technologia, plany biznesowe, dane klientów, know-how..." className={INPUT + ' resize-none'} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Czas obowiązywania (lata)">
            <input type="number" min="1" max="20" value={durationYears} onChange={e => setDurationYears(Number(e.target.value))} className={INPUT} />
          </Field>
          <Field label="Prawo właściwe">
            <select value={governingLaw} onChange={e => setGoverningLaw(e.target.value)} className={INPUT}>
              <option value="polskie">Polskie (KC)</option>
              <option value="angielskie">Angielskie</option>
              <option value="niemieckie">Niemieckie</option>
              <option value="unijne">Prawo UE</option>
            </select>
          </Field>
        </div>

        <Field label="Kary umowne (opcjonalnie)"><input value={penalty} onChange={e => setPenalty(e.target.value)} placeholder="np. 50 000 PLN za każde naruszenie" className={INPUT} /></Field>

        <label className="flex items-center gap-3 cursor-pointer bg-slate-50 rounded-2xl px-4 py-3 border border-slate-200">
          <input type="file" className="hidden" accept=".pdf,.docx" onChange={e => setHasAttachment(!!e.target.files?.length)} />
          <FileText size={16} className={hasAttachment ? 'text-emerald-600' : 'text-slate-300'} />
          <span className={`text-xs font-bold uppercase ${hasAttachment ? 'text-emerald-700' : 'text-slate-400'}`}>
            {hasAttachment ? 'Plik NDA dołączony' : 'Dołącz wersję roboczą NDA (PDF/DOCX)'}
          </span>
        </label>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-xs font-bold"><AlertTriangle size={13} />{error}</div>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all"><ArrowLeft size={13} />Anuluj</button>
        <button onClick={handleSubmit} disabled={loading || !isValid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase hover:bg-slate-700 disabled:opacity-40 transition-all">
          {loading ? 'Wysyłanie...' : <><Check size={13} />Wyślij do przeglądu prawnego</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>{children}</div>;
}
