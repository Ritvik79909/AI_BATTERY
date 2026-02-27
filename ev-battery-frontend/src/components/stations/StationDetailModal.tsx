import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMapMarkerAlt, FaDirections, FaBolt, FaClock, FaRupeeSign, FaBrain, FaShareAlt, FaTimes } from 'react-icons/fa';
import { stationService } from '../../services/stationService';
import type { ChargingStation, StationDetail } from '../../types/station';
import './StationDetailModal.css';

interface StationDetailModalProps {
  station: ChargingStation;
  onClose: () => void;
}

const StationDetailModal: React.FC<StationDetailModalProps> = ({ station, onClose }) => {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<StationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    stationService
      .getStation(station.id)
      .then((d) => setDetail(d))
      .catch(() => setError('Could not load full details.'))
      .finally(() => setLoading(false));
  }, [station.id]);

  const handleDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lon}`;
    window.open(url, '_blank');
  };

  const handleShare = async () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lon}`;
    const shareData = {
      title: station.name,
      text: `Check out this EV charging station: ${station.name} — ${station.powerKw} kW`,
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user dismissed
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setShareToast('Link copied to clipboard!');
        setTimeout(() => setShareToast(null), 3000);
      } catch {
        setShareToast('Could not copy link.');
        setTimeout(() => setShareToast(null), 3000);
      }
    }
  };

  const handleAskAI = () => {
    const context = {
      stationId: station.id,
      stationName: station.name,
      powerKw: station.powerKw,
      connectorTypes: station.connectorTypes,
      reliabilityScore: station.reliabilityScore,
      distanceKm: station.distanceKm,
    };
    localStorage.setItem('aiCoach_stationContext', JSON.stringify(context));
    navigate('/ai-coach');
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const d = detail ?? station as unknown as StationDetail;
  const reliabilityColor = station.reliabilityScore >= 80 ? '#10b981' : station.reliabilityScore >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="sdm-overlay" onClick={handleOverlayClick}>
      <div className="sdm-panel" role="dialog" aria-modal="true" aria-label={`Station details: ${station.name}`}>

        {/* Header */}
        <div className="sdm-header">
          <div className="sdm-title-block">
            <div className="sdm-title">{station.name}</div>
            <div className="sdm-address">
              <FaMapMarkerAlt size={10} />
              {station.address ?? `${station.lat.toFixed(4)}, ${station.lon.toFixed(4)}`}
            </div>
          </div>
          <button className="sdm-close" onClick={onClose} aria-label="Close modal">
            <FaTimes size={16} />
          </button>
        </div>

        {/* Badges */}
        <div className="sdm-badges">
          {station.recommended && (
            <span className="sdm-badge sdm-badge-rec">✓ Recommended for battery health</span>
          )}
          <span className="sdm-badge sdm-badge-power">
            <FaBolt size={9} style={{ marginRight: 3 }} />
            {station.powerKw} kW
          </span>
          <span className="sdm-badge" style={{ background: `${reliabilityColor}15`, color: reliabilityColor }}>
            Score: {station.reliabilityScore}/100
          </span>
        </div>

        <div className="sdm-divider" />

        {/* Loading / Error */}
        {loading && (
          <div className="sdm-loading">
            <div className="sdm-spinner" />
            Loading station details…
          </div>
        )}
        {error && !loading && (
          <div className="sdm-section">
            <p style={{ color: '#6b7280', fontSize: '0.82rem', textAlign: 'center' }}>
              {error} Showing available info.
            </p>
          </div>
        )}

        {/* Key stats */}
        <div className="sdm-section">
          <div className="sdm-section-title">Overview</div>
          <div className="sdm-stats">
            <div className="sdm-stat">
              <div className="sdm-stat-icon">⚡</div>
              <div className="sdm-stat-val">{station.powerKw} kW</div>
              <div className="sdm-stat-lbl">Max Power</div>
            </div>
            <div className="sdm-stat">
              <div className="sdm-stat-icon">
                <FaClock size={18} style={{ color: '#6366f1' }} />
              </div>
              <div className="sdm-stat-val">
                {d?.estimatedTimeMin ? `${d.estimatedTimeMin} min` : '—'}
              </div>
              <div className="sdm-stat-lbl">Est. Charge Time</div>
            </div>
            <div className="sdm-stat">
              <div className="sdm-stat-icon">
                <FaRupeeSign size={16} style={{ color: '#10b981' }} />
              </div>
              <div className="sdm-stat-val">
                {d?.pricePerKwh ? `₹${d.pricePerKwh}/kWh` : (d?.priceInfo ?? 'Free')}
              </div>
              <div className="sdm-stat-lbl">Pricing</div>
            </div>
          </div>
        </div>

        {/* Connector availability table */}
        {d?.connectorAvailability && d.connectorAvailability.length > 0 ? (
          <div className="sdm-section">
            <div className="sdm-section-title">Connector Availability</div>
            <table className="sdm-connector-table">
              <thead>
                <tr><th>Type</th><th>Power</th><th>Available</th></tr>
              </thead>
              <tbody>
                {d.connectorAvailability.map((c, i) => (
                  <tr key={i}>
                    <td><span className="sdm-connector-type">{c.type}</span></td>
                    <td>{c.powerKw} kW</td>
                    <td>
                      <span className={c.available > 0 ? 'sdm-avail-green' : 'sdm-avail-red'}>
                        {c.available}/{c.total}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="sdm-section">
            <div className="sdm-section-title">Supported Connectors</div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {station.connectorTypes.map((c) => (
                <span key={c} className="sdm-connector-type">{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Extra info */}
        {(d?.openingHours || d?.phone || d?.operator) && (
          <div className="sdm-section sdm-info-row">
            {d.openingHours && <div className="sdm-info-item"><span className="sdm-info-label">Hours</span><span>{d.openingHours}</span></div>}
            {d.operator && <div className="sdm-info-item"><span className="sdm-info-label">Operator</span><span>{d.operator}</span></div>}
            {d.phone && <div className="sdm-info-item"><span className="sdm-info-label">Phone</span><a href={`tel:${d.phone}`} className="sdm-phone">{d.phone}</a></div>}
          </div>
        )}

        <div className="sdm-divider" />

        {/* Share toast */}
        {shareToast && (
          <div className="sdm-share-toast">{shareToast}</div>
        )}

        {/* Actions */}
        <div className="sdm-actions">
          <button className="sdm-btn sdm-btn-primary" onClick={handleDirections}>
            <FaDirections size={14} />
            Get Directions
          </button>
          <button className="sdm-btn sdm-btn-secondary" onClick={handleShare}>
            <FaShareAlt size={13} />
            Share Station
          </button>
          <button className="sdm-btn sdm-btn-ai" onClick={handleAskAI}>
            <FaBrain size={13} />
            Ask AI
          </button>
        </div>
      </div>
    </div>
  );
};

export default StationDetailModal;
