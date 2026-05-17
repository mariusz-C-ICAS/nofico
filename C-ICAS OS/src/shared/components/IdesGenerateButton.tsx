/**
 * Data: 2026-05-17
 * Opis: Maly przycisk floating "Generuj IDES" — widoczny tylko w srodowisku TEST.
 *       Po kliknieciu otwiera wbudowany dialog potwierdzenia, nastepnie uruchamia generator.
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/AuthContext';
import { FlaskConical, Loader2, CheckCircle2, X } from 'lucide-react';

import type { CompanyProfile } from '../utils/idesGenerator/types';
import { MODULE_GENERATORS } from '../utils/idesGenerator';

interface Props {
  moduleKey: string;
}

type Phase = 'idle' | 'confirm' | 'loading' | 'success' | 'error';

const MODULE_LABELS: Record<string, string> = {
  hr:        'HR',
  crm:       'CRM',
  finance:   'Finanse',
  projects:  'Projekty',
  workflow:  'Workflow',
  assets:    'Srodki Trwale',
  documents: 'DMS',
};

export default function IdesGenerateButton({ moduleKey }: Props) {
  const { activeTenantId } = useAuth();
  const [isTestEnv, setIsTestEnv]   = useState(false);
  const [phase, setPhase]           = useState<Phase>('idle');
  const [message, setMessage]       = useState('');

  useEffect(() => {
    if (!activeTenantId) return;
    getDoc(doc(db, 'tenants', activeTenantId))
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data() as any;
          setIsTestEnv(!data.isProduction);
        }
      })
      .catch(() => {});
  }, [activeTenantId]);

  if (!isTestEnv) return null;

  async function handleConfirm() {
    if (!activeTenantId) return;
    setPhase('loading');
    try {
      const snap = await getDoc(doc(db, 'tenants', activeTenantId));
      const data = (snap.exists() ? snap.data() : {}) as any;

      const profile: CompanyProfile = {
        companyName:    data.name          ?? 'Firma testowa',
        companyType:    data.companyType   ?? 'services',
        industry:       data.industry      ?? 'Uslugi',
        employeeCount:  data.employeeCount ?? 20,
        modules:        [moduleKey],
        generateMonths: 13,
        tenantId:       activeTenantId,
      };

      const generator = MODULE_GENERATORS[moduleKey] ?? MODULE_GENERATORS['hr'];
      const result    = await generator(profile);

      setMessage(`Wygenerowano ${result.created} rekordow dla modulu ${MODULE_LABELS[moduleKey] ?? moduleKey}`);
      setPhase('success');
    } catch (err: any) {
      setMessage(err?.message ?? 'Blad generowania danych');
      setPhase('error');
    }
  }

  function reset() {
    setPhase('idle');
    setMessage('');
  }

  const label = MODULE_LABELS[moduleKey] ?? moduleKey;

  return (
    <div className="relative inline-block">
      {/* Przycisk glowny */}
      <button
        onClick={() => setPhase('confirm')}
        title={`Generuj dane IDES dla modulu ${label}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
      >
        <FlaskConical size={12} />
        IDES
      </button>

      {/* Dialog potwierdzenia */}
      {phase === 'confirm' && (
        <div className="absolute top-full mt-2 right-0 z-50 w-64 bg-white border border-violet-200 rounded-2xl shadow-xl p-4">
          <p className="text-xs text-gray-700 mb-3">
            Wygenerowac przykladowe dane dla modulu{' '}
            <span className="font-bold text-violet-700">{label}</span>?
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={reset}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
            >
              Anuluj
            </button>
            <button
              onClick={handleConfirm}
              className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-semibold transition-colors"
            >
              Generuj
            </button>
          </div>
        </div>
      )}

      {/* Spinner podczas generowania */}
      {phase === 'loading' && (
        <div className="absolute top-full mt-2 right-0 z-50 w-52 bg-white border border-violet-200 rounded-2xl shadow-xl p-4 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-violet-600 shrink-0" />
          <span className="text-xs text-gray-600">Generowanie danych...</span>
        </div>
      )}

      {/* Sukces */}
      {phase === 'success' && (
        <div className="absolute top-full mt-2 right-0 z-50 w-64 bg-white border border-green-200 rounded-2xl shadow-xl p-4">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-700 flex-1">{message}</p>
            <button onClick={reset} className="text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Blad */}
      {phase === 'error' && (
        <div className="absolute top-full mt-2 right-0 z-50 w-64 bg-white border border-red-200 rounded-2xl shadow-xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-red-500 text-xs mt-0.5 shrink-0">!</span>
            <p className="text-xs text-red-600 flex-1">{message}</p>
            <button onClick={reset} className="text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
