import type { GeoPoint, GeoAddress } from '../types';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
const BASE = 'https://maps.googleapis.com/maps/api';

export async function reverseGeocode(point: GeoPoint): Promise<GeoAddress> {
  const url = `${BASE}/geocode/json?latlng=${point.lat},${point.lng}&key=${API_KEY}&language=pl`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== 'OK' || !json.results.length) throw new Error(`Geocode error: ${json.status}`);
  const result = json.results[0];
  const comp = (type: string) => result.address_components.find((c: any) => c.types.includes(type));
  return {
    formattedAddress: result.formatted_address,
    city: comp('locality')?.long_name ?? comp('administrative_area_level_2')?.long_name,
    postalCode: comp('postal_code')?.long_name,
    country: comp('country')?.short_name,
    streetNumber: comp('street_number')?.long_name,
    route: comp('route')?.long_name,
  };
}

export async function geocodeAddress(address: string): Promise<GeoPoint> {
  const url = `${BASE}/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}&language=pl`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== 'OK' || !json.results.length) throw new Error(`Geocode error: ${json.status}`);
  const loc = json.results[0].geometry.location;
  return { lat: loc.lat, lng: loc.lng };
}

export function getCurrentPosition(): Promise<GeoPoint> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(err),
      { timeout: 10_000, enableHighAccuracy: true }
    )
  );
}

export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
