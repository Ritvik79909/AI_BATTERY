import React, { useState, useEffect, useMemo } from 'react';
import {
  FaExclamationCircle, FaExclamationTriangle, FaInfoCircle,
  FaCheckCircle, FaFilter, FaSync
} from 'react-icons/fa';
import Navbar from '../components/Navbar';
import AlertDetailModal from '../components/AlertDetailModal';
import { anomalyService } from '../services/anomalyService';
import { vehicleService } from '../services/vehicleService';
import type { AnomalyAlert, AlertSeverity, AlertStatus } from '../types/anomaly';
import type { Vehicle } from '../types/vehicle';
import './AlertsHistoryPage.css';

const severityConfig = {
  CRITICAL: { label: 'Critical', color: '#ef4444', bg: '#fef2f2', Icon: FaExclamationCircle },
  WARNING: { label: 'Warning', color: '#f59e0b', bg: '#fffbeb', Icon: FaExclamationTriangle },
  INFO: { label: 'Info', color: '#3b82f6', bg: '#eff6ff', Icon: FaInfoCircle },
};

const AlertsHistoryPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [allAlerts, setAllAlerts] = useState<AnomalyAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<AnomalyAlert | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'ALL'>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    vehicleService.getVehicles().then((data) => {
      setVehicles(data);
      if (data.length > 0) setSelectedVehicleId(data[0].id);
      setVehiclesLoading(false);
    }).catch(() => setVehiclesLoading(false));
  }, []);

  const fetchAlerts = async (vehicleId: string) => {
    setLoading(true);
    const data = await anomalyService.getAllAlerts(vehicleId);
    setAllAlerts(data);
    setLoading(false);
  };

  useEffect(() => {
    if (selectedVehicleId) fetchAlerts(selectedVehicleId);
  }, [selectedVehicleId]);

  const filteredAlerts = useMemo(() => {
    return allAlerts.filter((a) => {
      if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      if (dateFrom && new Date(a.detectedAt) < new Date(dateFrom)) return false;
      if (dateTo && new Date(a.detectedAt) > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    }).sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
  }, [allAlerts, severityFilter, statusFilter, dateFrom, dateTo]);

  const handleResolve = async (alertId: number) => {
    setResolvingId(alertId);
    await anomalyService.resolveAlert(alertId);
    if (selectedVehicleId) await fetchAlerts(selectedVehicleId);
    setResolvingId(null);
  };

  const criticalCount = allAlerts.filter((a) => a.severity === 'CRITICAL' && a.status === 'ACTIVE').length;
  const warningCount = allAlerts.filter((a) => a.severity === 'WARNING' && a.status === 'ACTIVE').length;
  const resolvedCount = allAlerts.filter((a) => a.status === 'RESOLVED').length;

  return (
    <div className="ahp-container">
      <Navbar activeTab="alerts" />

      <div className="ahp-content">
        <div className="ahp-page-header">
          <div>
            <h1 className="ahp-page-title">Anomaly Alert History</h1>
            <p className="ahp-page-sub">Track and manage detected battery anomalies for your vehicle.</p>
          </div>
          {selectedVehicleId && (
            <button
              className="ahp-refresh-btn"
              onClick={() => fetchAlerts(selectedVehicleId)}
              disabled={loading}
            >
              <FaSync size={14} className={loading ? 'spin' : ''} />
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
        </div>

        {/* Vehicle selector */}
        {vehiclesLoading ? (
          <div className="ahp-loading">Loading vehicles…</div>
        ) : vehicles.length === 0 ? (
          <div className="ahp-empty-page">No vehicle found. Please add a vehicle first.</div>
        ) : (
          <>
            <div className="ahp-vehicle-row">
              <label htmlFor="ahp-vehicle-select" className="ahp-vehicle-label">Vehicle:</label>
              <select
                id="ahp-vehicle-select"
                name="vehicleId"
                className="ahp-vehicle-select"
                value={selectedVehicleId || ''}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nickname} ({v.make} {v.model})
                  </option>
                ))}
              </select>
            </div>

            {/* Summary pills */}
            <div className="ahp-summary-pills">
              <div className="ahp-pill critical">
                <FaExclamationCircle size={14} />
                <span>{criticalCount} Critical</span>
              </div>
              <div className="ahp-pill warning">
                <FaExclamationTriangle size={14} />
                <span>{warningCount} Warning</span>
              </div>
              <div className="ahp-pill resolved">
                <FaCheckCircle size={14} />
                <span>{resolvedCount} Resolved</span>
              </div>
            </div>

            {/* Filters */}
            <div className="ahp-filters">
              <div className="ahp-filters-label">
                <FaFilter size={13} /> Filters
              </div>
              <select
                id="severity-filter"
                name="severity"
                className="ahp-filter-select"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | 'ALL')}
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="WARNING">Warning</option>
                <option value="INFO">Info</option>
              </select>
              <select
                id="status-filter"
                name="status"
                className="ahp-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AlertStatus | 'ALL')}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="RESOLVED">Resolved</option>
              </select>
              <div className="ahp-date-range">
                <input
                  type="date"
                  id="date-from"
                  name="dateFrom"
                  className="ahp-filter-input"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="From"
                />
                <span className="ahp-date-sep">–</span>
                <input
                  type="date"
                  id="date-to"
                  name="dateTo"
                  className="ahp-filter-input"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="To"
                />
              </div>
              {(severityFilter !== 'ALL' || statusFilter !== 'ALL' || dateFrom || dateTo) && (
                <button
                  className="ahp-clear-btn"
                  onClick={() => {
                    setSeverityFilter('ALL');
                    setStatusFilter('ALL');
                    setDateFrom('');
                    setDateTo('');
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Alert list */}
            {loading ? (
              <div className="ahp-loading">Loading alerts…</div>
            ) : filteredAlerts.length === 0 ? (
              <div className="ahp-empty">
                <div className="ahp-empty-icon">✅</div>
                <p>No alerts match your current filters.</p>
              </div>
            ) : (
              <div className="ahp-list">
                {filteredAlerts.map((alert) => {
                  const cfg = severityConfig[alert.severity] || severityConfig.INFO;
                  const { Icon } = cfg;
                  return (
                    <div
                      key={alert.id}
                      className="ahp-alert-card"
                      style={{ borderLeftColor: cfg.color }}
                    >
                      <div className="ahp-card-top">
                        <div className="ahp-card-left">
                          <div className="ahp-card-icon" style={{ color: cfg.color }}>
                            <Icon size={18} />
                          </div>
                          <div className="ahp-card-info">
                            <div className="ahp-card-title">{alert.title}</div>
                            <div className="ahp-card-msg">{alert.message}</div>
                            <div className="ahp-card-meta">
                              <span
                                className="ahp-severity-badge"
                                style={{ background: cfg.bg, color: cfg.color }}
                              >
                                {cfg.label}
                              </span>
                              <span
                                className={`ahp-status-badge ${alert.status === 'ACTIVE' ? 'status-active' : 'status-resolved'}`}
                              >
                                {alert.status === 'ACTIVE' ? 'Active' : 'Resolved'}
                              </span>
                              <span className="ahp-card-time">
                                {new Date(alert.detectedAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="ahp-card-right">
                          <div className="ahp-detected-val" style={{ color: cfg.color }}>
                            {alert.detectedValue} {alert.unit}
                          </div>
                          <div className="ahp-normal-range">
                            Normal: {alert.normalRangeMin}–{alert.normalRangeMax} {alert.unit}
                          </div>
                        </div>
                      </div>

                      {alert.resolutionNotes && (
                        <div className="ahp-resolution-notes">
                          <FaCheckCircle size={12} color="#10b981" />
                          <span>{alert.resolutionNotes}</span>
                        </div>
                      )}

                      <div className="ahp-card-actions">
                        <button
                          className="ahp-btn-details"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          View Details
                        </button>
                        {alert.status === 'ACTIVE' && (
                          <button
                            className="ahp-btn-resolve"
                            onClick={() => handleResolve(alert.id)}
                            disabled={resolvingId === alert.id}
                          >
                            {resolvingId === alert.id ? 'Resolving…' : 'Resolve'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onResolved={() => {
            setSelectedAlert(null);
            if (selectedVehicleId) fetchAlerts(selectedVehicleId);
          }}
        />
      )}
    </div>
  );
};

export default AlertsHistoryPage;
