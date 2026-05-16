import { useEffect } from 'react';
import { registerHotkey, initHotkeyListener } from '../services/hotkeyManager';
import type { HotkeyDef } from '../types';

export function useHotkey(def: HotkeyDef): void {
  useEffect(() => {
    initHotkeyListener();
    const unsub = registerHotkey(def);
    return unsub;
  }, [def.id]);
}

export function useHotkeyList(defs: HotkeyDef[]): void {
  useEffect(() => {
    initHotkeyListener();
    const unsubs = defs.map(registerHotkey);
    return () => unsubs.forEach(u => u());
  }, []);
}
