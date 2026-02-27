import React, { useState } from 'react';
import { FaLightbulb, FaChevronDown, FaChevronUp, FaExclamationCircle } from 'react-icons/fa';
import { MdAutoAwesome } from 'react-icons/md';
import { batteryExplanationService } from '../services/batteryExplanationService';
import type { BatteryExplanationData, ContributingFactor } from '../types/telemetry';
import './BatteryExplanation.css';

/* ─── Props ─────────────────────────────────────────────────────── */
interface BatteryExplanationProps {
  vehicleId: string | null;
  healthScore: number;
}

/* ─── Factor Row ─────────────────────────────────────────────────── */
const FactorRow: React.FC<{ factor: ContributingFactor; index: number }> = ({ factor, index }) => {
  const isNegative = factor.impact === 'Negative';
  const pts = factor.contribution;
  const ptsLabel = pts > 0 ? `+${pts.toFixed(1)}` : pts.toFixed(1);
  // API returns either `factor` (name) or `factorName` — handle both
  const name = (factor as any).factor ?? factor.factorName ?? 'Unknown factor';
  const description = (factor as any).description as string | undefined;

  return (
    <div className="bex-factor-row" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="bex-factor-rank">{index + 1}</div>
      <div className="bex-factor-info">
        <div className="bex-factor-name">{name}</div>
        {description && <div className="bex-factor-desc-inline">{description}</div>}
      </div>
      <div className={`bex-factor-badge bex-factor-badge--${isNegative ? 'neg' : 'pos'}`}>
        {isNegative ? '▼ Negative' : '▲ Positive'}
      </div>
      <div className={`bex-factor-pts bex-factor-pts--${isNegative ? 'neg' : 'pos'}`}>
        {ptsLabel} pts
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────── */
const BatteryExplanation: React.FC<BatteryExplanationProps> = ({ vehicleId, healthScore }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BatteryExplanationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const handleToggle = async () => {
    // If closing, just toggle
    if (open) { setOpen(false); return; }

    // If already fetched, just open
    if (fetched) { setOpen(true); return; }

    // First time opening — fetch
    if (!vehicleId) return;
    setOpen(true);
    setLoading(true);
    setError(null);

    try {
      const result = await batteryExplanationService.getExplanation(vehicleId);
      if (!result) {
        setError('No explanation available yet. Upload more telemetry data to generate one.');
      } else {
        setData(result);
      }
    } catch {
      setError('Failed to load explanation. Please try again later.');
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  const scoreColor = healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="bex-card">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="bex-header">
        <div className="bex-header-left">
          <div className="bex-icon-wrap" style={{ background: `${scoreColor}22`, color: scoreColor }}>
            <MdAutoAwesome size={20} />
          </div>
          <div>
            <div className="bex-title">AI Explanation</div>
            <div className="bex-sub">Understand what's driving your battery health score</div>
          </div>
        </div>

        <button
          className="bex-toggle-btn"
          onClick={handleToggle}
          disabled={!vehicleId}
          aria-expanded={open}
          aria-label="Toggle explanation panel"
        >
          <FaLightbulb size={15} />
          Why this happened?
          {open ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
        </button>
      </div>

      {/* ── Panel ────────────────────────────────────────────────── */}
      {open && (
        <div className="bex-panel">
          {loading ? (
            /* Loading state */
            <div className="bex-loading">
              <div className="bex-spinner" />
              <p>Generating AI explanation…</p>
            </div>
          ) : error ? (
            /* Error state */
            <div className="bex-error">
              <FaExclamationCircle size={20} />
              <p>{error}</p>
            </div>
          ) : data ? (
            <>
              {/* NL Explanation */}
              <div className="bex-explanation-text">
                <div className="bex-explanation-label">
                  🧠 What the AI found
                </div>
                <p>{data.explanation}</p>
              </div>

              {/* Divider */}
              <div className="bex-divider" />

              {/* Top Factors — API returns `factors` (not `topFactors`) */}
              <div className="bex-factors-section">
                <div className="bex-factors-label">Top Contributing Factors</div>
                <div className="bex-factors-list">
                  {(() => {
                    // Normalise: accept both `factors` and `topFactors` from backend
                    const list = (data as any).factors ?? data.topFactors ?? [];
                    const sorted = [...list].sort(
                      (a: ContributingFactor, b: ContributingFactor) =>
                        Math.abs(b.contribution) - Math.abs(a.contribution)
                    );
                    if (sorted.length === 0) {
                      return <p className="bex-no-factors">No factors available.</p>;
                    }
                    return sorted.slice(0, 3).map((f: ContributingFactor, i: number) => (
                      <FactorRow key={i} factor={f} index={i} />
                    ));
                  })()}
                </div>
              </div>

              {/* Footer timestamp */}
              {data.generatedAt && (
                <div className="bex-footer-time">
                  Generated {new Date(data.generatedAt).toLocaleString()}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default BatteryExplanation;
