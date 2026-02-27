// hooks/useGeolocation.ts
import { useState, useEffect } from 'react';

const FALLBACK_LAT = 17.3850;
const FALLBACK_LNG = 78.4867;

export interface GeoLocation {
  lat: number;
  lng: number;
}

interface UseGeolocationResult {
  location: GeoLocation | null;
  error: string | null;
  loading: boolean;
}

export const useGeolocation = (): UseGeolocationResult => {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      // Fallback to Hyderabad
      setLocation({ lat: FALLBACK_LAT, lng: FALLBACK_LNG });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
        // Fallback to Hyderabad
        setLocation({ lat: FALLBACK_LAT, lng: FALLBACK_LNG });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { location, error, loading };
};
