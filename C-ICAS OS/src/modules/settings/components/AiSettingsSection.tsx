import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase/config';
import { useTenant, AiMode } from '../../../core/auth/TenantContext';
import { useRole } from '../../../core/auth/useRole';
import { useAiLabel } from '../../../core/ai/useAiLabel';
import { BrainCircuit, Zap, MessageSquare, Shield, Check, Save } from 'lucide-react';

const MODES: {
  mode: AiMode;
  icon: React.ElementType;
  color: string;
  activeBorder: string;
  title: string;
  badge: string;
  description: string;
  capabilities: string[];
  restrictions: string[];
  model: string;
}[] = [
  {
    mode: 'coach',
    icon: Zap,
    color: 'text-indigo-400',
    activeBorder: 'border-indigo-500 bg-indigo-950/30',
    title: 'AI Coach',
    badge: 'Aktywny tryb',
    description: 'Pracuje ZA użytkownika. Automatyzuje, wypełnia dane, generuje raporty i wykonuje akcje w systemie.',
    capabilities: [
      'Automatyczne wypełnianie formularzy i dokumentów',
      'Generowanie raportów i zestawień',
      'Tworzenie wpisów (faktury, umowy, zadania)',
      'Analiza danych i sugestie optymalizacji',
      'Automatyzacja powtarzalnych procesów',
    ],
    restrictions: [],
    model: 'Duży model LLM (np. Claude Sonnet, GPT-4o) — via API',
  },
  {
    mode: 'assistant',
    icon: MessageSquare,
    color: 'text-emerald-400',
    activeBorder: 'border-emerald-500 bg-emerald-950/30',
    title: 'AI Asystent',
    badge: 'Tryb tylko-odczyt',
    description: 'Odpowiada NA pytania. Wyjaśnia dane i pomaga w analizie. Nie modyfikuje żadnych rekordów w systemie.',
    capabilities: [
      'Odpowiadanie na pytania dotyczące danych',
      'Wyjaśnianie dokumentów i raportów',
      'Analiza i interpretacja danych (tylko odczyt)',
      'Podpowiedzi i rekomendacje',
    ],
    restrictions: [
      'Nie tworzy ani nie edytuje danych',
      'Nie wykonuje akcji w imieniu użytkownika',
    ],
    model: 'Mały, szybki model LLM (np. Claude Haiku, Groq Llama) — via API',
  },
];

export default function AiSettingsSection() {
  const { currentTenant, refreshTenants } = useTenant();
  const { isAtLeast } = useRole();
  const aiLabel = useAiLabel();

  const [selectedMode, setSelectedMode] = useState<AiMode>(currentTenant?.aiMode ?? 'coach');
  const [customName, setCustomName] = useState(currentTenant?.aiCustomName ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isAtLeast('ADMIN')) {
    return (
      <div className="flex items-center gap-3 p-6 bg-zinc-800/50 rounded-2xl text-zinc-500 text-sm">
        <Shield size={16} /> Tylko Administrator lub Właściciel może zmieniać ustawienia AI.
      </div>
    );
  }

  const hasChanges =
    selectedMode !== (currentTenant?.aiMode ?? 'coach') ||
    customName !== (currentTenant?.aiCustomName ?? '');

  const handleSave = async () => {
    if (!currentTenant?.id) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'tenants', currentTenant.id),
        { aiMode: selectedMode, aiCustomName: customName.trim() || null },
        { merge: true }
      );
      await refreshTenants();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <BrainCircuit size={16} className="text-indigo-400" />
        <h3 className="text-sm font-black text-white uppercase tracking-widest">Ustawienia AI</h3>
        <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 font-bold uppercase tracking-widest">
          Aktualnie: {aiLabel.name}
        </span>
        {saving && <span className="text-[10px] text-indigo-400 font-bold animate-pulse">Zapisywanie...</span>}
        {saved && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
            <Check size={11} /> Zapisano
          </span>
        )}
      </div>

      {/* Mode selector */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {MODES.map(m => {
          const isActive = selectedMode === m.mode;
          return (
            <button
              key={m.mode}
              onClick={() => setSelectedMode(m.mode)}
              className={`text-left p-5 rounded-2xl border-2 transition-all ${
                isActive ? m.activeBorder : 'border-zinc-700 bg-zinc-800/30 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isActive ? 'bg-zinc-700/60' : 'bg-zinc-800'}`}>
                  <m.icon size={18} className={isActive ? m.color : 'text-zinc-500'} />
                </div>
                <div>
                  <div className={`font-black text-sm ${isActive ? 'text-white' : 'text-zinc-400'}`}>{m.title}</div>
                  <div className={`text-[9px] uppercase tracking-widest font-bold ${isActive ? m.color : 'text-zinc-600'}`}>{m.badge}</div>
                </div>
                {isActive && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                    <Check size={11} className="text-white" />
                  </div>
                )}
              </div>
              <p className={`text-xs leading-relaxed mb-3 ${isActive ? 'text-zinc-300' : 'text-zinc-500'}`}>{m.description}</p>
              <ul className="space-y-1">
                {m.capabilities.map(c => (
                  <li key={c} className="flex items-start gap-1.5 text-[11px] text-zinc-400">
                    <Check size={10} className="text-emerald-500 flex-shrink-0 mt-0.5" />{c}
                  </li>
                ))}
                {m.restrictions.map(r => (
                  <li key={r} className="flex items-start gap-1.5 text-[11px] text-zinc-500">
                    <span className="text-rose-500 flex-shrink-0 mt-0.5 text-xs leading-none">×</span>{r}
                  </li>
                ))}
              </ul>
              <div className={`mt-3 pt-3 border-t border-zinc-700/50 text-[10px] ${isActive ? 'text-zinc-500' : 'text-zinc-700'}`}>
                {m.model}
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom name override */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
        <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">
          Własna nazwa AI (opcjonalnie)
        </label>
        <p className="text-[11px] text-zinc-600 mb-3">
          Zastąpi domyślną nazwę "AI Coach" / "AI Asystent" we wszystkich miejscach w aplikacji. Zostaw puste aby używać domyślnej.
        </p>
        <input
          type="text"
          value={customName}
          onChange={e => setCustomName(e.target.value)}
          placeholder={`np. "ADAS", "Mój AI", "Iris"...`}
          maxLength={32}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all"
        />
        {customName.trim() && (
          <p className="mt-2 text-[11px] text-indigo-400">
            Wyświetlana nazwa: <strong>{customName.trim()}</strong>
          </p>
        )}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving || !hasChanges}
        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-black rounded-xl transition-all"
      >
        <Save size={14} />
        {saving ? 'Zapisywanie...' : 'Zapisz ustawienia AI'}
      </button>
      {!hasChanges && !saving && (
        <p className="text-[11px] text-zinc-600 mt-2">Brak niezapisanych zmian.</p>
      )}
    </div>
  );
}
