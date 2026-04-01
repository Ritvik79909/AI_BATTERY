import React, { useState, useEffect } from 'react';
import { FaBolt, FaPlus } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Navbar from '../components/Navbar';
import LogChargingSessionModal from '../components/LogChargingSessionModal';
import { chargingSessionService } from '../services/chargingSessionService';
import { vehicleService } from '../services/vehicleService';
import type { ChargingSession } from '../types/chargingSession';
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
      const recentData = await chargingSessionService.getRecent(selectedVehicleId);
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

                  </div>
                )}


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
