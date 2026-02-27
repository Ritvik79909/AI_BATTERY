import React, { useState, useEffect, useCallback } from 'react';
import { FaBatteryFull, FaInfoCircle } from 'react-icons/fa';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import Navbar from '../components/Navbar';
import { batteryHealthService } from '../services/batteryHealthService';
import { vehicleService } from '../services/vehicleService';
import BatteryExplanation from '../components/BatteryExplanation';
import ExplanationHistory from '../components/ExplanationHistory';
import type {
  BatteryHealthScore,
  StateOfHealth,
  RemainingUsefulLife,
  SimulatedBatteryHealth,
  SoHHistoryPoint,
  RULHistoryPoint
} from '../types/telemetry';
import type { Vehicle } from '../types/vehicle';
import './BatteryHealthPage.css';

/* ─── Sub-components ──────────────────────────────────────────── */

interface ScoreCardProps {
  title: string;
  value: string;
  sub?: string;
  color: 'green' | 'orange' | 'blue' | 'yellow';
  icon: string;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ title, value, sub, color, icon }) => (
  <div className={`score-card score-card--${color}`}>
    <div className="score-card-icon">{icon}</div>
    <div className="score-card-title">{title}</div>
    <div className="score-card-value">{value}</div>
    {sub && <div className="score-card-sub">{sub}</div>}
  </div>
);

/* ─── Circular SVG Gauge (custom, no extra package) ──────────── */

interface CircularGaugeProps {
  value: number; // 0-100
  color: string;
}

