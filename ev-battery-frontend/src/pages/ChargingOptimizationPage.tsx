import React, { useState, useEffect } from 'react';
import { FaBolt, FaChargingStation, FaLeaf, FaExclamationTriangle } from 'react-icons/fa';
import { MdTipsAndUpdates } from 'react-icons/md';
import Navbar from '../components/Navbar';
import { vehicleService } from '../services/vehicleService';
import api from '../services/api';
import type { Vehicle } from '../types/vehicle';
import './ChargingOptimizationPage.css';

/* ─── Types ─────────────────────────────────────────────────────── */

interface ChargingOptimizationData {
  recommendedChargeLimit: number;
  recommendedChargingTime: string;
  fastChargingRecommendation: string;
  optimizationPriority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedLifespanExtension: number;
  explanation?: string[];
}

/* ─── HabitItem Sub-component ────────────────────────────────────── */

interface HabitItemProps {
  label: string;
  value: string;
  status: 'warning' | 'success';
}

const HabitItem: React.FC<HabitItemProps> = ({ label, value, status }) => (
  <div
    className={`habit-item ${status === 'warning' ? 'habit-item--warning' : 'habit-item--success'
      }`}
  >
    <span className="habit-item-label">{label}</span>
    <span
      className={`habit-item-value ${status === 'warning' ? 'habit-value--warning' : 'habit-value--success'
        }`}
    >
      {value}
    </span>
  </div>
);

/* ─── Main Page ──────────────────────────────────────────────────── */

const ChargingOptimizationPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [optData, setOptData] = useState<ChargingOptimizationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (selectedVehicleId) fetchOptData(selectedVehicleId);
  }, [selectedVehicleId]);

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

  const fetchOptData = async (vehicleId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ChargingOptimizationData>(
        `/charging-optimization/${vehicleId}`
      );
      setOptData(res.data);
    } catch {
      setError('Failed to load charging optimization data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isHighPriority = optData?.optimizationPriority === 'HIGH';

  return (
    <div className="co-container">
      <Navbar activeTab="charging optimization" />

      <div className="co-content">
        {/* ─── Page Header ───────────────────────────────────────── */}
        <div className="co-page-header">
          <div className="co-header-icon">
            <FaBolt size={28} />
          </div>
          <div>
            <h1 className="co-page-title">Charging Optimization</h1>
            <p className="co-page-subtitle">
              AI-powered recommendations to extend your battery lifespan
            </p>
          </div>
        </div>

        {/* ─── Vehicle Selector ──────────────────────────────────── */}
        {vehiclesLoading ? (
          <div className="co-loading-state">
            <div className="co-spinner" />
            <p>Loading vehicles…</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="co-no-data-state">
            <FaChargingStation size={64} color="#9ca3af" />
            <h2>No vehicles found.</h2>
            <p>Add a vehicle first to see optimization recommendations.</p>
          </div>
        ) : (
          <>
            <div className="vehicle-selector-bar">
              <label htmlFor="opt-vehicle-select">Select Vehicle:</label>
              <select
                id="opt-vehicle-select"
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
              <div className="co-loading-state">
                <div className="co-spinner" />
                <p>Computing optimization recommendations…</p>
              </div>
            ) : error ? (
              <div className="co-error-state">
                <FaExclamationTriangle size={48} color="#ef4444" />
                <p>{error}</p>
              </div>
            ) : !optData ? (
              <div className="co-no-data-state">
                <FaChargingStation size={64} color="#9ca3af" />
                <h2>No optimization data yet.</h2>
                <p>Log some charging sessions to unlock AI optimization.</p>
              </div>
            ) : (
              <div className="co-layout">

                {/* ━━━ 1. HERO COMPARISON ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <div className="comparison-hero">

                  {/* Current Habits */}
                  <div className="comparison-panel comparison-panel--current">
                    <div className="comparison-panel-glow comparison-panel-glow--current" />
                    <div className="comparison-panel-inner">
                      <h2 className="comparison-panel-title">
                        ⚠️ Current Habits
                      </h2>
                      <div className="habit-items-stack">
                        <HabitItem label="Charge Limit" value="100%" status="warning" />
                        <HabitItem label="Fast Charging" value="Frequent" status="warning" />
                        <HabitItem label="Time of Day" value="Afternoon" status="warning" />
                      </div>
                    </div>
                  </div>

                  {/* VS divider */}
                  <div className="comparison-vs">
                    <span>VS</span>
                  </div>

                  {/* Recommended */}
                  <div className="comparison-panel comparison-panel--recommended">
                    <div className="comparison-panel-glow comparison-panel-glow--recommended" />
                    <div className="comparison-panel-inner">
                      <h2 className="comparison-panel-title">
                        ✅ Recommended
                      </h2>
                      <div className="habit-items-stack">
                        <HabitItem
                          label="Charge Limit"
                          value={`${optData.recommendedChargeLimit}%`}
                          status="success"
                        />
                        <HabitItem
                          label="Fast Charging"
                          value={optData.fastChargingRecommendation}
                          status="success"
                        />
                        <HabitItem
                          label="Best Time"
                          value={optData.recommendedChargingTime}
                          status="success"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ━━━ 2. PRIORITY & IMPACT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <div className={`priority-impact-card ${isHighPriority ? 'priority-impact-card--high' : 'priority-impact-card--medium'}`}>
                  {/* Left: priority badge + lifespan */}
                  <div className="priority-left">
                    <div className={`priority-badge ${isHighPriority ? 'priority-badge--high' : 'priority-badge--medium'}`}>
                      {isHighPriority ? (
                        <>
                          <FaExclamationTriangle size={22} />
                          <span>HIGH PRIORITY</span>
                        </>
                      ) : (
                        <>
                          <MdTipsAndUpdates size={24} />
                          <span>{optData.optimizationPriority} PRIORITY</span>
                        </>
                      )}
                    </div>
                    <div className="lifespan-extension">
                      <div className="lifespan-label">Estimated Lifespan Extension</div>
                      <div className="lifespan-value">
                        <FaLeaf className="lifespan-icon" />
                        +{optData.estimatedLifespanExtension?.toFixed(1)}
                        <span className="lifespan-unit"> months</span>
                      </div>
                    </div>
                  </div>

                  {/* Vertical divider */}
                  <div className="priority-divider" />

                  {/* Right: explanation */}
                  <div className="priority-right">
                    <h4 className="explanation-title">
                      <span className="explanation-icon">💡</span>
                      Why these recommendations?
                    </h4>
                    {optData.explanation && optData.explanation.length > 0 ? (
                      <ul className="explanation-list">
                        {optData.explanation.map((exp, i) => (
                          <li key={i} className="explanation-item">
                            <span className="explanation-bullet" />
                            {exp}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="explanation-empty">
                        Applying AI analysis to your usage patterns…
                      </p>
                    )}
                  </div>
                </div>

                {/* ━━━ 3. QUICK TIPS FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <div className="co-tips-row">
                  <div className="co-tip-card">
                    <div className="co-tip-icon co-tip-icon--blue">🔋</div>
                    <div className="co-tip-text">
                      <div className="co-tip-title">Charge to 80%</div>
                      <div className="co-tip-sub">Reduces stress on cells</div>
                    </div>
                  </div>
                  <div className="co-tip-card">
                    <div className="co-tip-icon co-tip-icon--purple">🌙</div>
                    <div className="co-tip-text">
                      <div className="co-tip-title">Charge at Night</div>
                      <div className="co-tip-sub">Cooler temperature, better efficiency</div>
                    </div>
                  </div>
                  <div className="co-tip-card">
                    <div className="co-tip-icon co-tip-icon--orange">⚡</div>
                    <div className="co-tip-text">
                      <div className="co-tip-title">Limit Fast Charging</div>
                      <div className="co-tip-sub">Reserve for emergencies</div>
                    </div>
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

export default ChargingOptimizationPage;
