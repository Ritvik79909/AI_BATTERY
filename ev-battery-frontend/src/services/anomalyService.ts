import api from './api';
import type { AnomalyAlert, AlertSummary } from '../types/anomaly';

export const anomalyService = {
  /**
   * Get alert summary counts for a vehicle
   * GET /api/anomaly/summary/{vehicleId}
   */
  getSummary: async (vehicleId: string): Promise<AlertSummary | null> => {
    try {
      const response = await api.get<AlertSummary>(`/anomaly/summary/${vehicleId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('Failed to fetch anomaly summary:', error);
      return null;
    }
  },

  /**
   * Get all active (unresolved) alerts for a vehicle
   * GET /api/anomaly/alerts/active/{vehicleId}
   */
  getActiveAlerts: async (vehicleId: string): Promise<AnomalyAlert[]> => {
    try {
      const response = await api.get<AnomalyAlert[]>(`/anomaly/alerts/active/${vehicleId}`);
      const data = Array.isArray(response.data) ? response.data : [];
      // Debug: log raw shape to confirm field names from backend
      if (data.length > 0) console.debug('[anomalyService] sample alert fields:', Object.keys(data[0]));
      return data;
    } catch (error: any) {
      console.error('Failed to fetch active alerts:', error);
      return [];
    }
  },

  /**
   * Get all alerts (active + resolved) for a vehicle
   * GET /api/anomaly/alerts/all/{vehicleId}
   */
  getAllAlerts: async (vehicleId: string): Promise<AnomalyAlert[]> => {
    try {
      const response = await api.get<AnomalyAlert[]>(`/anomaly/alerts/all/${vehicleId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      console.error('Failed to fetch all alerts:', error);
      return [];
    }
  },

  /**
   * Trigger a manual anomaly check for a vehicle
   * POST /api/anomaly/check/{vehicleId}
   */
  triggerCheck: async (vehicleId: string): Promise<boolean> => {
    try {
      await api.post(`/anomaly/check/${vehicleId}`);
      return true;
    } catch (error: any) {
      console.error('Failed to trigger anomaly check:', error);
      return false;
    }
  },

  /**
   * Resolve a specific alert
   * POST /api/anomaly/alerts/{alertId}/resolve
   */
  resolveAlert: async (alertId: number, resolutionNotes?: string): Promise<boolean> => {
    try {
      await api.post(
        `/anomaly/alerts/${alertId}/resolve`,
        null,
        { params: { notes: resolutionNotes || 'Resolved by user' } }
      );
      return true;
    } catch (error: any) {
      console.error('Failed to resolve alert:', error);
      return false;
    }
  },
};
