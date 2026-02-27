// components/stations/StationList.tsx
import React from 'react';
import { MdMyLocation } from 'react-icons/md';
import StationCard, { StationCardSkeleton } from './StationCard';
import type { ChargingStation } from '../../types/station';

interface StationListProps {
  stations: ChargingStation[];
  loading: boolean;
  locReady: boolean;
  error: string | null;
  highlightedId: string | null;
  sortBy: string;
  onStationSelect: (station: ChargingStation) => void;
  onIncreaseRadius: () => void;
}

function sortStations(list: ChargingStation[], by: string): ChargingStation[] {
  return [...list].sort((a, b) => {
    if (by === 'distance') return a.distanceKm - b.distanceKm;
    if (by === 'power') return b.powerKw - a.powerKw;      // powerKw (not maxPowerKw)
    return b.reliabilityScore - a.reliabilityScore;         // 'score' default (not rankScore)
  });
}

const StationList: React.FC<StationListProps> = ({
  stations,
  loading,
  locReady,
  error,
  highlightedId,
  sortBy,
  onStationSelect,
  onIncreaseRadius,
}) => {
  const sorted = sortStations(stations, sortBy);

  return (
    <div className="slp-panel-body">
      {/* Skeleton while loading */}
      {loading && (
        <div className="slp-cards-list">
          {[1, 2, 3].map((i) => <StationCardSkeleton key={i} />)}
        </div>
      )}

      {/* Waiting for location */}
      {!loading && !locReady && (
        <div className="slp-empty">
          <div className="slp-empty-icon"><MdMyLocation size={38} /></div>
          <h3>Getting your location…</h3>
          <p>Please allow location access to find nearby stations.</p>
        </div>
      )}

      {/* No results */}
      {!loading && locReady && sorted.length === 0 && !error && (
        <div className="slp-empty">
          <div className="slp-empty-icon">🔌</div>
          <h3>No stations found</h3>
          <p>Try increasing the search radius or adjusting filters.</p>
          <button className="slp-empty-btn" onClick={onIncreaseRadius}>
            Increase Radius
          </button>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="slp-empty">
          <div className="slp-empty-icon">⚠️</div>
          <h3>Failed to load stations</h3>
          <p>{error}</p>
        </div>
      )}

      {/* Station cards */}
      {!loading && sorted.length > 0 && (
        <div className="slp-cards-list">
          {sorted.map((station, i) => (
            <div key={station.id ?? `station-idx-${i}`} id={`station-${station.id ?? i}`}>
              <StationCard
                station={station}
                highlighted={highlightedId === station.id}
                onClick={onStationSelect}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StationList;
