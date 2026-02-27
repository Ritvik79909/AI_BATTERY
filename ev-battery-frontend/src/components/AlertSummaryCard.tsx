import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaExclamationCircle, FaExclamationTriangle, FaInfoCircle,
  FaChevronRight
} from 'react-icons/fa';
import { anomalyService } from '../services/anomalyService';
import type { AlertSummary, AnomalyAlert } from '../types/anomaly';
import './AlertSummaryCard.css';

interface AlertSummaryCardProps {
  vehicleId: string | null;
}

const AlertSummaryCard: React.FC<AlertSummaryCardProps> = ({ vehicleId }) => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [recentCritical, setRecentCritical] = useState<AnomalyAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!vehicleId) { setLoading(false); return; }
      setLoading(true);
      const [sum, active] = await Promise.all([
        anomalyService.getSummary(vehicleId),
        anomalyService.getActiveAlerts(vehicleId),
      ]);
      setSummary(sum);
      setRecentCritical(
        active
          .filter((a) => a.severity === 'CRITICAL')
          .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
          .slice(0, 3)
      );
      setLoading(false);
    };
    load();
  }, [vehicleId]);

  if (loading) {
    return (
      <div className="asc-card">
        <div className="asc-title">Anomaly Alerts</div>
        <div className="asc-loading">Loading alerts…</div>
      </div>
    );
  }

  if (!vehicleId || !summary) {
    return (
      <div className="asc-card">
        <div className="asc-title">Anomaly Alerts</div>
        <div className="asc-empty">No vehicle selected or no data available.</div>
      </div>
    );
  }

  const noAlerts = summary.totalActive === 0;

  return (
    <div className="asc-card">
      <div className="asc-header">
        <span className="asc-title">Anomaly Alerts</span>
        {summary.totalActive > 0 && (
          <span className="asc-total-badge">{summary.totalActive} Active</span>
        )}
      </div>

      {/* Count pills */}
      <div className="asc-counts">
        <div className="asc-count-pill critical">
          <FaExclamationCircle size={14} />
          <span>{summary.criticalCount}</span>
          <span className="asc-pill-label">Critical</span>
        </div>
        <div className="asc-count-pill warning">
          <FaExclamationTriangle size={14} />
          <span>{summary.warningCount}</span>
          <span className="asc-pill-label">Warning</span>
        </div>
        <div className="asc-count-pill info">
          <FaInfoCircle size={14} />
          <span>{summary.infoCount}</span>
          <span className="asc-pill-label">Info</span>
        </div>
      </div>

      {/* Recent critical alerts */}
      {noAlerts ? (
        <div className="asc-clear">
          <span>🎉</span>
          <span>All clear – no active alerts!</span>
        </div>
      ) : (
        <div className="asc-recent">
          <div className="asc-recent-label">Recent Critical Alerts</div>
          {recentCritical.length === 0 ? (
            <p className="asc-no-critical">No critical alerts – good news!</p>
          ) : (
            recentCritical.map((alert) => (
              <div key={alert.alertId} className="asc-alert-row">
                <FaExclamationCircle size={12} color="#ef4444" className="asc-row-icon" />
                <div className="asc-row-content">
                  <span className="asc-row-title">{alert.title}</span>
                  <span className="asc-row-val">
                    {alert.detectedValue} {alert.unit}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* View all button */}
      <button className="asc-view-all-btn" onClick={() => navigate('/alerts')}>
        View All Alerts <FaChevronRight size={12} />
      </button>
    </div>
  );
};

export default AlertSummaryCard;
