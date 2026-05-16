import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../shared/lib/firebase';
import { CheckCircle2, Circle, X, ChevronRight } from 'lucide-react';
import { dismissOnboardingChecklist } from './onboardingService';

interface Props {
  tenantId: string;
}

const CHECKLIST = [
  { key: 'workspace',  label: 'Utwórz workspace',              hint: 'Ukończone',                    path: '/'                },
  { key: 'profile',   label: 'Uzupełnij profil firmy',         hint: 'Ustawienia → Firmy',           path: '/settings'        },
  { key: 'structure', label: 'Dodaj strukturę organizacyjną',  hint: 'HR → Struktura Org.',          path: '/hr/org-structure' },
  { key: 'invite',    label: 'Zaproś użytkownika',             hint: 'Ustawienia → Członkowie',      path: '/settings'        },
  { key: 'workflow',  label: 'Skonfiguruj pierwszy workflow',  hint: 'Moduł → Workflow',             path: '/workflow'        },
] as const;

export default function OnboardingChecklist({ tenantId }: Props) {
  const [onboarding, setOnboarding] = useState<Record<string, boolean> | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    return onSnapshot(doc(db, 'tenants', tenantId), snap => {
      const data = snap.data();
      if (!data || data.onboardingDismissed || data.onboarding === undefined) {
        setVisible(false);
        return;
      }
      setOnboarding({ workspace: true, ...data.onboarding });
      setVisible(true);
    });
  }, [tenantId]);

  const handleDismiss = async () => {
    setDismissing(true);
    try { await dismissOnboardingChecklist(tenantId); setVisible(false); }
    finally { setDismissing(false); }
  };

  if (!visible || !onboarding) return null;

  const doneCount = CHECKLIST.filter(c => !!onboarding[c.key]).length;
  const pct = Math.round((doneCount / CHECKLIST.length) * 100);

  if (doneCount === CHECKLIST.length) {
    dismissOnboardingChecklist(tenantId);
    return null;
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest">Konfiguracja systemu</h3>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
            {doneCount} / {CHECKLIST.length} kroków · {pct}% gotowe
          </p>
        </div>
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          title="Ukryj checklist"
          className="text-zinc-700 hover:text-zinc-400 transition-colors p-1 mt-0.5"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-zinc-800 rounded-full h-1 mb-4">
        <div
          className="bg-indigo-600 h-1 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Items */}
      <div className="space-y-1">
        {CHECKLIST.map(item => {
          const done = !!onboarding[item.key];
          if (done) {
            return (
              <div key={item.key} className="flex items-center gap-3 px-3 py-2 rounded-xl opacity-50">
                <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                <span className="text-xs font-bold text-zinc-500 line-through flex-1">{item.label}</span>
              </div>
            );
          }
          return (
            <Link
              key={item.key}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zinc-800/60 group transition-all"
            >
              <Circle size={14} className="text-zinc-700 group-hover:text-indigo-400 flex-shrink-0 transition-colors" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-zinc-300 group-hover:text-zinc-100 transition-colors">{item.label}</div>
                <div className="text-[9px] text-zinc-600 uppercase tracking-widest">{item.hint}</div>
              </div>
              <ChevronRight size={12} className="text-zinc-700 group-hover:text-zinc-400 flex-shrink-0 transition-colors" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
