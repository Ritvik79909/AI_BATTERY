import api from './api';
import type { TelemetryData, TelemetryRecord, DailySummary } from '../types/telemetry';

export const telemetryService = {
  // 1. Manual Telemetry Ingestion
  ingestManualTelemetry: async (vehicleId: string, data: TelemetryData): Promise<void> => {
    await api.post(`/telemetry/ingest?vehicleId=${vehicleId}`, data);
  },

  // 2. Dataset Upload (CSV)
  uploadDataset: async (vehicleId: string, file: File): Promise<TelemetryRecord[]> => {
    const formData = new FormData();
    formData.append('file', file);

    // Assuming the API returns the parsed records as preview
    const response = await api.post<TelemetryRecord[]>(`/telemetry/upload/dataset?vehicleId=${vehicleId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // 3. Document Upload (PDF / Excel / TXT)
  uploadDocument: async (vehicleId: string, file: File): Promise<TelemetryRecord[]> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<TelemetryRecord[]>(`/telemetry/upload/document?vehicleId=${vehicleId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // 4. Fetch Latest Telemetry
  fetchLatestTelemetry: async (vehicleId: string): Promise<TelemetryRecord> => {
    const response = await api.get<TelemetryRecord>(`/telemetry/latest?vehicleId=${vehicleId}`);
    return response.data;
  },

  // 5. Fetch Recent Telemetry
  fetchRecentTelemetry: async (vehicleId: string): Promise<TelemetryRecord[]> => {
    const response = await api.get<TelemetryRecord[]>(`/telemetry/recent?vehicleId=${vehicleId}`);
    return response.data;
  },

  // 6. Daily Summary
  fetchDailySummary: async (vehicleId: string): Promise<DailySummary> => {
    const response = await api.get<DailySummary>(`/telemetry/summary/daily?vehicleId=${vehicleId}`);
    return response.data;
  }
};
