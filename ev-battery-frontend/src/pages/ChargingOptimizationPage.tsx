import React, { useState, useEffect } from 'react';
import { FaBolt, FaClock, FaPlus, FaChartBar, FaChargingStation, FaStar, FaLeaf, FaExclamationTriangle } from 'react-icons/fa';
import { MdSpeed, MdBattery60, MdTipsAndUpdates } from 'react-icons/md';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Navbar from '../components/Navbar';
import LogChargingSessionModal from '../components/LogChargingSessionModal';
import { chargingSessionService } from '../services/chargingSessionService';
import { vehicleService } from '../services/vehicleService';
import api from '../services/api';
import type { ChargingSession, ChargingSessionSummary } from '../types/chargingSession';
import type { Vehicle } from '../types/vehicle';
import type { ChargingHabitsData } from '../types/telemetry';

import './ChargingHistoryPage.css';
import './ChargingHabitsPage.css';
import './ChargingOptimizationPage.css';

/* ─── Types & Sub-components ────────────────────────────────────── */

interface ChargingOptimizationData {
  recommendedChargeLimit: number;
  recommendedChargingTime: string;
  fastChargingRecommendation: string;
  optimizationPriority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedLifespanExtension: number;
  explanation?: string[];
}

interface HabitItemProps {
  label: string;
  value: string;
  status: 'warning' | 'success';
}
const HabitItem: React.FC<HabitItemProps> = ({ label, value, status }) => (
  <div className={`habit-item ${status === 'warning' ? 'habit-item--warning' : 'habit-item--success'}`}>
    <span className="habit-item-label">{label}</span>
    <span className={`habit-item-value ${status === 'warning' ? 'habit-value--warning' : 'habit-value--success'}`}>
      {value}
    </span>
  </div>
);

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

/* ─── Main Page ──────────────────────────────────────────────────── */

