export interface TelemetryData {
  soc: number;
  temperature: number;
  voltage: number;
  current: number;
  cycleCount: number;
  chargingState: 'CHARGING' | 'DISCHARGING' | 'IDLE';
}

export interface TelemetryRecord extends TelemetryData {
  timestamp: string;
  source: 'MANUAL' | 'DATASET' | 'DOCUMENT';
}

export interface DailySummary {
  // Define structure based on what API might return (not specified in detail in prompt, assuming basic stats)
  averageSoc: number;
  averageTemperature: number;
  totalCycles: number;
}

export interface TelemetryIngestPayload extends TelemetryData {
  vehicleId?: string; // Passed as query param usually, but maybe useful here
}
