import api from './api';
import type { ChargingStation, StationDetail, StationFilters } from '../types/station';

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

    const response = await api.get<ChargingStation[]>('/stations/recommend', { params });
    return response.data;
  },

  /** GET /api/stations/{stationId} */
  getStation: async (stationId: string): Promise<StationDetail> => {
    const response = await api.get<StationDetail>(`/stations/${stationId}`);
    return response.data;
  },
};
