import api from './api';
import type { Vehicle, VehicleDraft, VehicleFormData } from '../types/vehicle';

export const vehicleService = {
  // Manual Entry: Create a new vehicle
  createVehicle: async (data: VehicleFormData): Promise<Vehicle> => {
    const response = await api.post<Vehicle>('/vehicles', data);
    return response.data;
  },

  // Get all vehicles for the user
  getVehicles: async (): Promise<Vehicle[]> => {
    const response = await api.get<Vehicle[]>('/vehicles');
    return response.data;
  },

  // Smart Upload: Upload a document
  uploadVehicleDocument: async (file: File): Promise<{ draftId: string }> => {
    const formData = new FormData();
    formData.append('document', file);

    const response = await api.post<{ draftId: string }>('/vehicles/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Smart Upload: Get draft status and extracted data
  getVehicleDraft: async (draftId: string): Promise<VehicleDraft> => {
    const response = await api.get<VehicleDraft>(`/vehicles/documents/${draftId}/draft`);
    return response.data;
  }
};
