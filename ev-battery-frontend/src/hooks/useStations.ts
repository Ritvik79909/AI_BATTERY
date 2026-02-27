// hooks/useStations.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { stationService } from '../services/stationService';
import type { ChargingStation, StationFilters } from '../types/station';
import type { GeoLocation } from './useGeolocation';

// sessionStorage cache key builder
function buildCacheKey(loc: GeoLocation, filters: StationFilters): string {
  return `stations:${loc.lat.toFixed(3)},${loc.lng.toFixed(3)}:${JSON.stringify(filters)}`;
}

interface UseStationsResult {
  stations: ChargingStation[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useStations = (
  location: GeoLocation | null,
  filters: StationFilters,
  vehicleId: string | null = null
): UseStationsResult => {
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a stable ref to the latest location/filters/vehicleId so the
  // fetch function never goes stale yet doesn't re-create on every render.
  const locationRef = useRef(location);
  const filtersRef = useRef(filters);
  const vehicleIdRef = useRef(vehicleId);
  locationRef.current = location;
  filtersRef.current = filters;
  vehicleIdRef.current = vehicleId;

  // Stable fetch function — never re-created, always reads latest values via refs
  const fetchStations = useCallback(async () => {
    const loc = locationRef.current;
    if (!loc) return;

    const vid = vehicleIdRef.current;
    const effectiveFilters: StationFilters = vid
      ? { ...filtersRef.current, vehicleId: vid }
      : filtersRef.current;

    // Check sessionStorage cache first
    const key = buildCacheKey(loc, effectiveFilters);
    const cached = sessionStorage.getItem(key);
    if (cached) {
      setStations(JSON.parse(cached));
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const data = await stationService.getRecommendations({
        lat: loc.lat,
        lon: loc.lng,
        filters: effectiveFilters,
      });
      sessionStorage.setItem(key, JSON.stringify(data));
      setStations(data);
      setError(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? 'Failed to fetch stations. Please try again.');
      setStations([]);
    } finally {
      setLoading(false);
    }
  }, []); // no deps — stable forever, reads fresh values via refs

  // Trigger a fetch when the primitive location/filter values actually change
  const lat = location?.lat;
  const lng = location?.lng;
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    fetchStations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, filtersKey]);

  return { stations, loading, error, refetch: fetchStations };
};
