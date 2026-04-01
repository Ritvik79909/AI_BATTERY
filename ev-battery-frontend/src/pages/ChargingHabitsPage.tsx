import React, { useState, useEffect } from 'react';
import { FaBolt, FaChargingStation } from 'react-icons/fa';
import { MdSpeed, MdBattery60 } from 'react-icons/md';
import Navbar from '../components/Navbar';
import { vehicleService } from '../services/vehicleService';
import api from '../services/api';
import type { Vehicle } from '../types/vehicle';
import type { ChargingHabitsData } from '../types/telemetry';
import './ChargingHabitsPage.css';

/* ─── InsightCard Sub-component ──────────────────────────────── */

interface InsightCardProps {
  title: string;
  value: string;
  sub?: string;
  status: 'good' | 'warning' | 'critical';
  icon: React.ReactNode;
}

const InsightCard: React.FC<InsightCardProps> = ({ title, value, sub, status, icon }) => (
  <div className={`insight-card insight-card--${status}`}>
    <div className="insight-card-icon">{icon}</div>
    <div className="insight-card-title">{title}</div>
    <div className="insight-card-value">{value}</div>
    {sub && <div className="insight-card-sub">{sub}</div>}
    <div className={`insight-card-badge insight-badge--${status}`}>
      {status === 'good' ? '✅ Good' : status === 'warning' ? '⚠️ Monitor' : '🚨 High Risk'}
    </div>
  </div>
);

/* ─── Main Page ───────────────────────────────────────────────── */

const ChargingHabitsPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [habitData, setHabitData] = useState<ChargingHabitsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animated score value
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (selectedVehicleId) fetchHabitData(selectedVehicleId);
  }, [selectedVehicleId]);

  useEffect(() => {
    const target = habitData?.habitScore ?? 0;
    if (!target) { setAnimatedScore(0); return; }
    let current = 0;
    const step = target / (1000 / 16);
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setAnimatedScore(target); clearInterval(timer); }
      else setAnimatedScore(Math.floor(current));
    }, 16);
    return () => clearInterval(timer);
  }, [habitData]);

  const fetchVehicles = async () => {
    setVehiclesLoading(true);
    try {
      const data = await vehicleService.getVehicles();
      setVehicles(data);
      if (data.length > 0) setSelectedVehicleId(data[0].id);
    } catch {
      setError('Failed to load vehicles.');
    } finally {
      setVehiclesLoading(false);
    }
  };

  const fetchHabitData = async (vehicleId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ChargingHabitsData>(`/charging-habits/${vehicleId}`);
      setHabitData(res.data);
    } catch {
      setError('Failed to load charging habit data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* Helpers */
  const getScoreColor = (score: number) => {
    if (score >= 75) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getRiskClass = (risk: string) => {
    if (risk === 'Low') return 'risk-low';
    if (risk === 'Moderate') return 'risk-moderate';
    return 'risk-high';
  };

  const scoreColor = getScoreColor(habitData?.habitScore ?? 0);
  const circumference = 2 * Math.PI * 80;
  const dashOffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="charging-habits-container">
      <Navbar activeTab="charging habits" />

      <div className="habits-content">
        {/* Vehicle Selector */}
        {vehiclesLoading ? (
          <div className="loading-state"><div className="spinner" /><p>Loading vehicles...</p></div>
        ) : vehicles.length === 0 ? (
          <div className="no-data-state">
            <FaChargingStation size={64} color="#9ca3af" />
            <h2>No vehicles found.</h2>
            <p>Add a vehicle first to see charging habit analysis.</p>
          </div>
        ) : (
          <>
            <div className="vehicle-selector-bar">
              <label htmlFor="habits-vehicle-select">Select Vehicle:</label>
              <select
                id="habits-vehicle-select"
                name="vehicleId"
                value={selectedVehicleId || ''}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="vehicle-dropdown"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nickname} ({v.make} {v.model})
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="loading-state"><div className="spinner" /><p>Analyzing charging habits...</p></div>
            ) : error ? (
              <div className="error-state">
                <FaChargingStation size={48} color="#ef4444" />
                <p>{error}</p>
              </div>
            ) : !habitData ? (
              <div className="no-data-state">
                <FaChargingStation size={64} color="#9ca3af" />
                <h2>No charging habit data yet.</h2>
                <p>Log some charging sessions to see AI-powered habit analysis.</p>
              </div>
            ) : (
              <div className="habits-layout">

                {/* ━━━ 1. HERO SCORE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <div className="hero-card">
                  {/* blobs */}
                  <div className="hero-blob hero-blob-a" />
                  <div className="hero-blob hero-blob-b" />
                  <div className="hero-overlay" />

                  <div className="hero-inner">
                    {/* Left: gauge */}
                    <div className="hero-gauge-col">
                      <div className="hero-gauge-wrap">
                        <svg width="200" height="200" viewBox="0 0 200 200" className="habit-gauge-svg">
                          <circle cx="100" cy="100" r="80" fill="none"
                            stroke="rgba(255,255,255,0.15)" strokeWidth="14" />
                          <circle cx="100" cy="100" r="80" fill="none"
                            stroke={scoreColor}
                            strokeWidth="14"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={dashOffset}
                            transform="rotate(-90 100 100)"
                            style={{ transition: 'stroke-dashoffset 1s ease', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.5))' }}
                          />
                        </svg>
                        <div className="hero-gauge-center">
                          <div className="hero-score-num">{animatedScore}</div>
                          <div className="hero-score-label">/ 100</div>
                        </div>
                      </div>
                      <div className={`risk-badge ${getRiskClass(habitData.riskLevel)}`}>
                        {habitData.riskLevel} Risk
                      </div>
                    </div>

                    {/* Right: title + 2 stats */}
                    <div className="hero-text-col">
                      <h1 className="hero-title">
                        <FaChargingStation className="hero-title-icon" />
                        Charging Habits
                      </h1>
                      {/* <p className="hero-subtitle">AI-powered analysis of your charging patterns</p> */}

                      <div className="hero-stats">
                        <div className="hero-stat">
                          <div className="hero-stat-num">
                            {habitData.fastChargingPercentage?.toFixed(0)}%
                          </div>
                          <div className="hero-stat-label">Fast Charging</div>
                        </div>
                        <div className="hero-stat-divider" />
                        <div className="hero-stat">
                          <div className="hero-stat-num">
                            {habitData.chargingFrequencyPerWeek?.toFixed(1)}×
                          </div>
                          <div className="hero-stat-label">Per Week</div>
                        </div>
                        <div className="hero-stat-divider" />
                        <div className="hero-stat">
                          <div className="hero-stat-num">
                            {habitData.averageChargeDepth?.toFixed(0)}%
                          </div>
                          <div className="hero-stat-label">Avg Depth</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ━━━ 2. INSIGHT CARDS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <div className="insight-cards-grid">
                  <InsightCard
                    title="Charging Frequency"
                    value={`${habitData.chargingFrequencyPerWeek?.toFixed(1)} / week`}
                    sub="Optimal: 4–6 sessions"
                    status={habitData.chargingFrequencyPerWeek > 7 ? 'warning' : 'good'}
                    icon={<MdSpeed size={24} />}
                  />
                  <InsightCard
                    title="Fast Charging Usage"
                    value={`${habitData.fastChargingPercentage?.toFixed(0)}%`}
                    sub="Recommended: < 30%"
                    status={habitData.fastChargingPercentage > 50
                      ? 'critical'
                      : habitData.fastChargingPercentage > 30
                        ? 'warning'
                        : 'good'
                    }
                    icon={<FaBolt size={24} />}
                  />
                  <InsightCard
                    title="Average Charge Depth"
                    value={`${habitData.averageChargeDepth?.toFixed(0)}%`}
                    sub="Recommended: 20–80%"
                    status={habitData.averageChargeDepth > 85 ? 'warning' : 'good'}
                    icon={<MdBattery60 size={24} />}
                  />
                </div>

                {/* ━━━ 3. PERSONALIZED RECOMMENDATION ━━━━━━━━━━━━━━━━━━━ */}
                <div className="recommendation-card">
                  <div className="recommendation-icon">📋</div>
                  <div>
                    <h3 className="recommendation-title">Personalized Recommendation</h3>
                    <p className="recommendation-body">{habitData.recommendation}</p>
                  </div>
                </div>



              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChargingHabitsPage;
