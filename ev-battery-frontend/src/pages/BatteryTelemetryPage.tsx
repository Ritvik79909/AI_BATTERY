import { useState, useEffect, useRef } from 'react';
import { FaFileUpload, FaHistory, FaThermometerHalf, FaBatteryThreeQuarters, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { MdElectricCar } from 'react-icons/md';
import Navbar from '../components/Navbar';
import { vehicleService } from '../services/vehicleService';
import { telemetryService } from '../services/telemetryService';
import type { Vehicle } from '../types/vehicle';
import type { TelemetryRecord, TelemetryData } from '../types/telemetry';
import './BatteryTelemetryPage.css';

const BatteryTelemetryPage = () => {
  // State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'manual' | 'dataset' | 'document'>('manual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [latestMetrics, setLatestMetrics] = useState<TelemetryRecord | null>(null);
  const [history, setHistory] = useState<TelemetryRecord[]>([]);

  // File inputs
  const datasetInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [previewData, setPreviewData] = useState<TelemetryRecord[] | null>(null);

  // Manual Form State
  const [manualForm, setManualForm] = useState<TelemetryData>({
    soc: 50,
    temperature: 25,
    voltage: 380,
    current: 10,
    cycleCount: 0,
    chargingState: 'IDLE'
  });

  // Effects
  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (selectedVehicleId) {
      refreshData();
    } else {
      setLatestMetrics(null);
      setHistory([]);
    }
  }, [selectedVehicleId]);

  // Actions
  const fetchVehicles = async () => {
    try {
      const data = await vehicleService.getVehicles();
      setVehicles(data);
      if (data.length > 0) {
        setSelectedVehicleId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch vehicles", err);
      showError("Failed to fetch vehicles. Please try again.");
    }
  };

  const refreshData = async () => {
    if (!selectedVehicleId) return;
    try {
      setLoading(true);
      const [latest, recent] = await Promise.all([
        telemetryService.fetchLatestTelemetry(selectedVehicleId),
        telemetryService.fetchRecentTelemetry(selectedVehicleId)
      ]);
      setLatestMetrics(latest);
      setHistory(recent);
    } catch (err) {
      console.error("Failed to refresh data", err);
      // Don't show error toast on simple refresh to avoid spam, but log it
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!selectedVehicleId) return showError("Please select a vehicle.");
    try {
      setLoading(true);
      await telemetryService.ingestManualTelemetry(selectedVehicleId, manualForm);
      showSuccess("Telemetry ingested successfully!");
      await refreshData();
      // Reset form slightly or keep values? Prompt says "Refresh latest telemetry + history", implies form might stay for next reading or reset. keeping values is usually better for sequential entry.
    } catch (err) {
      showError("Failed to ingest manual telemetry.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'dataset' | 'document') => {
    if (!selectedVehicleId) return showError("Please select a vehicle.");
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type roughly
    if (type === 'dataset' && !file.name.endsWith('.csv')) {
      return showError("Please select a CSV file.");
    }
    // Document validation (pdf, xlsx, txt) - let backend handle strict validation or do basic extension check

    try {
      setLoading(true);
      let result: TelemetryRecord[];
      if (type === 'dataset') {
        result = await telemetryService.uploadDataset(selectedVehicleId, file);
      } else {
        result = await telemetryService.uploadDocument(selectedVehicleId, file);
      }

      setPreviewData(result);
      showSuccess(`Uploaded and parsed ${result.length} records successfully.`);
      await refreshData();

      // Reset input
      if (e.target) e.target.value = '';
    } catch (err) {
      showError(`Failed to upload ${type}.`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helpers
  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3000);
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Renders
  const renderToast = () => {
    if (error) return <div className="toast toast-error"><FaExclamationCircle /> {error}</div>;
    if (success) return <div className="toast toast-success"><FaCheckCircle /> {success}</div>;
    return null;
  };

  return (
    <div className="telemetry-container">
      {renderToast()}
      <Navbar activeTab='telemetry' /> {/* Pass standard props, might need updates to Navbar if strict typing */}

      <div className="telemetry-header-section">
        <div className="page-title">
          <span>Battery Telemetry & Ingestion</span>
        </div>

        <div className="vehicle-selector">
          <span style={{ fontWeight: 600, color: '#4b5563' }}>Active Vehicle:</span>
          <select
            className="vehicle-select"
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
          >
            <option value="" disabled>Select a vehicle...</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.nickname || `${v.make} ${v.model}`}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="telemetry-grid">
        {/* Left Column: Ingestion */}
        <div className="ingestion-section">
          <div className="tabs-container">
            <button
              className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
              onClick={() => setActiveTab('manual')}
            >Manual Input</button>
            <button
              className={`tab-btn ${activeTab === 'dataset' ? 'active' : ''}`}
              onClick={() => setActiveTab('dataset')}
            >Dataset CSV</button>
            <button
              className={`tab-btn ${activeTab === 'document' ? 'active' : ''}`}
              onClick={() => setActiveTab('document')}
            >Document</button>
          </div>

          <div className="ingest-panel tele-card">
            <div className="tele-card-title">
              {activeTab === 'manual' && 'Manual Entry'}
              {activeTab === 'dataset' && 'Bulk Dataset Upload'}
              {activeTab === 'document' && 'Unstructured Document Ingestion'}
            </div>

            {activeTab === 'manual' && (
              <div className="manual-form">
                <div className="metrics-grid">
                  <div className="form-group">
                    <label className="form-label">State of Charge (SoC): {manualForm.soc}%</label>
                    <input
                      type="range" className="range-slider" min="0" max="100"
                      value={manualForm.soc}
                      onChange={e => setManualForm({ ...manualForm, soc: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Temperature (°C)</label>
                    <input
                      type="number" className="form-input"
                      value={manualForm.temperature}
                      onChange={e => setManualForm({ ...manualForm, temperature: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Voltage (V)</label>
                    <input
                      type="number" className="form-input"
                      value={manualForm.voltage}
                      onChange={e => setManualForm({ ...manualForm, voltage: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Current (A)</label>
                    <input
                      type="number" className="form-input"
                      value={manualForm.current}
                      onChange={e => setManualForm({ ...manualForm, current: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cycle Count</label>
                    <input
                      type="number" className="form-input"
                      value={manualForm.cycleCount}
                      onChange={e => setManualForm({ ...manualForm, cycleCount: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Charging State</label>
                    <select
                      className="form-input"
                      value={manualForm.chargingState}
                      onChange={e => setManualForm({ ...manualForm, chargingState: e.target.value as any })}
                    >
                      <option value="IDLE">IDLE</option>
                      <option value="CHARGING">CHARGING</option>
                      <option value="DISCHARGING">DISCHARGING</option>
                    </select>
                  </div>
                </div>
                <button className="submit-btn" disabled={loading} onClick={handleManualSubmit}>
                  {loading ? 'Submitting...' : 'Submit Telemetry'}
                </button>
              </div>
            )}

            {(activeTab === 'dataset' || activeTab === 'document') && (
              <div className="upload-container">
                <div className="upload-zone" onClick={() => (activeTab === 'dataset' ? datasetInputRef : documentInputRef).current?.click()}>
                  <FaFileUpload className="upload-icon" />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Click to Upload {activeTab === 'dataset' ? 'CSV Dataset' : 'Document'}</h3>
                    <p style={{ margin: '0.5rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
                      {activeTab === 'dataset' ? 'Accepts .csv files' : 'Accepts PDF, Excel, TXT'}
                    </p>
                  </div>
                  <input
                    ref={activeTab === 'dataset' ? datasetInputRef : documentInputRef}
                    type="file"
                    accept={activeTab === 'dataset' ? ".csv" : ".pdf,.xlsx,.xls,.txt"}
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileUpload(e, activeTab)}
                  />
                </div>

                {previewData && previewData.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', marginBottom: '1rem' }}>
                      <FaCheckCircle />
                      <span style={{ fontWeight: 600 }}>Upload Successful! Preview:</span>
                    </div>
                    <div className="history-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <table className="tele-table">
                        <thead>
                          <tr>
                            <th>Timestamp</th>
                            <th>SoC</th>
                            <th>Temp</th>
                            <th>V</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.slice(0, 5).map((row, i) => (
                            <tr key={i}>
                              <td>{new Date(row.timestamp || Date.now()).toLocaleTimeString()}</td>
                              <td>{row.soc}%</td>
                              <td>{row.temperature}°C</td>
                              <td>{row.voltage}V</td>
                              <td>{row.chargingState}</td>
                            </tr>
                          ))}
                        </tbody>
                        {previewData.length > 5 && (
                          <tfoot>
                            <tr><td colSpan={5} style={{ textAlign: 'center', color: '#6b7280', paddingTop: '0.5rem' }}>...and {previewData.length - 5} more</td></tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="tele-card" style={{ marginTop: '1.5rem' }}>
            <div className="tele-card-title">
              <FaHistory /> Raw Telemetry History
            </div>
            <div className="history-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {history.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                  No telemetry history found for this vehicle.
                </div>
              ) : (
                <table className="tele-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>SoC</th>
                      <th>Temp</th>
                      <th>Volt</th>
                      <th>Curr</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row, i) => (
                      <tr key={i}>
                        <td>{row.timestamp ? new Date(row.timestamp).toLocaleTimeString() : '-'}</td>
                        <td style={{ fontWeight: 600, color: row.soc < 20 ? '#ef4444' : '#1f2937' }}>{row.soc}%</td>
                        <td>{row.temperature}°C</td>
                        <td>{row.voltage}V</td>
                        <td>{row.current}A</td>
                        <td>
                          <span className={`source-badge source-${row.source?.toLowerCase()}`}>
                            {row.source}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Latest Metrics */}
        <div className="metrics-section">
          <div className="tele-card">
            <div className="tele-card-title">Latest Metrics</div>
            {latestMetrics ? (
              <div className="metrics-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="metric-item" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981' }}>
                  <span className="metric-label">State of Charge</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FaBatteryThreeQuarters color="#10b981" size={24} />
                    <span className="metric-value" style={{ fontSize: '2rem', color: '#065f46' }}>{latestMetrics.soc}%</span>
                  </div>
                </div>

                <div className="metric-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="metric-label">Temperature</span>
                    <FaThermometerHalf color={latestMetrics.temperature > 40 ? '#ef4444' : '#f59e0b'} />
                  </div>
                  <div>
                    <span className="metric-value">{latestMetrics.temperature}</span>
                    <span className="metric-unit">°C</span>
                  </div>
                </div>

                <div className="metric-item">
                  <span className="metric-label">Voltage</span>
                  <div>
                    <span className="metric-value">{latestMetrics.voltage}</span>
                    <span className="metric-unit">V</span>
                  </div>
                </div>

                <div className="metric-item">
                  <span className="metric-label">Current</span>
                  <div>
                    <span className="metric-value">{latestMetrics.current}</span>
                    <span className="metric-unit">A</span>
                  </div>
                </div>

                <div className="metric-item">
                  <span className="metric-label">Cycle Count</span>
                  <div>
                    <span className="metric-value">{latestMetrics.cycleCount}</span>
                  </div>
                </div>

                <div className="metric-item">
                  <span className="metric-label">State</span>
                  <div style={{ fontWeight: 600, color: latestMetrics.chargingState === 'CHARGING' ? '#10b981' : '#6b7280' }}>
                    {latestMetrics.chargingState}
                  </div>
                </div>

                <div className="metric-item">
                  <span className="metric-label">Last Updated</span>
                  <div style={{ fontSize: '0.85rem', color: '#374151' }}>
                    {latestMetrics.timestamp ? new Date(latestMetrics.timestamp).toLocaleString() : 'Just now'}
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <span className={`source-badge source-${latestMetrics.source?.toLowerCase()}`}>
                      {latestMetrics.source} SOURCE
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                <MdElectricCar size={48} style={{ opacity: 0.5 }} />
                <p>No telemetry data available. Select a vehicle or ingest data.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Styles */}
      <style>{`
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            z-index: 1000;
            animation: slideIn 0.3s ease;
            font-weight: 600;
        }
        .toast-error { background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; }
        .toast-success { background: #dcfce7; color: #16a34a; border: 1px solid #86efac; }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default BatteryTelemetryPage;
