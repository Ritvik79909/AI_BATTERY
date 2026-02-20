import api from './api';
import type { ProcessedBatteryData, DailyBatterySummary } from '../types/telemetry';

export const processedBatteryService = {
  /**
   * Fetch latest processed battery data for a vehicle
   * @param vehicleId - Vehicle ID
   * @param timestamp - Optional timestamp for cache busting
   * @returns ProcessedBatteryData or null if not found
   */
  getLatestProcessedBattery: async (vehicleId: string, timestamp?: number): Promise<ProcessedBatteryData | null> => {
    try {
      const cacheBuster = timestamp ? `?t=${timestamp}` : '';
      const response = await api.get<ProcessedBatteryData>(`/battery/processed/latest/${vehicleId}${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-store'
        }
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`No processed battery data found for vehicle ${vehicleId}`);
        return null;
      }
      console.error('Failed to fetch latest processed battery data:', error);
      return null;
    }
  },

  /**
   * Fetch daily battery summaries for a vehicle
   * @param vehicleId - Vehicle ID
   * @param timestamp - Optional timestamp for cache busting
   * @returns Array of DailyBatterySummary, empty array on error
   */
  getDailyBatterySummary: async (vehicleId: string, timestamp?: number): Promise<DailyBatterySummary[]> => {
    try {
      const cacheBuster = timestamp ? `?t=${timestamp}` : '';
      const response = await api.get<DailyBatterySummary[]>(`/battery/processed/daily/${vehicleId}${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-store'
        }
      });
      return response.data || [];
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`No daily summaries found for vehicle ${vehicleId}`);
        return [];
      }
      console.error('Failed to fetch daily battery summary:', error);
      return [];
    }
  }
};
