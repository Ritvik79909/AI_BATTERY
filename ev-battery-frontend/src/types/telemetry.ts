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

// Day-10: Processed Battery Data Types
export interface ProcessedBatteryData {
  soc: number;
  temperature: number;
  voltage: number;
  current: number;
  chargingState: 'CHARGING' | 'DISCHARGING' | 'IDLE';
  source: 'MANUAL' | 'DATASET' | 'DOCUMENT';
  isComplete: boolean;
  dataQualityScore: number;
  timestamp: string;
}

export interface DailyBatterySummary {
  date: string;
  avgSoc: number;
  maxTemperature: number;
  avgVoltage: number;
  totalChargeCurrent: number;
  dailyCycleIncrement: number;
}

// Day-16: Updated to match /score/{id} → {healthScore, label}
export interface BatteryHealthScore {
  healthScore: number; // 0-100
  label: string;       // e.g., "Good", "Excellent", "Poor"
  analyzedAt?: string; // Optional ISO timestamp
}

export interface StateOfHealth {
  sohPercentage: number; // 0-100
  status: string; // e.g., "Excellent", "Good", "Fair", "Poor"
}

// Day-15: Updated to match backend API shape
export interface RemainingUsefulLife {
  rulCycles: number;       // Remaining useful life in cycles
  estimatedMonths: number; // Estimated months remaining
  confidence: string;      // e.g., "High", "Medium", "Low"
}

export interface BatteryHealthData {
  score: BatteryHealthScore | null;
  soh: StateOfHealth | null;
  rul: RemainingUsefulLife | null;
}

// ML Simulated Battery Health Data
export interface SimulatedBatteryHealth {
  healthScore: number; // 0-100
  soh: number; // State of Health percentage
  rulCycles: number; // Remaining useful life in cycles
  estimatedMonths: number; // Estimated months remaining
  degradationTrend: number[]; // Array of SoH percentages over time
  source: string; // e.g., "ML_MODEL"
  degradationRate: number; // Percentage degradation
}

export interface SoHHistoryPoint {
  soh: number;
  timestamp: string;
}

export interface RULHistoryPoint {
  rul: number;
  timestamp: number; // Unix ms
}

// Day-17: Charging Habits Analysis
export interface ChargingHabitsData {
  chargingFrequencyPerWeek: number;
  fastChargingPercentage: number;
  averageChargeDepth: number;
  habitScore: number;             // 0-100
  riskLevel: string;              // "Low" | "Moderate" | "High"
  insights: string[];
  recommendation: string;
}

// XAI: Explainable AI Battery Explanation Types
export interface ContributingFactor {
  factorName: string;               // e.g. "Fast charging usage"
  impact: 'Positive' | 'Negative';  // direction of effect on health score
  contribution: number;             // signed points, e.g. -8.3 or +5.1
}

export interface BatteryExplanationData {
  vehicleId: string;
  healthScore: number;
  explanation: string;              // 2-3 sentence natural-language text
  topFactors: ContributingFactor[];
  generatedAt: string;              // ISO timestamp
}

export interface ExplanationHistoryItem {
  id?: string;
  vehicleId: string;
  healthScore: number;
  explanation: string;
  generatedAt: string;              // ISO timestamp
}
