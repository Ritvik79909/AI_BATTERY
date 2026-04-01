import api from './api';
import type { ChargingStation, ConnectorType, StationDetail, StationFilters } from '../types/station';

/** Raw shape returned by the backend /api/stations endpoints */
interface RawStation {
  id: string;
  stationName: string;
  address?: string;
  latitude: number | string;
  longitude: number | string;
  distanceKm: number;
  maxPowerKw: number;
  connectorTypes?: ConnectorType[];
  connectors?: ConnectorType[];
  reliabilityScore: number;
  recommended?: boolean;
  pricePerKwh?: number;
  totalConnectors?: number;
  availableConnectors?: number;
  operator?: string;
  // allow extra fields from the backend
  [key: string]: unknown;
}

/** Map backend field names → frontend ChargingStation type */
function mapStation(raw: RawStation): ChargingStation {
  return {
    id: raw.id,
    name: raw.stationName,
    address: raw.address,
    lat: Number(raw.latitude),
    lon: Number(raw.longitude),
    distanceKm: raw.distanceKm,
    powerKw: raw.maxPowerKw,
    connectorTypes: raw.connectorTypes ?? raw.connectors ?? [],
    reliabilityScore: raw.reliabilityScore ?? 0,
    recommended: raw.recommended ?? false,
    pricePerKwh: raw.pricePerKwh,
    totalConnectors: raw.totalConnectors,
    availableConnectors: raw.availableConnectors,
    operator: raw.operator,
  };
}

export interface StationRecommendParams {
  lat: number;
  lon: number;
  filters: StationFilters;
}

export const stationService = {
  /** GET /api/stations/recommend */
  getRecommendations: async ({ lat, lon, filters }: StationRecommendParams): Promise<ChargingStation[]> => {
    const params: Record<string, string | number | boolean> = {
      lat,
      lon,
      radius: filters.radius,
    };

    if (filters.connectorType !== 'ALL') {
      params.connector = filters.connectorType;
    }

    if (filters.fastChargeOnly) {
      params.fastOnly = true;
    } else if (filters.powerLevel === 'fast') {
      params.fastOnly = true;
    } else if (filters.powerLevel === 'ultrafast') {
      params.ultraFast = true;
    }

    if (filters.minPowerKw > 0) {
      params.minPower = filters.minPowerKw;
    }

    if (filters.vehicleId) {
      params.vehicleId = filters.vehicleId;
    }

    if (filters.reliableOnly) {
      params.minReliability = 75;
    }

    params.sortBy = filters.sortBy;

    const response = await api.get<RawStation[]>('/stations/recommend', { params });
    return response.data.map(mapStation);
  },

  /** GET /api/stations/{stationId} */
  getStation: async (stationId: string): Promise<StationDetail> => {
    const response = await api.get<RawStation>(`/stations/${stationId}`);
    return mapStation(response.data) as StationDetail;
  },
};
