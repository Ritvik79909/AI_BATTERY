// Anomaly Alert System Types

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertStatus = 'ACTIVE' | 'RESOLVED';

export interface AnomalyAlert {
  id: number;          // numeric backend Long — used for API calls
  alertId: string;     // legacy string alias (may be undefined if backend omits it)
  vehicleId: string;
  alertType: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  detectedValue: number;
  normalRangeMin: number;
  normalRangeMax: number;
  unit: string;
  recommendedAction: string;
  detectedAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface AlertSummary {
  vehicleId: string;
  totalActive: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  lastCheckedAt: string; // ISO timestamp
}

export interface ResolveAlertPayload {
  resolutionNotes?: string;
}
