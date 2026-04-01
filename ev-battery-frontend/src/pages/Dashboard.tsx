import { useState, useEffect } from 'react';
import { FaBolt, FaBatteryFull, FaChargingStation, FaHourglassHalf, FaTemperatureHigh, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { MdOutlineElectricalServices } from 'react-icons/md';
import Navbar from '../components/Navbar';
import { vehicleService } from '../services/vehicleService';
import { batteryHealthService } from '../services/batteryHealthService';
import { telemetryService } from '../services/telemetryService';
import type { Vehicle } from '../types/vehicle';
import './Dashboard.css';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Real Data State
  const [batteryHealth, setBatteryHealth] = useState({
    score: 0,
    status: 'Unknown',
    rul: 'Loading...',
    soc: 0,
    chargingStatus: 'Unknown',
    temperature: 0,
  });

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const vList = await vehicleService.getVehicles();
        if (vList && vList.length > 0) {
          setVehicles(vList);
        }
      } catch (err) {
        console.error("Failed to load vehicles", err);
      } finally {
        setLoading(false);
      }
    };
    loadVehicles();
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (vehicles.length === 0) return;
      const vId = vehicles[currentIndex].id;

      try {
        const [scoreData, rulData, latestTele] = await Promise.all([
          batteryHealthService.getHealthScore(vId),
          batteryHealthService.getRemainingUsefulLife(vId),
          telemetryService.fetchLatestTelemetry(vId)
        ]);

        setBatteryHealth(prev => {
          const newData = { ...prev };
          if (scoreData) {
            newData.score = scoreData.healthScore;
            newData.status = scoreData.label || 'Good';
          } else {
            newData.score = 0;
            newData.status = 'No Data';
          }

          if (rulData) {
            if (rulData.estimatedMonths) {
              const y = Math.floor(rulData.estimatedMonths / 12);
              const m = rulData.estimatedMonths % 12;
              newData.rul = `${y} Years, ${m} Months`;
            } else {
              newData.rul = `${Math.floor(rulData.rulCycles / 365)} Years, ${rulData.rulCycles % 365} Days`;
            }
          } else {
            newData.rul = 'No Data';
          }

          if (latestTele) {
            newData.soc = latestTele.soc || 0;
            newData.chargingStatus = latestTele.chargingState || 'Unknown';
            newData.temperature = latestTele.temperature || 0;
          } else {
            newData.soc = 0;
            newData.chargingStatus = 'No Data';
            newData.temperature = 0;
          }

          return newData;
        });

      } catch (err) {
        console.error("Failed to load dashboard data", err);
      }
    };

    loadDashboardData();
  }, [vehicles, currentIndex]);

  const handlePrev = () => {
    setCurrentIndex(prev => prev > 0 ? prev - 1 : vehicles.length - 1);
  };

  const handleNext = () => {
    setCurrentIndex(prev => prev < vehicles.length - 1 ? prev + 1 : 0);
  };

  const renderCardHeader = (title: string, centerTitle: boolean = false) => {
    return (
      <div style={{ display: 'flex', flexDirection: centerTitle ? 'column' : 'row', justifyContent: centerTitle ? 'center' : 'space-between', alignItems: centerTitle ? 'center' : 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
        <div className="card-title" style={{ margin: 0, textAlign: centerTitle ? 'center' : 'left' }}>{title}</div>
        {vehicles.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.7)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(0,0,0,0.05)' }}>
            <button onClick={handlePrev} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', color: '#374151' }}><FaChevronLeft size={10} /></button>
            <span style={{ color: '#374151' }}>{vehicles[currentIndex].nickname || vehicles[currentIndex].make}</span>
            <button onClick={handleNext} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', color: '#374151' }}><FaChevronRight size={10} /></button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          Loading your data...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="dash-grid">
        {/* Top Stats Row */}
        <div className="stats-row">
          {/* RUL Card */}
          <div className="dash-card">
            {renderCardHeader('Estimated Remaining Battery Life (RUL)', true)}
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
            {renderCardHeader('Battery Health Score', true)}

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
                {/* Value Arc (approx mapped from score 0-100 to angle 0-180) */}
                {batteryHealth.score > 0 && (
                  <path
                    d={`M 20 100 A 80 80 0 0 1 ${20 + 160 * (batteryHealth.score / 100)} ${100 - 80 * Math.sin(Math.PI * (batteryHealth.score / 100))}`}
                    className="gauge-fill"
                  />
                )}
              </svg>
              <div className="gauge-center">
                <div style={{ fontSize: '0.9rem', color: '#15803d', fontWeight: 'bold' }}>{batteryHealth.status}</div>
                <div className="gauge-score">{Math.round(batteryHealth.score)}</div>
                <div className="gauge-label">Score</div>
              </div>
            </div>
          </div>

          {/* SoC Card */}
          <div className="dash-card">
            {renderCardHeader('Current State of Charge (SoC)', true)}

            <div className="soc-container">
              <div className="soc-bar-bg">
                <div className="soc-bar-fill" style={{ width: `${Math.max(10, batteryHealth.soc)}%` }}>
                  {Math.round(batteryHealth.soc)}%
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
            {renderCardHeader('Battery Degradation Trend')}
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

              {/* <div className="chart-labels">
                <span>Past 12 Months</span>
                <span style={{ marginLeft: 'auto' }}>Next 6 Months</span>
              </div> */}
            </div>

            <div className="stats-mini-row">
              <div className="mini-stat">
                <FaTemperatureHigh color="#f59e0b" size={20} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Temperature Status</div>
                  <div style={{ fontWeight: 'bold' }}>{batteryHealth.temperature ? `${Math.round(batteryHealth.temperature)}°C` : 'No Data'}</div>
                </div>
              </div>
              <div className="mini-stat">
                <MdOutlineElectricalServices color="#10b981" size={24} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Charging Stress Level</div>
                  <div style={{ fontWeight: 'bold' }}>{batteryHealth.score >= 80 ? 'Low' : batteryHealth.score >= 60 ? 'Moderate' : 'High'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Recommendations */}
          <div className="dash-card">
            {renderCardHeader('Actionable Recommendations')}
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
