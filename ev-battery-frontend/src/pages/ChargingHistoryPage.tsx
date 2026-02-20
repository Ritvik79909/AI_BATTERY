import React, { useState, useEffect } from 'react';
import { FaBolt, FaClock, FaPlus, FaChartBar } from 'react-icons/fa';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Navbar from '../components/Navbar';
import LogChargingSessionModal from '../components/LogChargingSessionModal';
import { chargingSessionService } from '../services/chargingSessionService';
import { vehicleService } from '../services/vehicleService';
import type { ChargingSession, ChargingSessionSummary } from '../types/chargingSession';
import type { Vehicle } from '../types/vehicle';
import './ChargingHistoryPage.css';

const ChargingHistoryPage: React.FC = () => {
  const [activeTab] = useState('charging history');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vehicle state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);

  // Charging session state
  const [recentSessions, setRecentSessions] = useState<ChargingSession[]>([]);
  const [summary, setSummary] = useState<ChargingSessionSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch vehicles on mount
  useEffect(() => {
    fetchVehicles();
  }, []);

  // Fetch charging data when selectedVehicleId changes
  useEffect(() => {
    if (selectedVehicleId) {
      fetchChargingData();
    }
  }, [selectedVehicleId]);

  const fetchVehicles = async () => {
    setVehiclesLoading(true);
    try {
      const data = await vehicleService.getVehicles();
      setVehicles(data);

      // Auto-select first vehicle if available
      if (data.length > 0) {
        setSelectedVehicleId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Failed to load vehicles. Please try again.');
    } finally {
      setVehiclesLoading(false);
    }
  };

  const fetchChargingData = async () => {
    if (!selectedVehicleId) return;

    setLoading(true);
    setError(null);

    try {
      const [summaryData, recentData] = await Promise.all([
        chargingSessionService.getSummary(selectedVehicleId),
        chargingSessionService.getRecent(selectedVehicleId)
      ]);

      setSummary(summaryData);
      setRecentSessions(recentData);
    } catch (err) {
      console.error('Error fetching charging data:', err);
      setError('Failed to load charging data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSessionLogged = () => {
    fetchChargingData(); // Refresh data after logging a session
  };

  // Format duration in minutes to "Xh Ym"
  const formatDuration = (minutes?: number): string => {
    if (!minutes || minutes === 0) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get badge class based on charging type
  const getChargingTypeBadge = (type: string): string => {
    switch (type) {
      case 'DC_FAST':
        return 'badge-dc-fast';
      case 'AC_FAST':
        return 'badge-ac-fast';
      case 'SLOW':
      default:
        return 'badge-slow';
    }
  };

  // Get display name for charging type
  const getChargingTypeLabel = (type: string): string => {
    switch (type) {
      case 'DC_FAST':
        return 'DC Fast';
      case 'AC_FAST':
        return 'AC Fast';
      case 'SLOW':
      default:
        return 'Slow';
    }
  };

  // Process sessions for charts
  const getSessionsPerDay = () => {
    if (!recentSessions || recentSessions.length === 0) return [];

    const sessionsByDate: Record<string, number> = {};

    recentSessions.forEach(session => {
      const date = new Date(session.startTime).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      sessionsByDate[date] = (sessionsByDate[date] || 0) + 1;
    });

    return Object.entries(sessionsByDate).map(([date, count]) => ({
      date,
      sessions: count
    }));
  };

  const getDurationTrends = () => {
    if (!recentSessions || recentSessions.length === 0) return [];

    // Group by date and calculate average duration
    const durationByDate: Record<string, { total: number; count: number }> = {};

    recentSessions.forEach(session => {
      const date = new Date(session.startTime).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

      if (!durationByDate[date]) {
        durationByDate[date] = { total: 0, count: 0 };
      }

      durationByDate[date].total += session.durationMinutes || 0;
      durationByDate[date].count += 1;
    });

    return Object.entries(durationByDate).map(([date, { total, count }]) => ({
      date,
      duration: Math.round(total / count)
    }));
  };

  return (
    <div className="charging-history-container">
      <Navbar activeTab={activeTab} />

      <div className="charging-content">
        {/* Vehicle Selector */}
        {vehiclesLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading vehicles...</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="no-data-state">
            <FaBolt size={64} color="#9ca3af" />
            <h2>Please add a vehicle to view charging history.</h2>
            <p>Go to Vehicle Setup to add your first vehicle</p>
          </div>
        ) : (
          <>
            {/* Vehicle Selector and Log Button */}
            <div className="header-section">
              <div className="vehicle-selector">
                <label htmlFor="vehicle-select">Select Vehicle:</label>
                <select
                  id="vehicle-select"
                  name="vehicleId"
                  value={selectedVehicleId || ''}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="vehicle-dropdown"
                >
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.nickname} ({vehicle.make} {vehicle.model})
                    </option>
                  ))}
                </select>
              </div>

              <button className="log-session-btn" onClick={() => setIsModalOpen(true)}>
                <FaPlus size={16} />
                <span>Log New Session</span>
              </button>
            </div>

            {/* Charging Data Content */}
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading charging data...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <p>{error}</p>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                {summary && (
                  <div className="summary-grid">
                    <div className="summary-card">
                      <div className="summary-icon">
                        <FaBolt size={28} color="#10b981" />
                      </div>
                      <div className="summary-info">
                        <div className="summary-value">{summary.totalSessions}</div>
                        <div className="summary-label">Total Sessions</div>
                      </div>
                    </div>

                    <div className="summary-card">
                      <div className="summary-icon">
                        <FaClock size={28} color="#3b82f6" />
                      </div>
                      <div className="summary-info">
                        <div className="summary-value">{formatDuration(summary.averageDuration)}</div>
                        <div className="summary-label">Avg Duration</div>
                      </div>
                    </div>

                    <div className="summary-card">
                      <div className="summary-icon">
                        <FaChartBar size={28} color="#facc15" />
                      </div>
                      <div className="summary-info">
                        <div className="summary-value">{Math.round(summary.fastChargingPercentage)}%</div>
                        <div className="summary-label">Fast Charging</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Charts Section */}
                {recentSessions.length > 0 && (
                  <div className="charts-section">
                    <div className="chart-card">
                      <h3>Sessions per Day</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={getSessionsPerDay()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                          <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                          <YAxis stroke="#6b7280" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid rgba(0,0,0,0.1)',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="sessions" fill="#10b981" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="chart-card">
                      <h3>Duration Trends</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={getDurationTrends()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                          <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                          <YAxis stroke="#6b7280" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid rgba(0,0,0,0.1)',
                              borderRadius: '8px'
                            }}
                            formatter={(value: number | undefined) => [value !== undefined ? formatDuration(value) : 'N/A', 'Duration']}
                          />
                          <Line
                            type="monotone"
                            dataKey="duration"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={{ fill: '#3b82f6', r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Session List */}
                <div className="sessions-section">
                  <h2 className="section-title">Recent Charging Sessions</h2>

                  {recentSessions.length === 0 ? (
                    <div className="no-sessions">
                      <FaBolt size={48} color="#9ca3af" />
                      <p>No charging sessions logged yet.</p>
                      <p className="hint">Click "Log New Session" to add your first charging session.</p>
                    </div>
                  ) : (
                    <div className="sessions-grid">
                      {recentSessions.map((session) => (
                        <div key={session.id} className="session-card">
                          <div className="session-header">
                            <div className="session-date">{formatTimestamp(session.startTime)}</div>
                            <span className={`charging-badge ${getChargingTypeBadge(session.chargingType)}`}>
                              {getChargingTypeLabel(session.chargingType)}
                            </span>
                          </div>

                          <div className="session-soc">
                            <div className="soc-progress">
                              <div className="soc-bar">
                                <div
                                  className="soc-fill"
                                  style={{ width: `${session.endSoc}%` }}
                                />
                              </div>
                              <div className="soc-labels">
                                <span>{Math.round(session.startSoc)}%</span>
                                <span>→</span>
                                <span>{Math.round(session.endSoc)}%</span>
                              </div>
                            </div>
                          </div>

                          <div className="session-details">
                            <div className="detail-item">
                              <FaClock size={14} color="#6b7280" />
                              <span>{formatDuration(session.durationMinutes)}</span>
                            </div>
                            {session.energyAddedKwh && (
                              <div className="detail-item">
                                <FaBolt size={14} color="#6b7280" />
                                <span>{Math.round(session.energyAddedKwh)}kWh</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Log Charging Session Modal */}
      <LogChargingSessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSessionLogged={handleSessionLogged}
        vehicles={vehicles}
      />
    </div>
  );
};

export default ChargingHistoryPage;
