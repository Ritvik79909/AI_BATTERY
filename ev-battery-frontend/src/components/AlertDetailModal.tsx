import React, { useState } from 'react';
import {
  FaTimes, FaExclamationCircle, FaExclamationTriangle,
  FaInfoCircle, FaCheckCircle
} from 'react-icons/fa';
import type { AnomalyAlert } from '../types/anomaly';
import { anomalyService } from '../services/anomalyService';
import './AlertDetailModal.css';

interface AlertDetailModalProps {
  alert: AnomalyAlert;
  onClose: () => void;
  onResolved: () => void;
}

const severityConfig = {
  CRITICAL: { color: '#ef4444', bg: '#fef2f2', label: 'Critical', Icon: FaExclamationCircle },
  WARNING: { color: '#f59e0b', bg: '#fffbeb', label: 'Warning', Icon: FaExclamationTriangle },
  INFO: { color: '#3b82f6', bg: '#eff6ff', label: 'Info', Icon: FaInfoCircle },
};

const AlertDetailModal: React.FC<AlertDetailModalProps> = ({ alert, onClose, onResolved }) => {
  const [resolving, setResolving] = useState(false);
  const [notes, setNotes] = useState('');

  const cfg = severityConfig[alert.severity] || severityConfig.INFO;
  const { Icon } = cfg;

  const rangeSpan = alert.normalRangeMax - alert.normalRangeMin;
  const clampedValue = Math.min(Math.max(alert.detectedValue, alert.normalRangeMin - rangeSpan * 0.2), alert.normalRangeMax + rangeSpan * 0.2);
  const markerPercent = ((clampedValue - (alert.normalRangeMin - rangeSpan * 0.2)) / (rangeSpan * 1.4)) * 100;
  const okLeftPercent = ((alert.normalRangeMin - (alert.normalRangeMin - rangeSpan * 0.2)) / (rangeSpan * 1.4)) * 100;
  const okWidthPercent = (rangeSpan / (rangeSpan * 1.4)) * 100;

  const isOutOfRange = alert.detectedValue < alert.normalRangeMin || alert.detectedValue > alert.normalRangeMax;

  const handleResolve = async () => {
    setResolving(true);
    const ok = await anomalyService.resolveAlert(alert.id, notes || undefined);
    setResolving(false);
    if (ok) onResolved();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header" style={{ borderLeftColor: cfg.color }}>
          <div className="modal-header-left">
            <Icon size={24} color={cfg.color} />
            <div>
              <span className="modal-severity-badge" style={{ background: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>
              <h2 className="modal-title">{alert.title}</h2>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <FaTimes size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Full Message */}
          <p className="modal-message">{alert.message}</p>

          {/* Value Visualization */}
          <div className="modal-section">
            <h3 className="modal-section-title">Detected Value</h3>
            <div className="value-display">
              <span className="value-number" style={{ color: isOutOfRange ? cfg.color : '#10b981' }}>
                {alert.detectedValue} <span className="value-unit">{alert.unit}</span>
              </span>
              {isOutOfRange && (
                <span className="value-out-badge" style={{ background: cfg.bg, color: cfg.color }}>
                  Outside Normal Range
                </span>
              )}
            </div>

            {/* Range Bar */}
            <div className="range-bar-container">
              <div className="range-bar-track">
                <div
                  className="range-bar-normal"
                  style={{ left: `${okLeftPercent}%`, width: `${okWidthPercent}%` }}
                />
                <div
                  className="range-bar-marker"
                  style={{ left: `${markerPercent}%`, background: isOutOfRange ? cfg.color : '#10b981' }}
                  title={`${alert.detectedValue} ${alert.unit}`}
                />
              </div>
              <div className="range-bar-labels">
                <span>{alert.normalRangeMin} {alert.unit}</span>
                <span className="range-label-normal">Normal Range</span>
                <span>{alert.normalRangeMax} {alert.unit}</span>
              </div>
            </div>
          </div>

          {/* Recommended Action */}
          <div className="modal-section modal-action-box">
            <h3 className="modal-section-title">Recommended Action</h3>
            <p className="modal-action-text">{alert.recommendedAction}</p>
          </div>

          {/* Timestamps */}
          <div className="modal-meta">
            <div className="meta-item">
              <span className="meta-label">Detected at</span>
              <span className="meta-value">{new Date(alert.detectedAt).toLocaleString()}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Status</span>
              <span className="meta-value"
                style={{ color: alert.status === 'ACTIVE' ? cfg.color : '#10b981', fontWeight: 600 }}>
                {alert.status === 'ACTIVE' ? 'Active' : 'Resolved'}
              </span>
            </div>
            {alert.resolvedAt && (
              <div className="meta-item">
                <span className="meta-label">Resolved at</span>
                <span className="meta-value">{new Date(alert.resolvedAt).toLocaleString()}</span>
              </div>
            )}
            {alert.resolutionNotes && (
              <div className="meta-item">
                <span className="meta-label">Resolution notes</span>
                <span className="meta-value">{alert.resolutionNotes}</span>
              </div>
            )}
          </div>

          {/* Resolve section (only if active) */}
          {alert.status === 'ACTIVE' && (
            <div className="modal-resolve-section">
              <textarea
                className="resolve-notes-input"
                placeholder="Resolution notes (optional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
              <button
                className="resolve-btn"
                onClick={handleResolve}
                disabled={resolving}
              >
                <FaCheckCircle size={16} />
                {resolving ? 'Resolving...' : 'Mark as Resolved'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertDetailModal;
