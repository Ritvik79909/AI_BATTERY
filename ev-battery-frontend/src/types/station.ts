export type ConnectorType = 'CCS' | 'CHADEMO' | 'TYPE2' | 'AC' | 'UNKNOWN';
export type SortBy = 'score' | 'distance' | 'power';
export type PowerLevel = 'all' | 'fast' | 'ultrafast';

export interface ChargingStation {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lon: number;
  distanceKm: number;
  powerKw: number;
  connectorTypes: ConnectorType[];
  reliabilityScore: number;        // 0-100
  recommended: boolean;
  pricePerKwh?: number;
  totalConnectors?: number;
  availableConnectors?: number;
  operator?: string;
}

export interface ConnectorAvailability {
  type: ConnectorType;
  available: number;
  total: number;
  powerKw: number;
}

export interface StationDetail extends ChargingStation {
  connectorAvailability: ConnectorAvailability[];
  estimatedTimeMin?: number;       // minutes to charge to 80%
  priceInfo?: string;
  openingHours?: string;
  phone?: string;
  amenities?: string[];
}

export interface StationFilters {
  radius: number;                  // km
  connectorType: ConnectorType | 'ALL';
  powerLevel: PowerLevel;
  reliableOnly: boolean;
  vehicleId: string | null;
  sortBy: SortBy;
  minPowerKw: number;              // 0 = no minimum
  fastChargeOnly: boolean;         // ≥ 50 kW DC only
}

export const DEFAULT_FILTERS: StationFilters = {
  radius: 20,
  connectorType: 'ALL',
  powerLevel: 'all',
  reliableOnly: false,
  vehicleId: null,
  sortBy: 'score',
  minPowerKw: 0,
  fastChargeOnly: false,
};
