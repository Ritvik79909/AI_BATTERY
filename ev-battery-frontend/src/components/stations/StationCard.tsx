import React from 'react';
import { FaBolt, FaMapMarkerAlt, FaCheckCircle, FaRulerHorizontal } from 'react-icons/fa';
import type { ChargingStation, ConnectorType } from '../../types/station';
import './StationCard.css';

interface StationCardProps {
  station: ChargingStation;
  highlighted?: boolean;
  onClick: (station: ChargingStation) => void;
}

function reliabilityColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function reliabilityLabel(score: number): string {
  if (score >= 80) return 'High';
  if (score >= 60) return 'Moderate';
  return 'Low';
}

const CONNECTOR_COLORS: Record<ConnectorType, string> = {
  CCS: '#3b82f6',
  CHADEMO: '#8b5cf6',
  TYPE2: '#0ea5e9',
  AC: '#6b7280',
  UNKNOWN: '#9ca3af',
};

const StationCard: React.FC<StationCardProps> = ({ station, highlighted, onClick }) => {
  const color = reliabilityColor(station.reliabilityScore);

  return (
    <div
      className={`sc-card ${highlighted ? 'sc-highlighted' : ''} ${station.recommended ? 'sc-recommended-card' : ''}`}
      onClick={() => onClick(station)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(station)}
    >
      {/* Recommended ribbon */}
      {station.recommended && (
        <div className="sc-recommended-ribbon">★ Top Pick</div>
      )}

      {/* Header */}
      <div className="sc-header">
        <div className="sc-name">{station.name}</div>
        <div className="sc-distance-badge">
          <FaMapMarkerAlt size={9} style={{ marginRight: 3 }} />
          {station.distanceKm.toFixed(1)} km
        </div>
      </div>

      {/* Power + Operator */}
      <div className="sc-meta">
        <div className="sc-power">
          <FaBolt className="sc-power-icon" />
          {station.powerKw} kW
        </div>
        {station.operator && (
          <div className="sc-operator">· {station.operator}</div>
        )}
        {station.pricePerKwh ? (
          <div className="sc-price">₹{station.pricePerKwh.toFixed(2)}/kWh</div>
        ) : null}
      </div>

      {/* Connector chips */}
      <div className="sc-connectors">
        {station.connectorTypes.map((c) => (
          <span
            key={c}
            className="sc-chip"
            style={{ background: `${CONNECTOR_COLORS[c]}18`, color: CONNECTOR_COLORS[c], borderColor: `${CONNECTOR_COLORS[c]}30` }}
          >
            {c}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="sc-footer">
        <div className="sc-reliability" style={{ color }}>
          <div className="sc-score-dot" style={{ background: color }} />
          <span className="sc-score-text">
            {station.reliabilityScore}/100 · {reliabilityLabel(station.reliabilityScore)} Reliability
          </span>
        </div>

        {station.availableConnectors !== undefined && station.totalConnectors !== undefined && (
          <div className="sc-avail">
            <div className="sc-avail-dot" />
            {station.availableConnectors}/{station.totalConnectors} free
          </div>
        )}
      </div>

      {/* Recommended badge */}
      {station.recommended && (
        <div className="sc-rec-badge">
          <FaCheckCircle size={10} />
          Recommended for battery health
        </div>
      )}

      {/* View Details CTA */}
      <button
        className="sc-view-btn"
        onClick={(e) => { e.stopPropagation(); onClick(station); }}
        tabIndex={-1}
      >
        <FaRulerHorizontal size={10} />
        View Details
      </button>
    </div>
  );
};

/* Skeleton loader */
export const StationCardSkeleton: React.FC = () => (
  <div className="sc-skeleton">
    <div className="sc-skel-line" style={{ height: 18, width: '65%' }} />
    <div className="sc-skel-line" style={{ height: 13, width: '40%' }} />
    <div className="sc-skel-line" style={{ height: 13, width: '55%' }} />
    <div className="sc-skel-line" style={{ height: 13, width: '80%' }} />
    <div className="sc-skel-line" style={{ height: 13, width: '45%', marginBottom: 0 }} />
  </div>
);

export default StationCard;
