import { useState, useEffect, useCallback } from 'react';
import { enqueue, flush, pendingCount } from '../services/syncQueue';
import type { PendingOp } from '../types';

export function useOfflineSync() {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const onOnline = async () => {
      setOnline(true);
      setSyncing(true);
      await flush();
      setSyncing(false);
      setPending(await pendingCount());
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    pendingCount().then(setPending);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const queueOp = useCallback(async (op: Omit<PendingOp, 'id' | 'createdAt' | 'retries'>) => {
    await enqueue(op);
    if (navigator.onLine) {
      setSyncing(true);
      await flush();
      setSyncing(false);
    }
    setPending(await pendingCount());
  }, []);

  return { online, pending, syncing, queueOp };
}
