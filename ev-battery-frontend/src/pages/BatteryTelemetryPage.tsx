import { useState, useEffect, useRef, useCallback } from 'react';
import { FaFileUpload, FaHistory, FaThermometerHalf, FaBatteryThreeQuarters, FaCheckCircle, FaExclamationCircle, FaHeart, FaClock } from 'react-icons/fa';
import { MdElectricCar } from 'react-icons/md';
import Navbar from '../components/Navbar';
import { vehicleService } from '../services/vehicleService';
import { telemetryService } from '../services/telemetryService';
import { processedBatteryService } from '../services/processedBatteryService';
import type { Vehicle } from '../types/vehicle';
import type { TelemetryRecord, TelemetryData, ProcessedBatteryData, DailyBatterySummary } from '../types/telemetry';
import './BatteryTelemetryPage.css';

const BatteryTelemetryPage = () => {
  // State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [mainTab, setMainTab] = useState<'telemetry' | 'health'>('telemetry');
  const [activeTab, setActiveTab] = useState<'manual' | 'dataset' | 'document'>('manual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [latestMetrics, setLatestMetrics] = useState<TelemetryRecord | null>(null);
  const [history, setHistory] = useState<TelemetryRecord[]>([]);

  // Day-10: Processed Battery Data State
  const [processedData, setProcessedData] = useState<ProcessedBatteryData | null>(null);
  const [dailySummaries, setDailySummaries] = useState<DailyBatterySummary[]>([]);
  const [processedLoading, setProcessedLoading] = useState(false);

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
      refreshProcessedData();

      // Auto-refresh processed data every 30 seconds
      const interval = setInterval(() => {
        refreshProcessedData();
      }, 30000);

      return () => clearInterval(interval);
    } else {
      setLatestMetrics(null);
      setHistory([]);
      setProcessedData(null);
      setDailySummaries([]);
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

  const refreshProcessedData = useCallback(async () => {
    if (!selectedVehicleId) return;
    try {
      setProcessedLoading(true);
      // Add cache buster and force fresh data
      const timestamp = Date.now();
      const [processed, summaries] = await Promise.all([
        processedBatteryService.getLatestProcessedBattery(selectedVehicleId, timestamp),
        processedBatteryService.getDailyBatterySummary(selectedVehicleId, timestamp)
      ]);
      setProcessedData(processed || null);
      setDailySummaries(summaries || []);
    } catch (err) {
      console.error("Failed to refresh processed data", err);
      setProcessedData(null);
      setDailySummaries([]);
    } finally {
      setProcessedLoading(false);
    }
  }, [selectedVehicleId]);

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

  const getTemperatureColor = (temp: number): string => {
    if (temp > 45) return '#ef4444'; // red
    if (temp > 35) return '#f59e0b'; // yellow
    return '#10b981'; // green
  };

  const formatTimestamp = (timestamp: string | undefined): string => {
    if (!timestamp) return 'Just now';
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="telemetry-container">
      {renderToast()}
      <Navbar activeTab='telemetry' /> {/* Pass standard props, might need updates to Navbar if strict typing */}

      <div className="telemetry-header-section">
        <div className="page-title">
          <span>Battery Management</span>
        </div>

        <div className="vehicle-selector">
          <span style={{ fontWeight: 600, color: '#4b5563' }}>Active Vehicle:</span>
          <select
            id="vehicleSelect"
            name="vehicleId"
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

      {/* Main Tab Navigation */}
      <div className="main-tabs-container">
        <button
          className={`main-tab-btn ${mainTab === 'telemetry' ? 'active' : ''}`}
          onClick={() => setMainTab('telemetry')}
        >
          Telemetry Ingestion
        </button>
        <button
          className={`main-tab-btn ${mainTab === 'health' ? 'active' : ''}`}
          onClick={() => setMainTab('health')}
        >
          <FaHeart style={{ marginRight: '0.5rem' }} />
          Battery Health
        </button>
      </div>

      {/* Telemetry Tab Content */}
      {mainTab === 'telemetry' && (
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
                      <label className="form-label" htmlFor="socInput">State of Charge (SoC): {manualForm.soc}%</label>
                      <input
                        id="socInput"
                        name="soc"
                        type="range" className="range-slider" min="0" max="100"
                        value={manualForm.soc}
                        onChange={e => setManualForm({ ...manualForm, soc: Number(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="temperatureInput">Temperature (°C)</label>
                      <input
                        id="temperatureInput"
                        name="temperature"
                        type="number" className="form-input"
                        value={manualForm.temperature}
                        onChange={e => setManualForm({ ...manualForm, temperature: Number(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="voltageInput">Voltage (V)</label>
                      <input
                        id="voltageInput"
                        name="voltage"
                        type="number" className="form-input"
                        value={manualForm.voltage}
                        onChange={e => setManualForm({ ...manualForm, voltage: Number(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="currentInput">Current (A)</label>
                      <input
                        id="currentInput"
                        name="current"
                        type="number" className="form-input"
                        value={manualForm.current}
                        onChange={e => setManualForm({ ...manualForm, current: Number(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="cycleCountInput">Cycle Count</label>
                      <input
                        id="cycleCountInput"
                        name="cycleCount"
                        type="number" className="form-input"
                        value={manualForm.cycleCount}
                        onChange={e => setManualForm({ ...manualForm, cycleCount: Number(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="chargingStateSelect">Charging State</label>
                      <select
                        id="chargingStateSelect"
                        name="chargingState"
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
      )}

      {/* Battery Health Tab Content */}
      {mainTab === 'health' && (
        <div className="health-section">
          <div className="health-grid">
            {/* Processed Metrics Panel */}
            <div className="tele-card">
              <div className="tele-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Processed Battery Metrics</span>
                <button
                  onClick={() => refreshProcessedData()}
                  className="refresh-btn"
                  disabled={processedLoading}
                  style={{
                    padding: '0.5rem 1rem',
                    background: processedLoading ? '#d1d5db' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: processedLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>↻</span> {processedLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              {processedData ? (
                <div className="processed-metrics-grid">
                  <div className="processed-metric-card primary-metric">
                    <span className="metric-label">Normalized State of Charge</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <FaBatteryThreeQuarters size={32} color="#10b981" />
                      <span className="metric-value-large">{processedData.soc}%</span>
                    </div>
                  </div>

                  <div className="processed-metric-card">
                    <span className="metric-label">Smoothed Temperature</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <FaThermometerHalf size={24} color={getTemperatureColor(processedData.temperature)} />
                      <span className="metric-value" style={{ color: getTemperatureColor(processedData.temperature) }}>
                        {processedData.temperature}°C
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>After noise filtering</div>
                  </div>

                  <div className="processed-metric-card">
                    <span className="metric-label">Voltage</span>
                    <div className="metric-value" style={{ marginTop: '0.5rem' }}>{processedData.voltage}V</div>
                  </div>

                  <div className="processed-metric-card">
                    <span className="metric-label">Current</span>
                    <div className="metric-value" style={{ marginTop: '0.5rem' }}>{processedData.current}A</div>
                  </div>

                  <div className="processed-metric-card">
                    <span className="metric-label">Charging State</span>
                    <div style={{ marginTop: '0.5rem', fontWeight: 600, fontSize: '1rem', color: processedData.chargingState === 'CHARGING' ? '#10b981' : processedData.chargingState === 'DISCHARGING' ? '#f59e0b' : '#6b7280' }}>
                      {processedData.chargingState === 'CHARGING' && '⚡ Charging'}
                      {processedData.chargingState === 'DISCHARGING' && '🔋 Discharging'}
                      {processedData.chargingState === 'IDLE' && '⏸️ Idle'}
                    </div>
                  </div>

                  <div className="processed-metric-card">
                    <span className="metric-label">Data Source</span>
                    <div style={{ marginTop: '0.5rem' }}>
                      <span className={`source-badge source-${processedData.source.toLowerCase()}`}>
                        {processedData.source}
                      </span>
                    </div>
                  </div>

                  <div className="processed-metric-card full-width">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span className="metric-label">Last Updated</span>
                        <div style={{ marginTop: '0.25rem', fontSize: '0.9rem', color: '#374151' }}>
                          <FaClock style={{ marginRight: '0.5rem', fontSize: '0.8rem' }} />
                          {formatTimestamp(processedData.timestamp)}
                        </div>
                      </div>
                      <div className={`quality-badge ${processedData.isComplete ? 'complete' : 'partial'}`}>
                        {processedData.isComplete ? '🟢 Up-to-date' : '🟡 Partial data'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                  <MdElectricCar size={56} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                  <p style={{ fontWeight: 500, fontSize: '1rem' }}>No processed battery data yet</p>
                  <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Add telemetry data to begin tracking battery health</p>
                </div>
              )}
            </div>

            {/* Data Quality & Trust Indicators */}
            {processedData && (
              <div className="tele-card">
                <div className="tele-card-title">Data Quality Status</div>
                <div className="quality-info">
                  <div className="quality-score-container">
                    <div className="quality-score-label">Data Quality Score</div>
                    <div className="quality-score-value">{(processedData.dataQualityScore * 100).toFixed(0)}%</div>
                    <div className="quality-progress-bar">
                      <div
                        className="quality-progress-fill"
                        style={{ width: `${processedData.dataQualityScore * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="quality-message">
                    {processedData.isComplete ? (
                      <div style={{ color: '#059669' }}>
                        ✓ All sensor readings are complete and validated
                      </div>
                    ) : (
                      <div style={{ color: '#d97706' }}>
                        ⚠ Some values were normalized or corrected for accuracy
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Daily Battery Summary */}
          <div className="tele-card" style={{ marginTop: '2rem' }}>
            <div className="tele-card-title">Daily Battery Summary</div>
            {dailySummaries.length > 0 ? (
              <div className="daily-summary-grid">
                {dailySummaries.slice(0, 10).map((summary, idx) => (
                  <div key={idx} className="daily-card">
                    <div className="daily-card-header">
                      <span className="daily-date">📅 {new Date(summary.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="daily-metrics">
                      <div className="daily-metric-row">
                        <span className="daily-metric-label">Avg SoC</span>
                        <span className="daily-metric-value">{summary.avgSoc.toFixed(1)}%</span>
                      </div>
                      <div className="daily-metric-row">
                        <span className="daily-metric-label">Peak Temp</span>
                        <span className="daily-metric-value" style={{ color: getTemperatureColor(summary.maxTemperature) }}>
                          {summary.maxTemperature}°C
                        </span>
                      </div>
                      <div className="daily-metric-row">
                        <span className="daily-metric-label">Avg Voltage</span>
                        <span className="daily-metric-value">{summary.avgVoltage.toFixed(1)}V</span>
                      </div>
                      <div className="daily-metric-row">
                        <span className="daily-metric-label">Charge Current</span>
                        <span className="daily-metric-value">{summary.totalChargeCurrent.toFixed(1)}A</span>
                      </div>
                      <div className="daily-metric-row">
                        <span className="daily-metric-label">Cycle Increment</span>
                        <span className="daily-metric-value">{summary.dailyCycleIncrement.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                <p style={{ fontWeight: 500 }}>No daily summaries available yet</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Daily summaries will appear as battery data is processed over time</p>
              </div>
            )}
          </div>
        </div>
      )}

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
