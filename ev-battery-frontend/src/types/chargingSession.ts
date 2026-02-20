// Charging Session Types - matching backend schema

export type ChargingType = 'AC_FAST' | 'DC_FAST' | 'SLOW';
export type ChargingLocation = 'HOME' | 'PUBLIC' | 'STATION' | 'WORKPLACE';
export type ChargingSource = 'DATASET' | 'DOCUMENT' | 'MANUAL';

export interface ChargingSession {
  id: number;
  vehicleId: number;
  startTime: string; // ISO datetime string
  endTime: string; // ISO datetime string
  startSoc: number;
  endSoc: number;
  chargingType: ChargingType;
  location?: ChargingLocation;
  source?: ChargingSource;
  durationMinutes?: number; // Calculated by backend
  socAdded?: number; // Calculated by backend
  energyAddedKwh?: number; // Calculated by backend
  avgPowerKw?: number; // Calculated by backend
}

export interface ChargingSessionLog {
  vehicleId: number;
  startTime: string; // ISO datetime string
  endTime: string; // ISO datetime string
  startSoc: number;
  endSoc: number;
  chargingType: ChargingType;
  location?: ChargingLocation;
  source?: ChargingSource;
}

export interface ChargingSessionSummary {
  totalSessions: number;
  averageDuration: number; // in minutes
  fastChargingPercentage: number; // percentage of fast charging sessions
  totalEnergyAdded?: number; // Total kWh
  averageSocAdded?: number; // Average SoC increase
}

export interface SessionsPerDay {
  date: string;
  count: number;
}

export interface DurationTrend {
  date: string;
  avgDuration: number; // in minutes
}
