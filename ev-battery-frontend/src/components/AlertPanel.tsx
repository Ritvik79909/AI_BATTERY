import React, { useState } from 'react';
import {
  FaTimes, FaExclamationCircle, FaExclamationTriangle, FaInfoCircle,
  FaSync, FaBell
} from 'react-icons/fa';
import type { AnomalyAlert, AlertSeverity } from '../types/anomaly';
import { anomalyService } from '../services/anomalyService';
import AlertDetailModal from './AlertDetailModal';
import './AlertPanel.css';

interface AlertPanelProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AnomalyAlert[];
  onResolve: (alertId: number) => Promise<boolean>;
  onRefresh: () => void;
  vehicleId: string | null;
}

const severityOrder: AlertSeverity[] = ['CRITICAL', 'WARNING', 'INFO'];

const severityConfig = {
  CRITICAL: {
    label: 'Critical',
    color: '#ef4444',
    bg: '#fef2f2',
    borderColor: '#fecaca',
    Icon: FaExclamationCircle,
  },
  WARNING: {
    label: 'Warning',
    color: '#f59e0b',
    bg: '#fffbeb',
    borderColor: '#fde68a',
    Icon: FaExclamationTriangle,
  },
  INFO: {
    label: 'Info',
    color: '#3b82f6',
    bg: '#eff6ff',
    borderColor: '#bfdbfe',
    Icon: FaInfoCircle,
  },
};

const AlertPanel: React.FC<AlertPanelProps> = ({
  isOpen, onClose, alerts, onResolve, onRefresh, vehicleId,
}) => {
  const [selectedAlert, setSelectedAlert] = useState<AnomalyAlert | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const grouped = severityOrder.reduce<Record<AlertSeverity, AnomalyAlert[]>>(
    (acc, severity) => {
      acc[severity] = alerts.filter((a) => a.severity === severity && a.status === 'ACTIVE');
      return acc;
    },
    { CRITICAL: [], WARNING: [], INFO: [] }
  );

  const isValidId = (id: unknown): id is number =>
    typeof id === 'number' && !isNaN(id) && id > 0;

  const handleResolve = async (alert: AnomalyAlert) => {
    console.debug('[AlertPanel] resolve clicked, alert object:', alert);
    if (!isValidId(alert.id)) {
      console.error('[AlertPanel] invalid alert.id:', alert.id, '— aborting resolve');
      setResolveError(`Cannot resolve: alert ID is invalid (got "${alert.id}"). Check backend response.`);
      return;
    }
    setResolvingId(alert.id);
    setResolveError(null);
    const success = await onResolve(alert.id);
    if (!success) {
      setResolveError('Failed to resolve alert. Please try again.');
    }
    setResolvingId(null);
  };

  const handleTriggerCheck = async () => {
    if (!vehicleId) return;
    setTriggering(true);
    await anomalyService.triggerCheck(vehicleId);
    await onRefresh();
    setTriggering(false);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="panel-backdrop" onClick={onClose} />}

      {/* Slide-out Panel */}
      <div className={`alert-panel ${isOpen ? 'alert-panel-open' : ''}`}>
        {/* Panel Header */}
        <div className="panel-header">
          <div className="panel-header-title">
            <FaBell size={18} color="#374151" />
            <h2>Active Alerts</h2>
            <span className="panel-count-badge">{alerts.length}</span>
          </div>
          <div className="panel-header-actions">
            <button
              className="panel-refresh-btn"
              onClick={handleTriggerCheck}
              disabled={triggering || !vehicleId}
              title="Trigger anomaly check"
            >
              <FaSync size={13} className={triggering ? 'spin' : ''} />
              {triggering ? 'Checking...' : 'Check Now'}
            </button>
            <button className="panel-close-btn" onClick={onClose} aria-label="Close panel">
              <FaTimes size={18} />
            </button>
          </div>
        </div>

        {/* Panel Body */}
        <div className="panel-body">
          {resolveError && (
            <div style={{ margin: '0 0 8px', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', fontSize: 13 }}>
              {resolveError}
            </div>
          )}
          {alerts.length === 0 ? (
            <div className="panel-empty">
              <div className="panel-empty-icon">🎉</div>
              <p className="panel-empty-title">All Clear!</p>
              <p className="panel-empty-sub">No active alerts for your vehicle.</p>
            </div>
          ) : (
            severityOrder.map((severity) => {
              const group = grouped[severity];
              if (group.length === 0) return null;
              const cfg = severityConfig[severity];
              const { Icon } = cfg;
              return (
                <div key={severity} className="alert-group">
                  <div className="alert-group-header" style={{ color: cfg.color }}>
                    <Icon size={14} />
                    <span>{cfg.label}</span>
                    <span className="group-count">{group.length}</span>
                  </div>
                  {group.map((alert, i) => (
                    <div
                      key={alert.alertId ?? `${severity}-${i}`}
                      className="alert-item"
                      style={{ borderLeftColor: cfg.color, background: cfg.bg }}
                    >
                      <div className="alert-item-header">
                        <div className="alert-item-icon" style={{ color: cfg.color }}>
                          <Icon size={16} />
                        </div>
                        <div className="alert-item-text">
                          <span className="alert-item-title">{alert.title}</span>
                          <span className="alert-item-msg">{alert.message}</span>
                        </div>
                      </div>

                      <div className="alert-item-range">
                        <span className="range-detected">
                          Detected: <strong style={{ color: cfg.color }}>
                            {alert.detectedValue} {alert.unit}
                          </strong>
                        </span>
                        <span className="range-normal">
                          Normal: {alert.normalRangeMin}–{alert.normalRangeMax} {alert.unit}
                        </span>
                      </div>

                      <div className="alert-item-time">
                        {new Date(alert.detectedAt).toLocaleString()}
                      </div>

                      <div className="alert-item-actions">
                        <button
                          className="btn-view-details"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          View Details
                        </button>
                        <button
                          className="btn-resolve"
                          onClick={() => handleResolve(alert)}
                          disabled={!isValidId(alert.id) || resolvingId === alert.id}
                          title={!isValidId(alert.id) ? 'Alert ID missing — cannot resolve' : 'Mark as resolved'}
                        >
                          {resolvingId === alert.id ? 'Resolving...' : 'Resolve'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="panel-footer">
          <a href="/alerts" className="panel-footer-link" onClick={onClose}>
            View Full Alert History →
          </a>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onResolved={() => {
            setSelectedAlert(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
};

export default AlertPanel;
