import React, { useState } from 'react';
import { FaFilter, FaCar, FaBolt, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import type { StationFilters, ConnectorType, SortBy } from '../../types/station';
import type { Vehicle } from '../../types/vehicle';
import './FilterPanel.css';

interface FilterPanelProps {
  filters: StationFilters;
  vehicles: Vehicle[];
  onFiltersChange: (f: StationFilters) => void;
  onApply: () => void;
}

const CONNECTOR_BTNS: { label: string; value: ConnectorType | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'CCS', value: 'CCS' },
  { label: 'CHAdeMO', value: 'CHADEMO' },
  { label: 'Type 2', value: 'TYPE2' },
];

const SORT_OPTIONS: { label: string; value: SortBy }[] = [
  { label: 'Score', value: 'score' },
  { label: 'Distance', value: 'distance' },
  { label: 'Power', value: 'power' },
];

const MIN_POWER_OPTIONS = [0, 22, 50, 100, 150];

const FilterPanel: React.FC<FilterPanelProps> = ({ filters, vehicles, onFiltersChange, onApply }) => {
  const [expanded, setExpanded] = useState(false);

  const update = <K extends keyof StationFilters>(key: K, val: StationFilters[K]) =>
    onFiltersChange({ ...filters, [key]: val });

  const sliderFill = `${((filters.radius - 5) / (50 - 5)) * 100}%`;

  return (
    <div className="fp-bar">
      {/* Always-visible row */}
      <div className="fp-row">
        {/* Connector type pills */}
        <div className="fp-group">
          <span className="fp-group-label">Connector</span>
          <div className="fp-connector-pills">
            {CONNECTOR_BTNS.map((btn) => (
              <button
                key={btn.value}
                className={`fp-pill-btn ${filters.connectorType === btn.value ? 'active' : ''}`}
                onClick={() => update('connectorType', btn.value)}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fast charge toggle */}
        <div className="fp-group fp-group-toggle">
          <span className="fp-group-label">Fast Charge</span>
          <label className="fp-toggle">
            <input
              type="checkbox"
              id="fp-fastcharge-toggle"
              name="fastChargeOnly"
              checked={filters.fastChargeOnly}
              onChange={(e) => update('fastChargeOnly', e.target.checked)}
            />
            <span className="fp-toggle-track">
              <span className="fp-toggle-thumb" />
            </span>
          </label>
        </div>

        {/* Min power */}
        <div className="fp-group">
          <span className="fp-group-label">Min Power</span>
          <select
            id="fp-min-power"
            name="minPowerKw"
            className="fp-select"
            value={filters.minPowerKw}
            onChange={(e) => update('minPowerKw', Number(e.target.value))}
          >
            {MIN_POWER_OPTIONS.map((kw) => (
              <option key={kw} value={kw}>{kw === 0 ? 'Any kW' : `≥ ${kw} kW`}</option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="fp-group">
          <span className="fp-group-label">Sort By</span>
          <select
            id="fp-sort"
            name="sortBy"
            className="fp-select"
            value={filters.sortBy}
            onChange={(e) => update('sortBy', e.target.value as SortBy)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Search button */}
        <button className="fp-search-btn" onClick={onApply}>
          <FaBolt size={12} /> Search
        </button>

        {/* More filters toggle */}
        <button
          className="fp-more-btn"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          <FaFilter size={11} />
          {expanded ? 'Less' : 'More'}
          {expanded ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
        </button>
      </div>

      {/* Expandable row */}
      <div className={`fp-expanded ${expanded ? 'fp-expanded-open' : ''}`}>
        <div className="fp-row fp-row-secondary">
          {/* Distance slider */}
          <div className="fp-group fp-group-wide">
            <span className="fp-group-label">Radius: <strong>{filters.radius} km</strong></span>
            <input
              id="fp-radius-slider"
              name="radius"
              type="range"
              className="fp-slider"
              min={5}
              max={50}
              step={5}
              value={filters.radius}
              style={{ '--fill': sliderFill } as React.CSSProperties}
              onChange={(e) => update('radius', Number(e.target.value))}
            />
            <div className="fp-slider-ticks">
              <span>5</span><span>50 km</span>
            </div>
          </div>

          {/* Vehicle selector */}
          {vehicles.length > 0 && (
            <div className="fp-group">
              <span className="fp-group-label">
                <FaCar size={10} style={{ marginRight: 3 }} />Vehicle
              </span>
              <select
                id="fp-vehicle-select"
                name="vehicleId"
                className="fp-select"
                value={filters.vehicleId ?? ''}
                onChange={(e) => update('vehicleId', e.target.value || null)}
              >
                <option value="">All Vehicles</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nickname} — {v.make} {v.model}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reliable only toggle */}
          <div className="fp-group fp-group-toggle">
            <span className="fp-group-label">Reliable Only</span>
            <label className="fp-toggle">
              <input
                type="checkbox"
                id="fp-reliable-toggle"
                name="reliableOnly"
                checked={filters.reliableOnly}
                onChange={(e) => update('reliableOnly', e.target.checked)}
              />
              <span className="fp-toggle-track">
                <span className="fp-toggle-thumb" />
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
