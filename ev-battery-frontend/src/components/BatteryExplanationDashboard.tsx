import React, { useState, useEffect, useCallback } from 'react';
import { FaLightbulb, FaBrain, FaChevronDown, FaChevronUp, FaExclamationTriangle, FaHistory } from 'react-icons/fa';
import { MdAutoAwesome } from 'react-icons/md';
import api from '../services/api';
import './BatteryExplanationDashboard.css';

/* ═══════════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════════ */

interface ExplanationFactor {
  factor: string;
  contribution: number;      // positive = good, negative = bad
  impact: 'Positive' | 'Negative';
  description: string;       // e.g. "45% fast charging"
}

interface ExplanationData {
  healthScore: number;
  soh: number;
  explanation: string;
  factors: ExplanationFactor[];
  timestamp: string;
  source: string;
}

interface BatteryExplanationDashboardProps {
  vehicleId: string | null;
}

/* ═══════════════════════════════════════════════════════════════
   Sub-component: Circular Progress
═══════════════════════════════════════════════════════════════ */

const CircularProgress: React.FC<{ value: number; size?: number; stroke?: number }> = ({
  value,
  size = 180,
  stroke = 14,
}) => {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(Math.max(value, 0), 100) / 100) * circumference;

  const color =
    value >= 80 ? '#10b981' :
      value >= 60 ? '#f59e0b' :
        '#ef4444';

  const trackColor =
    value >= 80 ? 'rgba(16,185,129,0.12)' :
      value >= 60 ? 'rgba(245,158,11,0.12)' :
        'rgba(239,68,68,0.12)';

  const labelColor =
    value >= 80 ? '#10b981' :
      value >= 60 ? '#f59e0b' :
        '#ef4444';

  return (
    <div className="bed-circle-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="bed-circle-svg">
        <defs>
          <filter id="bed-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        {/* Value arc */}
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cx})`}
          filter="url(#bed-glow)"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      {/* Center text */}
      <div className="bed-circle-center">
        <div className="bed-circle-score" style={{ color: labelColor }}>{value}</div>
        <div className="bed-circle-label">/ 100</div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Sub-component: Impact Bar (factor visualization)
═══════════════════════════════════════════════════════════════ */

const ImpactBar: React.FC<{ factor: ExplanationFactor; maxAbs: number }> = ({ factor, maxAbs }) => {
  const isNeg = factor.impact === 'Negative';
  const pct = maxAbs > 0 ? (Math.abs(factor.contribution) / maxAbs) * 100 : 0;
  const color = isNeg ? '#ef4444' : '#10b981';
  const bgColor = isNeg ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)';
  const pts = factor.contribution > 0
    ? `+${factor.contribution.toFixed(1)}`
    : factor.contribution.toFixed(1);

  return (
    <div className="bed-factor-row">
      <div className="bed-factor-header">
        <span className="bed-factor-name">{factor.factor}</span>
        <span className="bed-factor-pts" style={{ color }}>{pts} pts</span>
      </div>
      <div className="bed-factor-bar-track" style={{ background: 'rgba(0,0,0,0.05)' }}>
        <div
          className="bed-factor-bar-fill"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 6px ${color}55`,
          }}
        />
      </div>
      <div className="bed-factor-meta">
        <span className="bed-factor-desc">{factor.description}</span>
        <span className={`bed-factor-badge bed-factor-badge--${isNeg ? 'neg' : 'pos'}`}
          style={{ background: bgColor, color, borderColor: `${color}44` }}>
          {isNeg ? '▼ Negative' : '▲ Positive'}
        </span>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Sub-component: SHAP Force Plot
═══════════════════════════════════════════════════════════════ */

