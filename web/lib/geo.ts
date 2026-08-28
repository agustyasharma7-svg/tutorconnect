import { api } from './api';

export type Coords = { latitude: number; longitude: number };

export type ResolvedGeo = Coords & { source: 'client' | 'google' | 'stub' };

/** Browser GPS when the user grants permission; null on deny / timeout / SSR. */
export function readBrowserPosition(timeoutMs = 10000): Promise<Coords | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 120_000 },
    );
  });
}

/** Server resolve: prefers lat/lng, else geocodes pincode (Google → stub). */
export async function resolveGeo(input: {
  pincode?: string;
  latitude?: number;
  longitude?: number;
}): Promise<ResolvedGeo> {
  const q = new URLSearchParams();
  if (input.pincode) q.set('pincode', input.pincode);
  if (input.latitude != null) q.set('latitude', String(input.latitude));
  if (input.longitude != null) q.set('longitude', String(input.longitude));
  return api<ResolvedGeo>(`/geo/resolve?${q}`);
}
