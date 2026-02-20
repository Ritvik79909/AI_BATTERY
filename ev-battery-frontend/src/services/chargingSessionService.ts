import api from './api';
import type { ChargingSession, ChargingSessionLog, ChargingSessionSummary } from '../types/chargingSession';

export const chargingSessionService = {
  // POST /api/charging-session/log
  logSession: async (data: ChargingSessionLog): Promise<void> => {
    await api.post('/charging-session/log', data);
  },

  // GET /api/charging-session/history/{vehicleId}
  getHistory: async (vehicleId: number | string): Promise<ChargingSession[]> => {
    const response = await api.get<ChargingSession[]>(`/charging-session/history/${vehicleId}`);
    return response.data;
  },

  // GET /api/charging-session/recent/{vehicleId}
  getRecent: async (vehicleId: number | string): Promise<ChargingSession[]> => {
    const response = await api.get<ChargingSession[]>(`/charging-session/recent/${vehicleId}`);
    return response.data;
  },

  // GET /api/charging-session/summary/{vehicleId}
  getSummary: async (vehicleId: number | string): Promise<ChargingSessionSummary> => {
    const response = await api.get<ChargingSessionSummary>(`/charging-session/summary/${vehicleId}`);
    return response.data;
  }
};
