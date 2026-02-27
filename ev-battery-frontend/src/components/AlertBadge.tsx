import React, { useState, useEffect, useCallback } from 'react';
import { FaBell } from 'react-icons/fa';
import { anomalyService } from '../services/anomalyService';
import type { AnomalyAlert } from '../types/anomaly';
import AlertPanel from './AlertPanel';
import './AlertBadge.css';

interface AlertBadgeProps {
  vehicleId: string | null;
}

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const AlertBadge: React.FC<AlertBadgeProps> = ({ vehicleId }) => {
  const [criticalCount, setCriticalCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);

  const fetchCounts = useCallback(async () => {
    if (!vehicleId) return;
    const summary = await anomalyService.getSummary(vehicleId);
    if (summary) {
      setCriticalCount(summary.criticalCount);
      setWarningCount(summary.warningCount);
    }
  }, [vehicleId]);

  const fetchAlerts = useCallback(async () => {
    if (!vehicleId) return;
    const data = await anomalyService.getActiveAlerts(vehicleId);
    setAlerts(data);
  }, [vehicleId]);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  const handleOpen = async () => {
    await fetchAlerts();
    await fetchCounts();
    setIsPanelOpen(true);
  };

  const handleResolve = async (alertId: number): Promise<boolean> => {
    const success = await anomalyService.resolveAlert(alertId);
    if (success) {
      await fetchAlerts();
      await fetchCounts();
    }
    return success;
  };

  const totalActive = criticalCount + warningCount;

  return (
    <>
      <button
        className="alert-badge-btn"
        onClick={handleOpen}
        title={`${totalActive} active alert${totalActive !== 1 ? 's' : ''}`}
        aria-label="Open alerts panel"
      >
        <FaBell size={20} color="#4b5563" />
        {criticalCount > 0 && (
          <span className="badge badge-critical">{criticalCount > 9 ? '9+' : criticalCount}</span>
        )}
        {criticalCount === 0 && warningCount > 0 && (
          <span className="badge badge-warning">{warningCount > 9 ? '9+' : warningCount}</span>
        )}
      </button>

      <AlertPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        alerts={alerts}
        onResolve={handleResolve}
        onRefresh={fetchAlerts}
        vehicleId={vehicleId}
      />
    </>
  );
};

export default AlertBadge;
