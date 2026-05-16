import type { HotkeyDef } from '../types';

const registry = new Map<string, HotkeyDef>();

function keysToString(keys: string[]): string {
  return keys.map(k => k.toLowerCase()).sort().join('+');
}

function eventToString(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  const key = e.key.toLowerCase();
  if (!['control', 'meta', 'alt', 'shift'].includes(key)) parts.push(key);
  return parts.sort().join('+');
}

export function registerHotkey(def: HotkeyDef): () => void {
  const id = keysToString(def.keys);
  registry.set(id, def);
  return () => registry.delete(id);
}

export function getAllHotkeys(): HotkeyDef[] {
  return Array.from(registry.values());
}

let _initialized = false;

export function initHotkeyListener(): void {
  if (_initialized) return;
  _initialized = true;
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    const combo = eventToString(e);
    const def = registry.get(combo);
    if (def) {
      e.preventDefault();
      def.action();
    }
  });
}
