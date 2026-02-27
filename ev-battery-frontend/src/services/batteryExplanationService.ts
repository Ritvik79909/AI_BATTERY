import api from './api';
import type {
  BatteryExplanationData,
  ExplanationHistoryItem,
} from '../types/telemetry';

export const batteryExplanationService = {
  /**
   * Generate (or fetch cached) explanation for the current battery health score.
   * GET /api/battery-health/explanation/{vehicleId}
   */
  getExplanation: async (vehicleId: string): Promise<BatteryExplanationData | null> => {
    try {
      const response = await api.get<BatteryExplanationData>(
        `/battery-health/explanation/${vehicleId}`
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('Failed to fetch battery explanation:', error);
      return null;
    }
  },

  /**
   * Fetch the most recently stored explanation without regenerating.
   * GET /api/battery-health/explanation/latest/{vehicleId}
   */
  getLatestExplanation: async (vehicleId: string): Promise<BatteryExplanationData | null> => {
    try {
      const response = await api.get<BatteryExplanationData>(
        `/battery-health/explanation/latest/${vehicleId}`
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('Failed to fetch latest battery explanation:', error);
      return null;
    }
  },

  /**
   * Fetch the history of past explanations for a vehicle.
   * GET /api/battery-health/explanation/history/{vehicleId}
   */
  getExplanationHistory: async (vehicleId: string): Promise<ExplanationHistoryItem[]> => {
    try {
      const response = await api.get<ExplanationHistoryItem[]>(
        `/battery-health/explanation/history/${vehicleId}`
      );
      if (!Array.isArray(response.data)) return [];
      return response.data;
    } catch (error: any) {
      console.warn('Explanation history unavailable:', error);
      return [];
    }
  },
};