const ChargingOptimizationPage: React.FC = () => {
  // Shared State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // History State
  const [recentSessions, setRecentSessions] = useState<ChargingSession[]>([]);
  const [summary, setSummary] = useState<ChargingSessionSummary | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Habits State
  const [habitData, setHabitData] = useState<ChargingHabitsData | null>(null);
  const [isHabitsLoading, setIsHabitsLoading] = useState(false);
  const [habitsError, setHabitsError] = useState<string | null>(null);
  const [animatedScore, setAnimatedScore] = useState(0);

  // Optimization State
  const [optData, setOptData] = useState<ChargingOptimizationData | null>(null);
  const [isOptLoading, setIsOptLoading] = useState(false);
  const [optError, setOptError] = useState<string | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (selectedVehicleId) {
      fetchChargingData(selectedVehicleId);
      fetchHabitData(selectedVehicleId);
      fetchOptData(selectedVehicleId);
    }
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
      setGlobalError('Failed to load vehicles.');
    } finally {
      setVehiclesLoading(false);
    }
  };

  const fetchChargingData = async (vehicleId: string) => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const [summaryData, recentData] = await Promise.all([
        chargingSessionService.getSummary(vehicleId),
        chargingSessionService.getRecent(vehicleId)
      ]);
      setSummary(summaryData);
      setRecentSessions(recentData);
    } catch (err) {
      setHistoryError('Failed to load charging data.');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const fetchHabitData = async (vehicleId: string) => {
    setIsHabitsLoading(true);
    setHabitsError(null);
    try {
      const res = await api.get<ChargingHabitsData>(`/charging-habits/${vehicleId}`);
      setHabitData(res.data);
    } catch {
      setHabitsError('Failed to load charging habit data.');
    } finally {
      setIsHabitsLoading(false);
    }
  };

  const fetchOptData = async (vehicleId: string) => {
    setIsOptLoading(true);
    setOptError(null);
    try {
      const res = await api.get<ChargingOptimizationData>(`/charging-optimization/${vehicleId}`);
      setOptData(res.data);
    } catch {
      setOptError('Failed to load charging optimization data.');
    } finally {
      setIsOptLoading(false);
    }
  };

  const handleSessionLogged = () => {
    if (selectedVehicleId) {
      fetchChargingData(selectedVehicleId);
      fetchHabitData(selectedVehicleId);
      fetchOptData(selectedVehicleId);
    }
  };

  /* ─── Helpers: History ────────────────────────────────────────── */
  const formatDuration = (minutes?: number): string => {
    if (!minutes || minutes === 0) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getChargingTypeBadge = (type: string): string => {
    switch (type) {
      case 'DC_FAST': return 'badge-dc-fast';
      case 'AC_FAST': return 'badge-ac-fast';
      case 'SLOW': default: return 'badge-slow';
    }
  };

  const getChargingTypeLabel = (type: string): string => {
    switch (type) {
      case 'DC_FAST': return 'DC Fast';
      case 'AC_FAST': return 'AC Fast';
      case 'SLOW': default: return 'Slow';
    }
  };

  const getSessionsPerDay = () => {
    if (!recentSessions || recentSessions.length === 0) return [];
    const sessionsByDate: Record<string, number> = {};
    recentSessions.forEach(session => {
      const date = new Date(session.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      sessionsByDate[date] = (sessionsByDate[date] || 0) + 1;
    });
    return Object.entries(sessionsByDate).map(([date, count]) => ({ date, sessions: count }));
  };

  const getDurationTrends = () => {
    if (!recentSessions || recentSessions.length === 0) return [];
    const durationByDate: Record<string, { total: number; count: number }> = {};
    recentSessions.forEach(session => {
      const date = new Date(session.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!durationByDate[date]) durationByDate[date] = { total: 0, count: 0 };
      durationByDate[date].total += session.durationMinutes || 0;
      durationByDate[date].count += 1;
    });
    return Object.entries(durationByDate).map(([date, { total, count }]) => ({
      date, duration: Math.round(total / count)
    }));
  };

  /* ─── Helpers: Habits ─────────────────────────────────────────── */
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

  /* ─── Helpers: Optimization ───────────────────────────────────── */
  const isHighPriority = optData?.optimizationPriority === 'HIGH';

  return (
    <div className="co-container" style={{ paddingBottom: '4rem' }}>
      <Navbar activeTab="charging optimization" />

      {/* Global Header */}
      <div className="co-content" style={{ marginTop: '2rem' }}>

        {/* Global Vehicle Selector */}
        {vehiclesLoading ? (
          <div className="co-loading-state"><div className="co-spinner" /><p>Loading vehicles...</p></div>
        ) : globalError ? (
          <div className="co-error-state"><p>{globalError}</p></div>
        ) : vehicles.length === 0 ? (
          <div className="co-no-data-state">
            <FaChargingStation size={64} color="#9ca3af" />
            <h2>No vehicles found.</h2>
            <p>Add a vehicle first.</p>
          </div>
        ) : (
          <>
            <div className="vehicle-selector-bar" style={{ marginBottom: '2rem' }}>
              <label htmlFor="global-vehicle-select">Select Vehicle:</label>
              <select
                id="global-vehicle-select"
                value={selectedVehicleId || ''}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="vehicle-dropdown"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.nickname} ({v.make} {v.model})</option>
                ))}
              </select>
              <button className="log-session-btn" onClick={() => setIsModalOpen(true)} style={{ marginLeft: 'auto' }}>
                <FaPlus size={16} /><span>Log New Session</span>
              </button>
            </div>

            {/* ==========================================
                1. CHARGING HISTORY COMPONENTS 
                ========================================== */}
            {/* <div className="section-divider" style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>Charging History</h2>
            </div> */}

            {isHistoryLoading ? (
              <div className="loading-state"><div className="spinner"></div><p>Loading charging data...</p></div>
            ) : historyError ? (
              <div className="error-state"><p>{historyError}</p></div>
            ) : (
              <>
                {summary && (
                  <div className="summary-grid">
                    {/* <div className="summary-card">
                      <div className="summary-icon"><FaBolt size={28} color="#10b981" /></div>
                      <div className="summary-info">
                        <div className="summary-value">{summary.totalSessions}</div>
                        <div className="summary-label">Total Sessions</div>
                      </div>
                    </div> */}
                    {/* <div className="summary-card">
                      <div className="summary-icon"><FaClock size={28} color="#3b82f6" /></div>
                      <div className="summary-info">
                        <div className="summary-value">{formatDuration(summary.averageDuration)}</div>
                        <div className="summary-label">Avg Duration</div>
                      </div>
                    </div> */}
                    {/* <div className="summary-card">
                      <div className="summary-icon"><FaChartBar size={28} color="#facc15" /></div>
                      <div className="summary-info">
                        <div className="summary-value">{Math.round(summary.fastChargingPercentage)}%</div>
                        <div className="summary-label">Fast Charging</div>
                      </div>
                    </div> */}
                  </div>
                )}

                {recentSessions.length > 0 && (
                  <div className="charts-section">
                    <div className="chart-card">
                      <h3>Sessions per Day</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={getSessionsPerDay()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                          <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                          <YAxis stroke="#6b7280" fontSize={12} />
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px' }} />
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
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px' }} formatter={(value: number | undefined) => [value !== undefined ? formatDuration(value) : 'N/A', 'Duration']} />
                          <Line type="monotone" dataKey="duration" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="sessions-section" style={{ marginBottom: '4rem' }}>
                  <h2 className="section-title">Recent Charging Sessions</h2>
                  {recentSessions.length === 0 ? (
                    <div className="no-sessions">
                      <FaBolt size={48} color="#9ca3af" />
                      <p>No charging sessions logged yet.</p>
                    </div>
                  ) : (
                    <div className="sessions-grid">
                      {recentSessions.map((session) => (
                        <div key={session.id} className="session-card">
                          <div className="session-header">
                            <div className="session-date">{formatTimestamp(session.startTime)}</div>
                            <span className={`charging-badge ${getChargingTypeBadge(session.chargingType)}`}>{getChargingTypeLabel(session.chargingType)}</span>
                          </div>
                          <div className="session-soc">
                            <div className="soc-progress">
                              <div className="soc-bar">
                                <div className="soc-fill" style={{ width: `${session.endSoc}%` }} />
                              </div>
                              <div className="soc-labels">
                                <span>{Math.round(session.startSoc)}%</span><span>→</span><span>{Math.round(session.endSoc)}%</span>
                              </div>
                            </div>
                          </div>
                          <div className="session-details">
                            <div className="detail-item"><FaClock size={14} color="#6b7280" /><span>{formatDuration(session.durationMinutes)}</span></div>
                            {session.energyAddedKwh && (
                              <div className="detail-item"><FaBolt size={14} color="#6b7280" /><span>{Math.round(session.energyAddedKwh)}kWh</span></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ==========================================
                2. CHARGING HABITS COMPONENTS 
                ========================================== */}
            {/* <div className="section-divider" style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem', marginTop: '3rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>Charging Habits</h2>
            </div> */}

            {isHabitsLoading ? (
              <div className="loading-state"><div className="spinner" /><p>Analyzing charging habits...</p></div>
            ) : habitsError ? (
              <div className="error-state"><FaChargingStation size={48} color="#ef4444" /><p>{habitsError}</p></div>
            ) : !habitData ? (
              <div className="no-data-state" style={{ marginTop: '3rem' }}><p>No charging habit data yet.</p></div>
            ) : (
              <div className="habits-layout" style={{ marginTop: '4rem', marginBottom: '4rem' }}>
                <div className="hero-card">
                  <div className="hero-blob hero-blob-a" />
                  <div className="hero-blob hero-blob-b" />
                  <div className="hero-overlay" />
                  <div className="hero-inner">
                    <div className="hero-gauge-col">
                      <div className="hero-gauge-wrap">
                        <svg width="200" height="200" viewBox="0 0 200 200" className="habit-gauge-svg">
                          <circle cx="100" cy="100" r="80" fill="none" stroke="#f3f4f6" strokeWidth="14" />
                          <circle cx="100" cy="100" r="80" fill="none" stroke={scoreColor} strokeWidth="14" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} transform="rotate(-90 100 100)" style={{ transition: 'stroke-dashoffset 1s ease', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.1))' }} />
                        </svg>
                        <div className="hero-gauge-center">
                          <div className="hero-score-num">{animatedScore}</div>
                          <div className="hero-score-label">/ 100</div>
                        </div>
                      </div>
                      {/* <div className={`risk-badge ${getRiskClass(habitData.riskLevel)}`}>{habitData.riskLevel} Risk</div> */}
                    </div>
                    <div className="hero-text-col">
                      <h1 className="hero-title"><FaChargingStation className="hero-title-icon" />Charging Habits</h1>
                      <div className="hero-stats">
                        {/* <div className="hero-stat">
                          <div className="hero-stat-num">{habitData.fastChargingPercentage?.toFixed(0)}%</div>
                          <div className="hero-stat-label">Fast Charging</div>
                        </div>
                        <div className="hero-stat-divider" />
                        <div className="hero-stat">
                          <div className="hero-stat-num">{habitData.chargingFrequencyPerWeek?.toFixed(1)}×</div>
                          <div className="hero-stat-label">Per Week</div>
                        </div>
                        <div className="hero-stat-divider" />
                        <div className="hero-stat">
                          <div className="hero-stat-num">{habitData.averageChargeDepth?.toFixed(0)}%</div>
                          <div className="hero-stat-label">Avg Depth</div>
                        </div> */}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="insight-cards-grid">
                  <InsightCard title="Charging Frequency" value={`${habitData.chargingFrequencyPerWeek?.toFixed(1)} / week`} sub="Optimal: 4–6 sessions" status={habitData.chargingFrequencyPerWeek > 7 ? 'warning' : 'good'} icon={<MdSpeed size={24} />} />
                  <InsightCard title="Fast Charging Usage" value={`${habitData.fastChargingPercentage?.toFixed(0)}%`} sub="Recommended: < 30%" status={habitData.fastChargingPercentage > 50 ? 'critical' : habitData.fastChargingPercentage > 30 ? 'warning' : 'good'} icon={<FaBolt size={24} />} />
                  <InsightCard title="Average Charge Depth" value={`${habitData.averageChargeDepth?.toFixed(0)}%`} sub="Recommended: 20–80%" status={habitData.averageChargeDepth > 85 ? 'warning' : 'good'} icon={<MdBattery60 size={24} />} />
                </div>

                <div className="recommendation-card">
                  <div className="recommendation-icon">📋</div>
                  <div>
                    <h3 className="recommendation-title">Personalized Recommendation</h3>
                    <p className="recommendation-body">{habitData.recommendation}</p>
                  </div>
                </div>

                {/* <div className="insights-card">
                  <h3 className="insights-title"><FaStar className="text-yellow-400" /> AI Insights</h3>
                  {habitData.insights?.length > 0 ? (
                    <ul className="insights-list">
                      {habitData.insights.map((insight, i) => (
                        <li key={i} className="insight-item">
                          <div className="insight-dot">{i + 1}</div>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400 text-center py-6">No insights available yet.</p>
                  )}
                </div> */}
              </div>
            )}

            {/* ==========================================
                3. CHARGING OPTIMIZATION COMPONENTS 
                ========================================== */}
            {/* <div className="section-divider" style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem', marginTop: '3rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>Charging Optimization</h2>
            </div> */}

            {isOptLoading ? (
              <div className="co-loading-state"><div className="co-spinner" /><p>Computing optimization…</p></div>
            ) : optError ? (
              <div className="co-error-state"><FaExclamationTriangle size={48} color="#ef4444" /><p>{optError}</p></div>
            ) : !optData ? (
              <div className="co-no-data-state" style={{ marginTop: '3rem' }}><p>No optimization data yet.</p></div>
            ) : (
              <div className="co-layout" style={{ marginTop: '4rem', marginBottom: '4rem' }}>
                <div className="comparison-hero">
                  <div className="comparison-panel comparison-panel--current">
                    <div className="comparison-panel-glow comparison-panel-glow--current" />
                    <div className="comparison-panel-inner">
                      <h2 className="comparison-panel-title"> Current Habits</h2>
                      <div className="habit-items-stack">
                        <HabitItem label="Charge Limit" value="100%" status="warning" />
                        <HabitItem label="Fast Charging" value="Frequent" status="warning" />
                        <HabitItem label="Time of Day" value="Afternoon" status="warning" />
                      </div>
                    </div>
                  </div>
                  <div className="comparison-vs"><span>VS</span></div>
                  <div className="comparison-panel comparison-panel--recommended">
                    <div className="comparison-panel-glow comparison-panel-glow--recommended" />
                    <div className="comparison-panel-inner">
                      <h2 className="comparison-panel-title"> Recommended</h2>
                      <div className="habit-items-stack">
                        <HabitItem label="Charge Limit" value={`${optData.recommendedChargeLimit}%`} status="success" />
                        <HabitItem label="Fast Charging" value={optData.fastChargingRecommendation} status="success" />
                        <HabitItem label="Best Time" value={optData.recommendedChargingTime} status="success" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`priority-impact-card ${isHighPriority ? 'priority-impact-card--high' : 'priority-impact-card--medium'}`}>
                  <div className="priority-left">
                    <div className={`priority-badge ${isHighPriority ? 'priority-badge--high' : 'priority-badge--medium'}`}>
                      {isHighPriority ? (
                        <><FaExclamationTriangle size={22} /><span>HIGH PRIORITY</span></>
                      ) : (
                        <><MdTipsAndUpdates size={24} /><span>{optData.optimizationPriority} PRIORITY</span></>
                      )}
                    </div>
                    <div className="lifespan-extension">
                      <div className="lifespan-label">Estimated Lifespan Extension</div>
                      <div className="lifespan-value">
                        <FaLeaf className="lifespan-icon" />+{optData.estimatedLifespanExtension?.toFixed(1)}<span className="lifespan-unit"> months</span>
                      </div>
                    </div>
                  </div>
                  <div className="priority-divider" />
                  <div className="priority-right">
                    <h4 className="explanation-title"><span className="explanation-icon">💡</span>Why these recommendations?</h4>
                    {optData.explanation && optData.explanation.length > 0 ? (
                      <ul className="explanation-list">
                        {optData.explanation.map((exp, i) => (
                          <li key={i} className="explanation-item"><span className="explanation-bullet" />{exp}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="explanation-empty">Applying AI analysis to your usage patterns…</p>
                    )}
                  </div>
                </div>

                <div className="co-tips-row">
                  <div className="co-tip-card">
                    <div className="co-tip-icon co-tip-icon--blue">🔋</div>
                    <div className="co-tip-text"><div className="co-tip-title">Charge to 80%</div><div className="co-tip-sub">Reduces stress on cells</div></div>
                  </div>
                  <div className="co-tip-card">
                    <div className="co-tip-icon co-tip-icon--purple">🌙</div>
                    <div className="co-tip-text"><div className="co-tip-title">Charge at Night</div><div className="co-tip-sub">Cooler temperature, better efficiency</div></div>
                  </div>
                  <div className="co-tip-card">
                    <div className="co-tip-icon co-tip-icon--orange">⚡</div>
                    <div className="co-tip-text"><div className="co-tip-title">Limit Fast Charging</div><div className="co-tip-sub">Reserve for emergencies</div></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <LogChargingSessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSessionLogged={handleSessionLogged}
        vehicles={vehicles}
      />
    </div>
  );
};

export default ChargingOptimizationPage;