const CircularGauge: React.FC<CircularGaugeProps> = ({ value, color }) => {
  const radius = 88;
  const stroke = 14;
  const cx = 110, cy = 110;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width="220" height="220" viewBox="0 0 220 220" className="circular-gauge-svg">
      {/* Background track */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={stroke}
      />
      {/* Value arc */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
      />
      {/* Glow filter */}
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
    </svg>
  );
};

/* ─── Main Page ───────────────────────────────────────────────── */

const BatteryHealthPage: React.FC = () => {
  const [activeTab] = useState('battery health');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vehicle state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);

  // Health data
  const [scoreData, setScoreData] = useState<BatteryHealthScore | null>(null);
  const [sohData, setSohData] = useState<StateOfHealth | null>(null);
  const [rulData, setRulData] = useState<RemainingUsefulLife | null>(null);
  const [simData, setSimData] = useState<SimulatedBatteryHealth | null>(null);
  const [sohHistory, setSohHistory] = useState<SoHHistoryPoint[]>([]);
  const [rulHistory, setRulHistory] = useState<RULHistoryPoint[]>([]);

  // Animated score for gauge
  const [gaugeValue, setGaugeValue] = useState(0);

  useEffect(() => { fetchVehicles(); }, []);
  useEffect(() => {
    if (selectedVehicleId) fetchBatteryHealth(selectedVehicleId);
  }, [selectedVehicleId]);

  // Animate gauge when score loads
  useEffect(() => {
    const target = scoreData?.healthScore ?? simData?.healthScore ?? 0;
    if (target === 0) { setGaugeValue(0); return; }
    let current = 0;
    const step = target / (1200 / 16);
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setGaugeValue(target); clearInterval(timer); }
      else setGaugeValue(Math.floor(current));
    }, 16);
    return () => clearInterval(timer);
  }, [scoreData, simData]);

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

  const fetchBatteryHealth = useCallback(async (vehicleId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [sohRes, rulRes, scoreRes, simRes, rulHistRes, sohHistRes] = await Promise.all([
        batteryHealthService.getStateOfHealth(vehicleId),
        batteryHealthService.getRemainingUsefulLife(vehicleId),
        batteryHealthService.getHealthScore(vehicleId),
        batteryHealthService.getSimulatedHealth(vehicleId),
        batteryHealthService.getRULHistory(vehicleId),
        batteryHealthService.getSoHHistory(vehicleId)
      ]);
      setSohData(sohRes);
      setRulData(rulRes);
      setScoreData(scoreRes);
      setSimData(simRes);
      setRulHistory(rulHistRes);
      setSohHistory(sohHistRes);
    } catch {
      setError('Failed to load battery health data.');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Derived helpers ── */
  const healthScore = scoreData?.healthScore ?? simData?.healthScore ?? 0;
  const healthLabel = scoreData?.label ?? (
    healthScore >= 80 ? 'Good' : healthScore >= 60 ? 'Fair' : 'Poor'
  );

  const getGaugeColor = (score: number) => {
    if (score >= 80) return '#4ade80';  // bright green
    if (score >= 60) return '#fbbf24';  // amber
    return '#f87171';                   // red
  };

  const degradationData = simData?.degradationTrend?.map((soh, i) => ({
    cycle: i + 1, soh
  })) || [];

  const hasData = scoreData || sohData || rulData || simData;

  return (
    <div className="battery-health-container">
      <Navbar activeTab={activeTab} />

      <div className="health-content">
        {/* Vehicle Selector */}
        {vehiclesLoading ? (
          <div className="loading-state"><div className="spinner" /><p>Loading vehicles...</p></div>
        ) : vehicles.length === 0 ? (
          <div className="no-data-state">
            <FaBatteryFull size={64} color="#9ca3af" />
            <h2>Please add a vehicle to view battery health insights.</h2>
            <p>Go to Vehicle Setup to add your first vehicle.</p>
          </div>
        ) : (
          <>
            <div className="vehicle-selector">
              <label htmlFor="vehicle-select">Select Vehicle:</label>
              <select
                id="vehicle-select"
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
              <div className="loading-state"><div className="spinner" /><p>Analyzing battery health...</p></div>
            ) : error ? (
              <div className="error-state">
                <FaInfoCircle size={48} color="#ef4444" />
                <p>{error}</p>
              </div>
            ) : !hasData ? (
              <div className="no-data-state">
                <FaBatteryFull size={64} color="#9ca3af" />
                <h2>Battery health analysis will appear once telemetry is available.</h2>
                <p>Upload or ingest battery telemetry data to see health predictions.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-8">

                {/* ━━━ 1. HEALTH SCORE HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <div className="health-score-hero">
                  {/* Decorative blobs */}
                  <div className="hero-blob hero-blob-1" />
                  <div className="hero-blob hero-blob-2" />
                  <div className="hero-overlay" />

                  <div className="hero-content">
                    {/* Circular gauge */}
                    <div className="hero-gauge-wrap">
                      <CircularGauge value={gaugeValue} color={getGaugeColor(healthScore)} />
                      <div className="hero-gauge-center">
                        <div className="hero-score-number">{gaugeValue}</div>
                        <div className="hero-score-pct">/ 100</div>
                      </div>
                    </div>

                    {/* Text */}
                    <div className="hero-text">
                      <h1 className="hero-label">{healthLabel}</h1>
                      <p className="hero-sub">Combined AI Analysis of SoH, RUL &amp; Usage</p>
                      {simData?.source && (
                        <div className="hero-source-badge">
                          🧠 {simData.source}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ━━━ 2. SCORE BREAKDOWN CARDS ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <div className="score-cards-grid">
                  <ScoreCard
                    title="State of Health"
                    value={`${(sohData?.sohPercentage ?? simData?.soh ?? 0).toFixed(1)}%`}
                    sub={sohData?.status}
                    color="green"
                    icon="🔋"
                  />
                  <ScoreCard
                    title="Cycles Remaining"
                    value={`${rulData?.rulCycles ?? simData?.rulCycles ?? '—'}`}
                    sub={rulData ? `~${rulData.estimatedMonths} months` : undefined}
                    color="orange"
                    icon="♻️"
                  />
                  <ScoreCard
                    title="Temp Stress"
                    value="Low"
                    sub="Within safe range"
                    color="blue"
                    icon="🌡️"
                  />
                  <ScoreCard
                    title="Charge Stress"
                    value="Moderate"
                    sub="Optimize charge cycles"
                    color="yellow"
                    icon="⚡"
                  />
                </div>

                {/* ━━━ 3. INTERPRETATION MESSAGE ━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <div className="interpretation-card">
                  <div className={`interpretation-inner ${healthScore >= 80
                    ? 'interpretation-excellent'
                    : healthScore >= 60
                      ? 'interpretation-moderate'
                      : 'interpretation-poor'
                    }`}>
                    <div className="interpretation-icon">
                      {healthScore >= 80 ? '✅' : healthScore >= 60 ? '⚠️' : '🚨'}
                    </div>
                    <div>
                      <h3 className="interpretation-title">
                        {healthScore >= 80
                          ? 'Excellent Condition'
                          : healthScore >= 60
                            ? 'Monitor Usage'
                            : 'Action Required'}
                      </h3>
                      <p className="interpretation-body">
                        {healthScore >= 80
                          ? 'Your battery is in excellent condition. Continue maintaining healthy charging habits and avoid extreme temperatures.'
                          : healthScore >= 60
                            ? 'Moderate degradation detected. Optimize charging patterns and avoid deep discharges for longer battery life.'
                            : 'Battery health is declining significantly. A professional assessment is recommended before long trips.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ━━━ 3b. AI EXPLANATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <BatteryExplanation
                  vehicleId={selectedVehicleId}
                  healthScore={healthScore}
                />

                {/* ━━━ 4. SoH TREND CHART ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <div className="chart-card">
                  <h3 className="chart-card-title">
                    <FaBatteryFull className="text-emerald-500" />
                    SoH Trend Over Time
                  </h3>
                  {sohHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={sohHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={(ts) => new Date(ts).toLocaleDateString()}
                          stroke="#9ca3af" tick={{ fontSize: 12 }}
                        />
                        <YAxis domain={['auto', 'auto']} unit="%" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                        <Tooltip
                          labelFormatter={(ts) => new Date(ts).toLocaleString()}
                          formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'SoH']}
                          contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Line type="monotone" dataKey="soh" stroke="#10b981" strokeWidth={3}
                          dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6, fill: '#fff', stroke: '#10b981', strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-empty">No SoH history yet. Upload more telemetry data.</div>
                  )}
                </div>

                {/* ━━━ 5. RUL TREND CHART ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <div className="chart-card chart-card--orange">
                  <h3 className="chart-card-title">
                    🔋 RUL Prediction History
                  </h3>
                  {rulHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={rulHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#fef3c7" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={(unix) => new Date(unix).toLocaleDateString()}
                          stroke="#9ca3af" tick={{ fontSize: 12 }}
                        />
                        <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                        <Tooltip
                          labelFormatter={(unix) => new Date(unix).toLocaleString()}
                          formatter={(v: any) => [`${Number(v).toFixed(0)} cycles`, 'RUL']}
                          contentStyle={{ borderRadius: '10px', border: '1px solid #fed7aa', boxShadow: '0 4px 12px rgba(249,115,22,0.15)' }}
                        />
                        <Line type="monotone" dataKey="rul" stroke="#f97316" strokeWidth={4}
                          dot={{ fill: '#f97316', r: 5 }} activeDot={{ r: 7, fill: '#fff', stroke: '#ea580c', strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-empty">No RUL history yet. More telemetry needed.</div>
                  )}
                </div>

                {/* ━━━ 6. DEGRADATION CHART ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {simData && degradationData.length > 0 && (
                  <div className="chart-card chart-card--red">
                    <h3 className="chart-card-title">📉 Projected Degradation Trend</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={degradationData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#fee2e2" />
                        <XAxis dataKey="cycle"
                          label={{ value: 'Cycle', position: 'insideBottom', offset: -5 }}
                          stroke="#6b7280" />
                        <YAxis domain={[0, 100]}
                          label={{ value: 'SoH (%)', angle: -90, position: 'insideLeft' }}
                          stroke="#6b7280" />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload?.length) {
                              return (
                                <div className="bg-white p-3 border border-red-100 shadow-lg rounded-xl">
                                  <p className="font-semibold text-gray-700">Cycle {label}</p>
                                  <p className="text-red-500 font-bold">SoH: {Number(payload[0].value).toFixed(1)}%</p>
                                  <p className="text-xs text-gray-400 mt-1">Source: {simData?.source}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line type="monotone" dataKey="soh" stroke="#ef4444"
                          strokeWidth={2} strokeDasharray="6 4" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="text-center text-sm text-gray-400 mt-3">
                      Degradation Rate: <strong className="text-gray-600">{simData.degradationRate}%</strong>
                    </p>
                  </div>
                )}

                {/* ━━━ 7. EXPLANATION HISTORY ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <ExplanationHistory vehicleId={selectedVehicleId} />

              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BatteryHealthPage;
