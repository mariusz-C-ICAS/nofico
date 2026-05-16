import { useEffect } from 'react';
import { initHotkeyListener, registerHotkey } from '../lib/hotkeys';

const APP_HOTKEYS = [
  {
    id: 'go-dashboard',
    keys: ['alt', 'd'],
    description: 'Przejdź do pulpitu',
    group: 'Nawigacja' as const,
    action: () => { window.location.hash = '#/dashboard'; },
  },
  {
    id: 'go-workflow',
    keys: ['alt', 'w'],
    description: 'Przejdź do workflow',
    group: 'Nawigacja' as const,
    action: () => { window.location.hash = '#/workflow'; },
  },
  {
    id: 'go-documents',
    keys: ['alt', 'f'],
    description: 'Przejdź do dokumentów (DMS)',
    group: 'Nawigacja' as const,
    action: () => { window.location.hash = '#/dms'; },
  },
  {
    id: 'go-hr',
    keys: ['alt', 'h'],
    description: 'Przejdź do HR',
    group: 'Nawigacja' as const,
    action: () => { window.location.hash = '#/hr'; },
  },
  {
    id: 'go-crm',
    keys: ['alt', 'c'],
    description: 'Przejdź do CRM',
    group: 'Nawigacja' as const,
    action: () => { window.location.hash = '#/crm'; },
  },
  {
    id: 'new-document',
    keys: ['ctrl', 'n'],
    description: 'Nowy dokument',
    group: 'Akcje' as const,
    action: () => {
      window.dispatchEvent(new CustomEvent('cicas:new-document'));
    },
  },
  {
    id: 'search-global',
    keys: ['ctrl', 'k'],
    description: 'Globalne wyszukiwanie',
    group: 'Akcje' as const,
    action: () => {
      window.dispatchEvent(new CustomEvent('cicas:global-search'));
    },
  },
  {
    id: 'save-document',
    keys: ['ctrl', 's'],
    description: 'Zapisz dokument',
    group: 'Akcje' as const,
    action: () => {
      window.dispatchEvent(new CustomEvent('cicas:save-current'));
    },
  },
];

export function HotkeyProvider(): null {
  useEffect(() => {
    initHotkeyListener();
    const unsubs = APP_HOTKEYS.map(registerHotkey);
    return () => unsubs.forEach(u => u());
  }, []);

  return null;
}
