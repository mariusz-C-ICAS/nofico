import { useCallback, useEffect } from 'react';
import { eventBus } from '../services/eventBus';
import type { AppEventMap, AppEventType } from '../types';

export function useEventBus() {
  const emit = useCallback(<K extends AppEventType>(type: K, detail: AppEventMap[K]) => {
    eventBus.emit(type, detail);
  }, []);

  const on = useCallback(<K extends AppEventType>(
    type: K,
    handler: (detail: AppEventMap[K]) => void
  ) => eventBus.on(type, handler), []);

  return { emit, on };
}

export function useEventListener<K extends AppEventType>(
  type: K,
  handler: (detail: AppEventMap[K]) => void
): void {
  useEffect(() => eventBus.on(type, handler), [type, handler]);
}