const ShapForcePlot: React.FC<{ factors: ExplanationFactor[]; baseScore: number }> = ({
  factors,
  baseScore,
}) => {
  if (!factors || factors.length === 0) return null;

  const maxAbs = Math.max(...factors.map((f) => Math.abs(f.contribution)));

  return (
    <div className="bed-shap-card">
      <div className="bed-shap-title">
        <MdAutoAwesome size={16} />
        SHAP Factor Impact Plot
        <span className="bed-shap-sub">How each factor pushes the score up or down</span>
      </div>

      {/* Base line legend */}
      <div className="bed-shap-legend">
        <span className="bed-shap-neg-legend">◀ Negative impact</span>
        <span className="bed-shap-base">Base: {baseScore}</span>
        <span className="bed-shap-pos-legend">Positive impact ▶</span>
      </div>

      <div className="bed-shap-grid">
        {factors.map((f, i) => {
          const isNeg = f.impact === 'Negative';
          const pct = maxAbs > 0 ? (Math.abs(f.contribution) / maxAbs) * 60 : 0; // max 60% of half
          const color = isNeg ? '#ef4444' : '#10b981';
          const pts = f.contribution > 0 ? `+${f.contribution.toFixed(1)}` : f.contribution.toFixed(1);

          return (
            <div key={i} className="bed-shap-row">
              {/* Factor label */}
              <div className="bed-shap-factor-label">{f.factor}</div>

              {/* Left (negative) half */}
              <div className="bed-shap-half bed-shap-half--left">
                {isNeg && (
                  <div
                    className="bed-shap-bar bed-shap-bar--neg"
                    style={{ width: `${pct}%`, background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.4)' }}
                  >
                    <span className="bed-shap-bar-val">{pts}</span>
                  </div>
                )}
              </div>

              {/* Centerline */}
              <div className="bed-shap-center-line" />

              {/* Right (positive) half */}
              <div className="bed-shap-half bed-shap-half--right">
                {!isNeg && (
                  <div
                    className="bed-shap-bar bed-shap-bar--pos"
                    style={{ width: `${pct}%`, background: '#10b981', boxShadow: '0 0 6px rgba(16,185,129,0.4)' }}
                  >
                    <span className="bed-shap-bar-val">{pts}</span>
                  </div>
                )}
              </div>

              {/* Points label (right side) */}
              <div className="bed-shap-row-pts" style={{ color }}>
                {pts}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Sub-component: History Timeline (uses /history endpoint)
═══════════════════════════════════════════════════════════════ */

interface HistoryItem {
  id?: string;
  healthScore: number;
  explanation: string;
  timestamp?: string;
  generatedAt?: string;
}

const HistoryTimeline: React.FC<{ vehicleId: string }> = ({ vehicleId }) => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const r = await api.get<HistoryItem[]>(`/battery-health/explanation/history/${vehicleId}`);
      setItems(Array.isArray(r.data) ? r.data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  const handleToggle = () => {
    if (!open && !fetched) fetchHistory();
    setOpen((o) => !o);
  };

  const scoreColor = (s: number) =>
    s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444';

  const truncate = (t: string, n = 90) => (t.length <= n ? t : t.slice(0, n).trimEnd() + '…');

  return (
    <div className="bed-hist-card">
      <button className="bed-hist-toggle" onClick={handleToggle}>
        <div className="bed-hist-toggle-left">
          <div className="bed-hist-icon">
            <FaHistory size={14} />
          </div>
          <span className="bed-hist-title-text">Explanation History</span>
        </div>
        {open ? <FaChevronUp size={13} className="bed-hist-chev" /> : <FaChevronDown size={13} className="bed-hist-chev" />}
      </button>

      {open && (
        <div className="bed-hist-body">
          {loading ? (
            <div className="bed-hist-loading"><div className="bed-hist-spinner" /><span>Loading history…</span></div>
          ) : items.length === 0 ? (
            <div className="bed-hist-empty">📭 No history yet. Generate your first explanation above.</div>
          ) : (
            <div className="bed-hist-timeline">
              {items.map((item, i) => {
                const ts = item.timestamp || item.generatedAt || '';
                const date = ts ? new Date(ts) : null;
                const color = scoreColor(item.healthScore);
                return (
                  <div key={item.id ?? i} className="bed-hist-item" style={{ animationDelay: `${i * 55}ms` }}>
                    <div className="bed-hist-dot-col">
                      <div className="bed-hist-dot" style={{ background: color }} />
                      {i < items.length - 1 && <div className="bed-hist-line" />}
                    </div>
                    <div className="bed-hist-content">
                      <div className="bed-hist-item-top">
                        {date && (
                          <span className="bed-hist-date">
                            {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            <span className="bed-hist-time">
                              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </span>
                        )}
                        <span
                          className="bed-hist-score"
                          style={{ background: `${color}18`, color, borderColor: `${color}44` }}
                        >
                          Score: {item.healthScore}
                        </span>
                      </div>
                      <p className="bed-hist-summary">{truncate(item.explanation)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */

const BatteryExplanationDashboard: React.FC<BatteryExplanationDashboardProps> = ({ vehicleId }) => {
  const [data, setData] = useState<ExplanationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);

  /* Animate score counter when data arrives */
  useEffect(() => {
    if (!data) return;
    const target = data.healthScore;
    let current = 0;
    const step = target / (1000 / 16);
    const t = setInterval(() => {
      current += step;
      if (current >= target) { setAnimatedScore(target); clearInterval(t); }
      else setAnimatedScore(Math.floor(current));
    }, 16);
    return () => clearInterval(t);
  }, [data]);

  /* Eagerly fetch on mount and whenever vehicleId changes */
  const fetchExplanation = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ExplanationData>(`/battery-health/explanation/${id}`);
      // Normalise: backend may return `factors` or `topFactors`
      const raw = res.data as any;
      const normalised: ExplanationData = {
        ...raw,
        factors: raw.factors ?? raw.topFactors ?? [],
      };
      setData(normalised);
      setPanelOpen(true); // auto-open on first load
    } catch {
      setError('Failed to load explanation. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (vehicleId) {
      setData(null);
      setAnimatedScore(0);
      fetchExplanation(vehicleId);
    }
  }, [vehicleId, fetchExplanation]);

  const healthScore = data?.healthScore ?? 0;
  const scoreLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : 'Poor';
  const scoreColor = healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#ef4444';

  const sortedFactors = data?.factors
    ? [...data.factors].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    : [];

  const maxAbs = sortedFactors.length
    ? Math.max(...sortedFactors.map((f) => Math.abs(f.contribution)))
    : 1;

  const handleToggle = () => setPanelOpen((o) => !o);
  const handleRetry = () => vehicleId && fetchExplanation(vehicleId);

  return (
    <div className="bed-wrapper">

      {/* ══ 1. MAIN HEALTH CARD ═══════════════════════════════════ */}
      <div className="bed-health-card">
        {/* Background blobs */}
        <div className="bed-blob bed-blob-1" />
        <div className="bed-blob bed-blob-2" />

        <div className="bed-health-inner">
          {/* Left: Circular progress */}
          <div className="bed-gauge-col">
            <CircularProgress value={animatedScore || healthScore} />
            <div className="bed-score-label-wrap">
              <span className="bed-score-label" style={{ color: scoreColor }}>{scoreLabel}</span>
              <span className="bed-score-subtitle">Battery Health Score</span>
            </div>
          </div>

          {/* Right: Info + button */}
          <div className="bed-info-col">
            <div className="bed-info-title">AI Health Analysis</div>
            <div className="bed-info-sub">Powered by ML model with SHAP explanations</div>

            {data && (
              <div className="bed-metrics-row">
                <div className="bed-metric">
                  <div className="bed-metric-val">{data.soh.toFixed(1)}%</div>
                  <div className="bed-metric-label">State of Health</div>
                </div>
                <div className="bed-metric">
                  <div className="bed-metric-val" style={{ fontSize: '0.85rem' }}>{data.source?.replace(/_/g, ' ')}</div>
                  <div className="bed-metric-label">Source</div>
                </div>
                {data.timestamp && (
                  <div className="bed-metric">
                    <div className="bed-metric-val" style={{ fontSize: '0.8rem' }}>
                      {new Date(data.timestamp).toLocaleDateString()}
                    </div>
                    <div className="bed-metric-label">Last Updated</div>
                  </div>
                )}
              </div>
            )}

            {/* CTA */}
            <button
              className="bed-why-btn"
              onClick={handleToggle}
              disabled={!vehicleId || loading}
              aria-expanded={panelOpen}
            >
              {loading ? (
                <><div className="bed-btn-spinner" /> Loading…</>
              ) : (
                <><FaLightbulb size={14} /> Why this happened? {panelOpen ? <FaChevronUp size={11} /> : <FaChevronDown size={11} />}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ══ 2. EXPLANATION PANEL ══════════════════════════════════ */}
      {panelOpen && (
        <div className="bed-panel">
          {loading ? (
            <div className="bed-loading">
              <div className="bed-loading-spinner" />
              <p>Generating AI explanation…</p>
            </div>
          ) : error ? (
            <div className="bed-error">
              <FaExclamationTriangle size={18} />
              <span>{error}</span>
              <button className="bed-retry-btn" onClick={handleRetry}>Retry</button>
            </div>
          ) : data ? (
            <>
              {/* NL Explanation */}
              <div className="bed-explanation-box">
                <div className="bed-explanation-heading">
                  <FaBrain size={15} />
                  What the AI Found
                </div>
                <p className="bed-explanation-text">{data.explanation}</p>
              </div>

              {/* Impact Bars - sorted by abs(contribution) */}
              <div className="bed-section-heading">
                Contributing Factors
                <span className="bed-section-sub">How each factor affects your score</span>
              </div>
              <div className="bed-factors-list">
                {sortedFactors.length === 0 ? (
                  <p className="bed-no-factors">No factors available.</p>
                ) : (
                  sortedFactors.map((f, i) => (
                    <ImpactBar key={i} factor={f} maxAbs={maxAbs} />
                  ))
                )}
              </div>

              {/* ══ 3. SHAP FORCE PLOT ═════════════════════════════ */}
              <ShapForcePlot factors={sortedFactors} baseScore={data.healthScore} />
            </>
          ) : null}
        </div>
      )}

      {/* ══ 4. HISTORY TIMELINE ═══════════════════════════════════ */}
      {vehicleId && <HistoryTimeline vehicleId={vehicleId} />}
    </div>
  );
};

export default BatteryExplanationDashboard;
