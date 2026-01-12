import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { FaBolt, FaBatteryFull, FaChargingStation, FaExclamationTriangle, FaInfoCircle, FaHourglassHalf, FaTemperatureHigh, FaCar } from 'react-icons/fa';
import { MdOutlineElectricalServices } from 'react-icons/md';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleVehicleSetup = () => {
    navigate('/vehicle-setup');
  };

  // Mock Data
  const batteryHealth = {
    score: 94,
    status: 'Excellent',
    rul: '8 Years, 6 Months',
    soc: 82,
    chargingStatus: 'Connected, Not Charging'
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dash-header">
        <div className="dash-brand">
          <FaBolt size={24} color="#10b981" />
          <span>AI-Based Battery Optimization</span>
        </div>

        <nav className="dash-nav">
          {['Dashboard', 'Battery Health', 'Charging Optimization', 'AI Assistant', 'Stations'].map((item) => (
            <div
              key={item}
              className={`dash-nav-item ${activeTab === item.toLowerCase() ? 'active' : ''}`}
            >
              {item}
            </div>
          ))}
        </nav>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="user-profile" onClick={handleVehicleSetup} title="Manage Vehicle">
            <div className="icon-btn">
              <FaCar size={20} color="#4b5563" />
            </div>
          </div>

          <div className="user-profile" onClick={handleLogout} title="Click to Logout">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
              alt="User"
              className="avatar"
            />
          </div>
        </div>
      </header>

      <div className="dash-grid">
        {/* Top Stats Row */}
        <div className="stats-row">
          {/* RUL Card */}
          <div className="dash-card">
            <div className="card-title">Estimated Remaining Battery Life (RUL)</div>
            <div className="rul-content">
              <div className="hourglass-icon">
                <FaHourglassHalf color="#6b7280" />
              </div>
              <div className="rul-value">{batteryHealth.rul}</div>
              <div className="card-subtitle">Based on current usage and AI prediction</div>
            </div>
          </div>

          {/* Health Score Gauge */}
          <div className="dash-card card-accent-green">
            <div className="card-title">Battery Health Score</div>

            <div className="gauge-container">
              <svg viewBox="0 0 200 120" className="gauge-svg">
                <defs>
                  <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#facc15" />
                  </linearGradient>
                </defs>
                {/* Background Arc */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  className="gauge-bg"
                />
                {/* Value Arc (approx 94%) */}
                <path
                  d="M 20 100 A 80 80 0 0 1 175 90"
                  className="gauge-fill"
                />
              </svg>
              <div className="gauge-center">
                <div style={{ fontSize: '0.9rem', color: '#15803d', fontWeight: 'bold' }}>{batteryHealth.status}</div>
                <div className="gauge-score">{batteryHealth.score}</div>
                <div className="gauge-label">Score</div>
              </div>
            </div>
          </div>

          {/* SoC Card */}
          <div className="dash-card">
            <div className="card-title">Current State of Charge (SoC)</div>

            <div className="soc-container">
              <div className="soc-bar-bg">
                <div className="soc-bar-fill" style={{ width: `${batteryHealth.soc}%` }}>
                  {batteryHealth.soc}%
                </div>
              </div>
            </div>

            <div className="soc-status">
              <FaChargingStation size={18} />
              <span>{batteryHealth.chargingStatus}</span>
            </div>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="bottom-grid">
          {/* Degradation Chart */}
          <div className="dash-card">
            <div className="card-title" style={{ textAlign: 'left' }}>Battery Degradation Trend</div>
            <div className="card-subtitle" style={{ textAlign: 'left' }}>Capacity (%)</div>

            <div className="chart-container">
              <svg className="chart-svg" viewBox="0 0 400 150">
                {/* Grid lines */}
                <line x1="0" y1="130" x2="400" y2="130" stroke="#e5e7eb" strokeWidth="1" />
                <line x1="0" y1="20" x2="400" y2="20" stroke="#e5e7eb" strokeWidth="1" />

                {/* Line Graph */}
                <path
                  d="M0,30 C100,35 200,40 300,50"
                  className="chart-line"
                />

                {/* Prediction Cone */}
                <path
                  d="M300,50 L400,60 L400,90 Z"
                  fill="rgba(75, 85, 99, 0.1)"
                  style={{ strokeDasharray: '4 4', stroke: '#9ca3af', strokeWidth: 1 }}
                />

                {/* Threshold line */}
                <line x1="300" y1="20" x2="300" y2="130" stroke="#d1d5db" strokeDasharray="3 3" />
              </svg>

              <div className="chart-labels">
                <span>Past 12 Months</span>
                <span style={{ marginLeft: 'auto' }}>Next 6 Months</span>
              </div>
            </div>

            <div className="stats-mini-row">
              <div className="mini-stat">
                <FaTemperatureHigh color="#f59e0b" size={20} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Temperature Status</div>
                  <div style={{ fontWeight: 'bold' }}>Optimal: 22°C</div>
                </div>
              </div>
              <div className="mini-stat">
                <MdOutlineElectricalServices color="#10b981" size={24} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Charging Stress Level</div>
                  <div style={{ fontWeight: 'bold' }}>Low</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Recommendations */}
          <div className="dash-card">
            <div className="card-title" style={{ textAlign: 'left', marginBottom: '1rem' }}>Actionable Recommendations</div>
            <div className="rec-list">
              <div className="rec-item">
                <div className="rec-icon">
                  <FaBatteryFull />
                </div>
                <div className="rec-content">
                  <h4>Recommended Charge Limit</h4>
                  <p>Set to 80% for daily use to extend lifespan.</p>
                </div>
              </div>

              <div className="rec-item">
                <div className="rec-icon">
                  <FaHourglassHalf />
                </div>
                <div className="rec-content">
                  <h4>Best Charging Time Window</h4>
                  <p>10:00 PM - 4:00 AM. Off-peak hours.</p>
                </div>
              </div>

              <div className="rec-item">
                <div className="rec-icon">
                  <FaBolt />
                </div>
                <div className="rec-content">
                  <h4>Fast Charging Advisory</h4>
                  <p>Minimize DC Fast Charging for daily needs.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts & Notifications */}
          <div className="dash-card">
            <div className="card-title" style={{ textAlign: 'left', marginBottom: '1rem' }}>Alerts & Notifications</div>
            <div className="notifications-list">
              <div className="notif-item">
                <div className="notif-icon">
                  <FaInfoCircle size={16} />
                </div>
                <div className="notif-content">
                  <h4>System Update</h4>
                  <p>AI Model updated successfully.</p>
                </div>
              </div>

              <div className="notif-item warning">
                <div className="notif-icon">
                  <FaExclamationTriangle size={16} />
                </div>
                <div className="notif-content">
                  <h4>Unusual Drain Detected</h4>
                  <p>Slightly higher overnight drain noticed.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
