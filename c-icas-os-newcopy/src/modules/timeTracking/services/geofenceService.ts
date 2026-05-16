/**
 * Data: 2026-05-12 20:18
 * Opis: Serwis Geofencingowy sprawdzający czy użytkownik znajduje się w strefie projektu.
 */
import * as turf from '@turf/turf';

export interface GeofenceConfig {
  radius: number; // metry
  center: [number, number]; // [lng, lat]
}

export const checkGeofence = (
  userPos: [number, number], // [lng, lat]
  config: GeofenceConfig
): boolean => {
  const from = turf.point(userPos);
  const to = turf.point(config.center);
  const distance = turf.distance(from, to, { units: 'meters' });

  return distance <= config.radius;
};

export const getAdaptiveInterval = (speed: number): number => {
  // Prędkość w m/s
  // Jeśli użytkownik stoi (speed < 0.5) -> poll co 5 min
  // Jeśli się porusza -> poll co 1 min
  if (speed < 0.5) return 5 * 60 * 1000;
  return 1 * 60 * 1000;
};
