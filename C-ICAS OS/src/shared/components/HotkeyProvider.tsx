import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Keyboard } from 'lucide-react';
import { initHotkeyListener, registerHotkey, getAllHotkeys } from '../lib/hotkeys';
import type { HotkeyDef } from '../lib/hotkeys';

const APP_HOTKEYS: Omit<HotkeyDef, 'label'>[] = [
  // Nawigacja
  { id: 'go-dashboard',  keys: ['alt', 'd'], description: 'Pulpit',                  group: 'Nawigacja', action: () => { window.location.hash = '#/dashboard'; } },
  { id: 'go-workflow',   keys: ['alt', 'w'], description: 'Workflow / Obieg dok.',   group: 'Nawigacja', action: () => { window.location.hash = '#/workflow'; } },
  { id: 'go-documents',  keys: ['alt', 'f'], description: 'Dokumenty (DMS)',         group: 'Nawigacja', action: () => { window.location.hash = '#/dms'; } },
  { id: 'go-hr',         keys: ['alt', 'h'], description: 'HR i Płace',              group: 'Nawigacja', action: () => { window.location.hash = '#/hr'; } },
  { id: 'go-crm',        keys: ['alt', 'c'], description: 'CRM / Sprzedaż',         group: 'Nawigacja', action: () => { window.location.hash = '#/crm'; } },
  { id: 'go-payments',   keys: ['alt', 'p'], description: 'Płatności',               group: 'Nawigacja', action: () => { window.location.hash = '#/payments'; } },
  { id: 'go-ksef',       keys: ['alt', 'k'], description: 'KSeF',                   group: 'Nawigacja', action: () => { window.location.hash = '#/finance/ksef'; } },
  { id: 'go-finance',    keys: ['alt', 'e'], description: 'Finanse',                 group: 'Nawigacja', action: () => { window.location.hash = '#/finance'; } },
  { id: 'go-settings',   keys: ['alt', 'z'], description: 'Ustawienia',              group: 'Nawigacja', action: () => { window.location.hash = '#/settings'; } },
  { id: 'go-back',       keys: ['alt', 'arrowleft'], description: 'Wstecz',          group: 'Nawigacja', action: () => { window.history.back(); } },
  // Akcje
  { id: 'new-document',     keys: ['ctrl', 'n'],   description: 'Nowy dokument',                    group: 'Akcje', action: () => { window.dispatchEvent(new CustomEvent('cicas:new-document')); } },
  { id: 'search-global',    keys: ['ctrl', 'k'],   description: 'Globalne wyszukiwanie (Spotlight)', group: 'Akcje', action: () => { window.dispatchEvent(new CustomEvent('cicas:global-search')); } },
  { id: 'save-document',    keys: ['ctrl', 's'],   description: 'Zapisz bieżący dokument',          group: 'Akcje', action: () => { window.dispatchEvent(new CustomEvent('cicas:save-current')); } },
  { id: 'shortcuts-help',   keys: ['ctrl', '/'],   description: 'Pokaż skróty klawiszowe',          group: 'Akcje', action: () => { window.dispatchEvent(new CustomEvent('cicas:show-shortcuts')); } },
  { id: 'toggle-sidebar',   keys: ['ctrl', 'b'],   description: 'Przełącz panel boczny',            group: 'Akcje', action: () => { window.dispatchEvent(new CustomEvent('cicas:toggle-sidebar')); } },
  { id: 'export-data',      keys: ['ctrl', 'e'],   description: 'Eksport danych',                   group: 'Akcje', action: () => { window.dispatchEvent(new CustomEvent('cicas:export')); } },
];

export function HotkeyProvider(): React.ReactElement | null {
  const [showPanel, setShowPanel] = useState(false);
  const [hotkeys, setHotkeys] = useState<HotkeyDef[]>([]);

  useEffect(() => {
    initHotkeyListener();
    const unsubs = APP_HOTKEYS.map(h => registerHotkey(h as HotkeyDef));
    setHotkeys(getAllHotkeys());

    const handler = () => setShowPanel(prev => !prev);
    window.addEventListener('cicas:show-shortcuts', handler);
    return () => {
      unsubs.forEach(u => u());
      window.removeEventListener('cicas:show-shortcuts', handler);
    };
  }, []);

  if (!showPanel) return null;

  const byGroup = hotkeys.reduce<Record<string, HotkeyDef[]>>((acc, h) => {
    const g = h.group ?? 'Inne';
    if (!acc[g]) acc[g] = [];
    acc[g].push(h);
    return acc;
  }, {});

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
      onClick={() => setShowPanel(false)}
    >
      <div
        className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-10 py-8 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center">
              <Keyboard size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Skróty klawiszowe</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ctrl+/ aby zamknąć</p>
            </div>
          </div>
          <button onClick={() => setShowPanel(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-8 space-y-6">
          {Object.entries(byGroup).map(([group, defs]) => (
            <div key={group}>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">{group}</p>
              <div className="space-y-1.5">
                {defs.map(h => (
                  <div key={h.id} className="flex items-center justify-between py-2.5 px-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                    <span className="text-sm font-bold text-slate-700">{h.description}</span>
                    <div className="flex items-center gap-1">
                      {h.keys.map((k, i) => (
                        <React.Fragment key={k}>
                          {i > 0 && <span className="text-slate-300 text-[10px] font-bold">+</span>}
                          <span className="bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase px-2 py-1 rounded-lg shadow-sm tracking-widest">
                            {k}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-8 py-4 border-t border-slate-100 bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
          Skróty działają tylko gdy kursor nie jest w polu tekstowym
        </div>
      </div>
    </div>,
    document.body
  );
}
