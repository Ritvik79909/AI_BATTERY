import React, { useState } from 'react';
import { FaHistory, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { batteryExplanationService } from '../services/batteryExplanationService';
import type { ExplanationHistoryItem } from '../types/telemetry';
import './ExplanationHistory.css';

/* ─── Props ─────────────────────────────────────────────────────── */
interface ExplanationHistoryProps {
  vehicleId: string | null;
}

/* ─── Helper: score color ────────────────────────────────────────── */
const scoreColor = (s: number) =>
  s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444';

/* ─── Main Component ─────────────────────────────────────────────── */
const ExplanationHistory: React.FC<ExplanationHistoryProps> = ({ vehicleId }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ExplanationHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const handleToggle = async () => {
    if (open) { setOpen(false); return; }
    if (fetched) { setOpen(true); return; }
    if (!vehicleId) return;

    setOpen(true);
    setLoading(true);
    setError(null);

    try {
      const data = await batteryExplanationService.getExplanationHistory(vehicleId);
      setItems(data);
    } catch {
      setError('Failed to load explanation history.');
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  /* Truncate helper */
  const truncate = (text: string, max = 100) =>
    text.length <= max ? text : text.slice(0, max).trimEnd() + '…';

  return (
    <div className="exh-card">
      {/* ── Header ─────────────────────────────────────────────── */}
      <button
        className="exh-header"
        onClick={handleToggle}
        disabled={!vehicleId}
        aria-expanded={open}
      >
        <div className="exh-header-left">
          <div className="exh-icon-wrap">
            <FaHistory size={16} />
          </div>
          <div>
            <div className="exh-title">Explanation History</div>
            <div className="exh-sub">Past AI explanations for this vehicle</div>
          </div>
        </div>
        {open ? <FaChevronUp size={14} className="exh-chevron" /> : <FaChevronDown size={14} className="exh-chevron" />}
      </button>

      {/* ── Timeline ───────────────────────────────────────────── */}
      {open && (
        <div className="exh-body">
          {loading ? (
            <div className="exh-loading">
              <div className="exh-spinner" />
              <p>Loading history…</p>
            </div>
          ) : error ? (
            <div className="exh-error">{error}</div>
          ) : items.length === 0 ? (
            <div className="exh-empty">
              <span>📭</span>
              <p>No explanation history yet. Generate your first explanation above.</p>
            </div>
          ) : (
            <div className="exh-timeline">
              {items.map((item, i) => {
                const color = scoreColor(item.healthScore);
                const date = new Date(item.generatedAt);
                return (
                  <div key={item.id ?? i} className="exh-item" style={{ animationDelay: `${i * 60}ms` }}>
                    {/* Timeline dot + line */}
                    <div className="exh-dot-col">
                      <div className="exh-dot" style={{ background: color }} />
                      {i < items.length - 1 && <div className="exh-line" />}
                    </div>

                    {/* Content */}
                    <div className="exh-content">
                      <div className="exh-item-top">
                        <div className="exh-date">
                          {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          <span className="exh-time">
                            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div
                          className="exh-score-chip"
                          style={{ background: `${color}18`, color, borderColor: `${color}44` }}
                        >
                          Score: {item.healthScore}
                        </div>
                      </div>
                      <p className="exh-summary">{truncate(item.explanation)}</p>
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

export default ExplanationHistory;
