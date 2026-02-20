import api from './api';
import type {
  BatteryHealthScore,
  StateOfHealth,
  RemainingUsefulLife,
  SimulatedBatteryHealth,
  SoHHistoryPoint,
  RULHistoryPoint
} from '../types/telemetry';

export const batteryHealthService = {
  /**
   * Fetch battery health score (0-100) for a vehicle
   */
  getHealthScore: async (vehicleId: string): Promise<BatteryHealthScore | null> => {
    try {
      const response = await api.get<BatteryHealthScore>(`/battery-health/score/${vehicleId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('Failed to fetch battery health score:', error);
      return null;
    }
  },

  /**
   * Fetch State of Health (SoH) for a vehicle
   */
  getStateOfHealth: async (vehicleId: string): Promise<StateOfHealth | null> => {
    try {
      const response = await api.get<StateOfHealth>(`/battery-health/soh/${vehicleId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('Failed to fetch State of Health:', error);
      return null;
    }
  },

  /**
   * Fetch Remaining Useful Life (RUL) for a vehicle
   * Day-15: Backend returns { rulCycles, estimatedMonths, confidence }
   */
  getRemainingUsefulLife: async (vehicleId: string): Promise<RemainingUsefulLife | null> => {
    try {
      const response = await api.get<RemainingUsefulLife>(`/battery-health/rul/${vehicleId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('Failed to fetch Remaining Useful Life:', error);
      return null;
    }
  },

  /**
   * Fetch ML-powered battery health simulation data
   */
  getSimulatedHealth: async (vehicleId: string): Promise<SimulatedBatteryHealth | null> => {
    try {
      const response = await api.get<SimulatedBatteryHealth>(`/battery-health/simulated/${vehicleId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('Failed to fetch ML simulated health:', error);
      return null;
    }
  },

  /**
   * Fetch SoH history for trend analysis
   * Backend: /soh-history/{id} → [{ sohValue, predictionTimestamp }]
   */
  getSoHHistory: async (vehicleId: string): Promise<SoHHistoryPoint[]> => {
    try {
      const response = await api.get<any[]>(`/battery-health/soh-history/${vehicleId}`);
      if (!Array.isArray(response.data)) return [];
      return response.data.map((item: any) => ({
        soh: item.sohValue,
        timestamp: item.predictionTimestamp
      }));
    } catch (error: any) {
      console.warn('SoH history unavailable:', error);
      return [];
    }
  },

  /**
   * Fetch RUL history for trend chart
   * Day-15: Backend returns { rulCycles, predictionTimestamp } directly
   */
  getRULHistory: async (vehicleId: string): Promise<RULHistoryPoint[]> => {
    try {
      const response = await api.get<any[]>(`/battery-health/rul-history/${vehicleId}`);
      if (!Array.isArray(response.data)) return [];
      return response.data.map((h: any) => ({
        rul: h.rulCycles,
        timestamp: new Date(h.predictionTimestamp).getTime()
      }));
    } catch (error: any) {
      console.warn('RUL history unavailable:', error);
      return [];
    }
  }
};
