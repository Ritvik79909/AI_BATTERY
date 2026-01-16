export interface VehicleFormData {
  nickname: string;
  make: string;
  model: string;
  variant: string;
  vin: string;
  year: number | null;
  batteryCapacityKwh: number | null;
  usableCapacityKwh?: number | null;
  ratedRangeKm?: number | null;
  fastChargeSupported: boolean;
  maxAcPowerKw?: number | null;
  maxDcPowerKw?: number | null;
  chemistry: 'NMC' | 'LFP';
  vehicleType: 'Car' | 'Bike' | 'Scooter';
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

export interface UploadDocumentResponse {
  draftId: string;
}
