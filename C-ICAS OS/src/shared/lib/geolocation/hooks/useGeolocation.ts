import { useState, useCallback } from 'react';
import { getCurrentPosition, reverseGeocode } from '../services/geoService';
import type { GeoPoint, GeoAddress } from '../types';

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPoint | null>(null);
  const [address, setAddress] = useState<GeoAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pos = await getCurrentPosition();
      setPosition(pos);
      const addr = await reverseGeocode(pos);
      setAddress(addr);
    } catch (err: any) {
      setError(err.message ?? 'Błąd lokalizacji');
    } finally {
      setLoading(false);
    }
  }, []);

  return { position, address, loading, error, locate };
}
