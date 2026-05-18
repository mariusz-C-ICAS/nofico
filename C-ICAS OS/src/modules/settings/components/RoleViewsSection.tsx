import { useState } from 'react';
import { Shield, Info } from 'lucide-react';
import { useRole, AppRole } from '../../../core/auth/useRole';

const ALL_MODULES: { path: string; label: string; group: string }[] = [
  { path: '/dashboard', label: 'Dashboard', group: 'Pulpit' },
  { path: '/ai-copilot', label: 'AI Copilot', group: 'Pulpit' },
  { path: '/communication', label: 'Komunikacja', group: 'Pulpit' },
  { path: '/time', label: 'Czas Pracy', group: 'Operacje' },
  { path: '/kanban', label: 'Projekty & Kanban', group: 'Operacje' },
  { path: '/crm', label: 'Sprzedaż & CRM', group: 'Operacje' },
  { path: '/leads-to-cash', label: 'Leads to Cash', group: 'Operacje' },
  { path: '/expenses', label: 'Wydatki & Zwroty', group: 'Operacje' },
  { path: '/finance', label: 'Finanse (FI)', group: 'Finanse' },
  { path: '/controlling', label: 'Controlling (CO)', group: 'Finanse' },
  { path: '/payments', label: 'Płatności', group: 'Finanse' },
  { path: '/ai-guardian', label: 'AI Guardian', group: 'Finanse' },
  { path: '/swipe', label: 'Swipe & Match', group: 'Finanse' },
  { path: '/export', label: 'Eksport Danych', group: 'Finanse' },
  { path: '/hr', label: 'HR & Płace', group: 'Kadry' },
  { path: '/lms', label: 'Szkolenia (LMS)', group: 'Kadry' },
  { path: '/wellness', label: 'Wellbeing', group: 'Kadry' },
  { path: '/compliance', label: 'Compliance / RODO', group: 'Zgodność' },
  { path: '/legal-vault', label: 'Legal Vault', group: 'Zgodność' },
  { path: '/esg', label: 'ESG Reporting', group: 'Zgodność' },
  { path: '/quality', label: 'Jakość (NCR/CAPA)', group: 'Zgodność' },
  { path: '/field-service', label: 'Serwisy & Kalendarz', group: 'Tereny' },
  { path: '/booking', label: 'Rezerwacje & Booking', group: 'Tereny' },
  { path: '/dms', label: 'Skarbiec (DMS)', group: 'Dokumenty' },
  { path: '/esignature', label: 'E-Podpis', group: 'Dokumenty' },
  { path: '/logistics', label: 'Logistyka & Flota', group: 'Dokumenty' },
  { path: '/marketing', label: 'Marketing Review', group: 'Dokumenty' },
  { path: '/cross-company', label: 'Multi-Firma', group: 'System' },
  { path: '/admin', label: 'Administracja', group: 'System' },
  { path: '/settings', label: 'Ustawienia', group: 'System' },
];

const EDITABLE_ROLES: { role: AppRole; label: string; color: string }[] = [
  { role: 'MANAGER', label: 'Kierownik', color: 'text-blue-400 bg-blue-900/20 border-blue-800' },
  { role: 'USER', label: 'Pracownik', color: 'text-zinc-400 bg-zinc-800/50 border-zinc-700' },
];

const groups = [...new Set(ALL_MODULES.map(m => m.group))];

export default function RoleViewsSection() {
  const { role, isAtLeast, getEffectivePaths, saveRoleConfig } = useRole();
  const [activeRole, setActiveRole] = useState<AppRole>('MANAGER');
  const [saving, setSaving] = useState(false);

  if (!isAtLeast('ADMIN')) {
    return (
      <div className="flex items-center gap-3 p-6 bg-zinc-800/50 rounded-2xl text-zinc-500 text-sm">
        <Shield size={16} /> Tylko Administrator lub Właściciel może zarządzać widokami ról.
      </div>
    );
  }

  const effectivePaths = getEffectivePaths(activeRole);
  const isChecked = (path: string) => effectivePaths.includes(path);

  const toggle = async (path: string) => {
    const current = getEffectivePaths(activeRole);
    const next = current.includes(path)
      ? current.filter(p => p !== path)
      : [...current, path];
    setSaving(true);
    await saveRoleConfig(activeRole, next);
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Shield size={16} className="text-indigo-400" />
        <h3 className="text-sm font-black text-white uppercase tracking-widest">Widoki ról</h3>
        {saving && <span className="text-[10px] text-indigo-400 font-bold animate-pulse">Zapisywanie...</span>}
      </div>

      <div className="flex items-start gap-3 p-4 bg-indigo-950/30 border border-indigo-800/40 rounded-2xl mb-6 text-[11px] text-indigo-300">
        <Info size={13} className="flex-shrink-0 mt-0.5" />
        Role Właściciel i Administrator mają zawsze dostęp do wszystkiego. Poniżej konfigurujesz widoczność modułów dla pozostałych ról. Zmiany działają natychmiast.
      </div>

      {/* Role selector */}
      <div className="flex gap-2 mb-6">
        {EDITABLE_ROLES.map(r => (
          <button key={r.role} onClick={() => setActiveRole(r.role)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
              activeRole === r.role ? r.color : 'border-zinc-700 text-zinc-500 bg-zinc-800/30 hover:border-zinc-600'
            }`}>
            {r.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2 opacity-50 cursor-not-allowed">
          {(['ADMIN', 'OWNER'] as AppRole[]).map(r => (
            <div key={r} className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-zinc-700 text-zinc-600">
              {r === 'ADMIN' ? 'Administrator' : 'Właściciel'} — pełny dostęp
            </div>
          ))}
        </div>
      </div>

      {/* Module grid per group */}
      <div className="space-y-4">
        {groups.map(group => {
          const mods = ALL_MODULES.filter(m => m.group === group);
          const allChecked = mods.every(m => isChecked(m.path));
          const someChecked = mods.some(m => isChecked(m.path));

          return (
            <div key={group} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              {/* Group header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-800/30">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{group}</span>
                <button
                  onClick={async () => {
                    const current = getEffectivePaths(activeRole);
                    const paths = mods.map(m => m.path);
                    const next = allChecked
                      ? current.filter(p => !paths.includes(p))
                      : [...new Set([...current, ...paths])];
                    setSaving(true);
                    await saveRoleConfig(activeRole, next);
                    setSaving(false);
                  }}
                  className={`text-[9px] font-black uppercase tracking-widest transition-colors ${
                    allChecked ? 'text-indigo-400 hover:text-indigo-300'
                    : someChecked ? 'text-zinc-500 hover:text-zinc-300'
                    : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  {allChecked ? 'Odznacz grupę' : 'Zaznacz grupę'}
                </button>
              </div>
              {/* Module rows */}
              <div className="divide-y divide-zinc-800/50">
                {mods.map(mod => (
                  <label key={mod.path}
                    className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-zinc-800/30 transition-colors">
                    <span className="text-sm text-zinc-300">{mod.label}</span>
                    <div className="relative">
                      <input type="checkbox" checked={isChecked(mod.path)}
                        onChange={() => toggle(mod.path)}
                        className="sr-only" />
                      <div className={`w-10 h-5 rounded-full border transition-all ${
                        isChecked(mod.path) ? 'bg-indigo-600 border-indigo-500' : 'bg-zinc-800 border-zinc-600'
                      }`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                          isChecked(mod.path) ? 'left-5' : 'left-0.5'
                        }`} />
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
