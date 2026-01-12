export interface VehicleFormData {
  nickname: string;
  make: string;
  model: string;
  variant: string;
  year: number;
  batteryCapacityKwh: number;
  chemistry: 'NMC' | 'LFP';
}

export interface Vehicle extends VehicleFormData {
  id: string;
  userId: string;
  createdAt: string;
}

export interface VehicleDraft {
  id: string;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  extractedData?: Partial<VehicleFormData>;
}
