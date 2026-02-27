import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaBolt, FaBars, FaTimes, FaMapMarkerAlt } from 'react-icons/fa';
import { MdMyLocation, MdTerrain, MdSatellite, MdMap } from 'react-icons/md';
import Navbar from '../components/Navbar';
import StationDetailModal from '../components/stations/StationDetailModal';
import FilterPanel from '../components/stations/FilterPanel';
import StationMap from '../components/stations/StationMap';
import type { MapTypeId } from '../components/stations/StationMap';
import StationList from '../components/stations/StationList';
import { vehicleService } from '../services/vehicleService';
import { useGeolocation } from '../hooks/useGeolocation';
import { useStations } from '../hooks/useStations';
import type { ChargingStation, StationFilters } from '../types/station';
import type { Vehicle } from '../types/vehicle';
import { DEFAULT_FILTERS } from '../types/station';
import './StationListPage.css';

/* ── Map-type config ───────────────────────────────── */
const MAP_TYPES: { id: MapTypeId; label: string; icon: React.ReactNode }[] = [
  { id: 'roadmap', label: 'Road', icon: <MdMap size={13} /> },
  { id: 'satellite', label: 'Satellite', icon: <MdSatellite size={13} /> },
  { id: 'terrain', label: 'Terrain', icon: <MdTerrain size={13} /> },
  { id: 'hybrid', label: 'Hybrid', icon: <MdSatellite size={13} /> },
];

/* ── Component ────────────────────────────────────────── */
const StationListPage: React.FC = () => {
  // Location via reusable hook (handles fallback to Hyderabad automatically)
  const { location, loading: locLoading, error: geoError } = useGeolocation();
  const userLat = location?.lat ?? 17.3850;
  const userLon = location?.lng ?? 78.4867;
  const locReady = !locLoading;

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filters, setFilters] = useState<StationFilters>(DEFAULT_FILTERS);
  const [selectedStation, setSelectedStation] = useState<ChargingStation | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [locToast, setLocToast] = useState<string | null>(null);

  // ── Custom center (from location picker) ──
  const [customCenter, setCustomCenter] = useState<{ lat: number; lng: number } | null>(null);

  // ── Map type (terrain switcher) ──
  const [mapType, setMapType] = useState<MapTypeId>('roadmap');

  // ── Location search state ──
  const [showLocSearch, setShowLocSearch] = useState(false);
  const [locSearchValue, setLocSearchValue] = useState('');
  const [locSearchError, setLocSearchError] = useState<string | null>(null);
  const [locSearching, setLocSearching] = useState(false);
  const locInputRef = useRef<HTMLInputElement>(null);

  // Derived center: custom overrides geolocation
  const effectiveLat = customCenter?.lat ?? userLat;
  const effectiveLon = customCenter?.lng ?? userLon;

  // Stations via reusable hook — auto re-fetches when location or filters change
  const { stations, loading, error, refetch } = useStations(
    locReady ? (customCenter ? { lat: customCenter.lat, lng: customCenter.lng } : location) : null,
    filters,
    filters.vehicleId
  );

  // Show geo error as a toast
  useEffect(() => {
    if (geoError) {
      setLocToast('Location access denied. Showing stations near Hyderabad.');
      const t = setTimeout(() => setLocToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [geoError]);

  /* Load vehicles */
  useEffect(() => {
    vehicleService.getVehicles()
      .then((v) => {
        setVehicles(v);
        if (v.length > 0) setFilters((f) => ({ ...f, vehicleId: v[0].id }));
      })
      .catch(() => { });
  }, []);

  // Focus input when search box opens
  useEffect(() => {
    if (showLocSearch) {
      setTimeout(() => locInputRef.current?.focus(), 60);
    }
  }, [showLocSearch]);

  /* Unified station select handler */
  const handleStationSelect = (station: ChargingStation) => {
    setSelectedStation(station);
    setHighlightedId(station.id);
    setIsDetailOpen(true);
    setIsPanelOpen(true);
    document.getElementById(`station-${station.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  /* Manual re-location button (uses browser geolocation) */
  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    setCustomCenter(null); // clear any custom center
    navigator.geolocation.getCurrentPosition(
      () => { refetch(); },
      () => {
        setLocToast('Location access denied. Using current location.');
        setTimeout(() => setLocToast(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  /* Geocode the search value via OpenStreetMap Nominatim (free, no extra API key) */
  const handleLocSearch = useCallback(async () => {
    const query = locSearchValue.trim();
    if (!query) return;
    setLocSearching(true);
    setLocSearchError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data: { lat: string; lon: string; display_name: string }[] = await res.json();
      if (data.length > 0) {
        const newCenter = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        setCustomCenter(newCenter);
        setShowLocSearch(false);
        setLocSearchValue('');
        setLocToast(`📍 Location set to: ${data[0].display_name.split(',').slice(0, 3).join(', ')}`);
        setTimeout(() => setLocToast(null), 5000);
      } else {
        setLocSearchError('Location not found. Try a different address.');
      }
    } catch {
      setLocSearchError('Network error. Check your connection and try again.');
    } finally {
      setLocSearching(false);
    }
  }, [locSearchValue]);

  const handleLocSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLocSearch();
    if (e.key === 'Escape') { setShowLocSearch(false); setLocSearchError(null); }
  };

  const handleApplyFilters = () => refetch();

  return (
    <div className="slp-shell">
      <Navbar activeTab="stations" />

      {/* Sticky Filter Bar */}
      <div className="slp-filter-bar">
        <FilterPanel
          filters={filters}
          vehicles={vehicles}
          onFiltersChange={setFilters}
          onApply={handleApplyFilters}
        />
      </div>

      {/* Main area: map + panel */}
      <div className="slp-main">
        {/* Map */}
        <div className="slp-map-area">
          {/* Location loading overlay */}
          {locLoading && (
            <div className="slp-loc-overlay">
              <div className="slp-loc-overlay-inner">
                <div className="slp-spinner" />
                <span>Detecting your location…</span>
              </div>
            </div>
          )}

          {/* Toast */}
          {locToast && (
            <div className="slp-toast">{locToast}</div>
          )}

          {/* Error toast */}
          {error && (
            <div className="slp-toast slp-toast-error">⚠️ {error}</div>
          )}

          {/* Map — StationMap handles SDK loading, markers, circle, bounds */}
          <StationMap
            center={{ lat: effectiveLat, lng: effectiveLon }}
            stations={stations}
            radius={filters.radius}
            highlightedId={highlightedId}
            onStationClick={handleStationSelect}
            mapType={mapType}
          />

          {/* Map header bar */}
          <div className="slp-map-header">
            <div className="slp-map-title">
              <FaBolt color="#10b981" size={16} />
              Charging Stations
              {locReady && (
                <span className="slp-loc-status">
                  <span className="slp-loc-dot" />
                  {customCenter ? 'Custom location' : 'Location active'}
                </span>
              )}
            </div>
            <div className="slp-map-actions">
              {/* Set Location */}
              <button
                className="slp-set-loc-btn"
                onClick={() => { setShowLocSearch((v) => !v); setLocSearchError(null); }}
                title="Set a custom map location"
              >
                <FaMapMarkerAlt size={13} />
                <span>Set Location</span>
              </button>

              {/* My Location (GPS) */}
              <button
                className="slp-location-btn"
                onClick={handleGetLocation}
                disabled={locLoading}
                title="Use my GPS location"
              >
                {locLoading
                  ? <span className="slp-btn-spinner" />
                  : <MdMyLocation size={15} />
                }
                {locLoading ? 'Locating…' : 'My Location'}
              </button>

              <button
                className={`slp-panel-toggle ${isPanelOpen ? 'active' : ''}`}
                onClick={() => setIsPanelOpen((p) => !p)}
                title={isPanelOpen ? 'Hide station list' : 'Show station list'}
              >
                {isPanelOpen ? <FaTimes size={15} /> : <FaBars size={15} />}
                {isPanelOpen ? 'Hide List' : 'Show List'}
              </button>
            </div>
          </div>

          {/* Location Search Box */}
          {showLocSearch && (
            <div className="slp-loc-search-box">
              <div className="slp-loc-search-header">
                <span className="slp-loc-search-title">📍 Set Location</span>
                <button
                  className="slp-loc-search-close"
                  onClick={() => { setShowLocSearch(false); setLocSearchError(null); }}
                  aria-label="Close location search"
                >
                  <FaTimes size={12} />
                </button>
              </div>
              <div className="slp-loc-search-row">
                <input
                  ref={locInputRef}
                  className="slp-loc-search-input"
                  type="text"
                  placeholder="Enter city, address or landmark…"
                  value={locSearchValue}
                  onChange={(e) => { setLocSearchValue(e.target.value); setLocSearchError(null); }}
                  onKeyDown={handleLocSearchKeyDown}
                />
                <button
                  className="slp-loc-search-go"
                  onClick={handleLocSearch}
                  disabled={locSearching || !locSearchValue.trim()}
                >
                  {locSearching ? <span className="slp-btn-spinner" /> : 'Go'}
                </button>
              </div>
              {locSearchError && (
                <div className="slp-loc-search-error">{locSearchError}</div>
              )}
              {customCenter && (
                <button
                  className="slp-loc-search-reset"
                  onClick={() => { setCustomCenter(null); setShowLocSearch(false); }}
                >
                  ↺ Reset to my GPS location
                </button>
              )}
            </div>
          )}

          {/* Terrain Switcher — bottom-left of map */}
          <div className="slp-terrain-switcher">
            {MAP_TYPES.map((mt) => (
              <button
                key={mt.id}
                className={`slp-terrain-btn ${mapType === mt.id ? 'active' : ''}`}
                onClick={() => setMapType(mt.id)}
                title={`Switch to ${mt.label} view`}
              >
                {mt.icon}
                <span>{mt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Slide-out Panel */}
        <div className={`slp-panel ${isPanelOpen ? 'slp-panel-open' : ''}`}>
          {/* Panel header */}
          <div className="slp-panel-header">
            <div className="slp-panel-count">
              {loading
                ? 'Searching stations…'
                : <><strong>{stations.length}</strong> station{stations.length !== 1 ? 's' : ''} found</>
              }
            </div>
            <button
              className="slp-panel-close"
              onClick={() => setIsPanelOpen(false)}
              aria-label="Close panel"
            >
              <FaTimes size={14} />
            </button>
          </div>

          {/* Legend */}
          <div className="slp-legend">
            <span className="slp-legend-item"><span className="slp-dot" style={{ background: '#10b981' }} /> Recommended</span>
            <span className="slp-legend-item"><span className="slp-dot" style={{ background: '#f59e0b' }} /> Available</span>
            <span className="slp-legend-item"><span className="slp-dot" style={{ background: '#ef4444' }} /> Issues</span>
          </div>

          {/* Cards list — extracted to StationList component */}
          <StationList
            stations={stations}
            loading={loading}
            locReady={locReady}
            error={error}
            highlightedId={highlightedId}
            sortBy={filters.sortBy}
            onStationSelect={handleStationSelect}
            onIncreaseRadius={() => setFilters((f) => ({ ...f, radius: Math.min(f.radius + 10, 50) }))}
          />
        </div>
      </div>

      {/* Detail modal */}
      {
        isDetailOpen && selectedStation && (
          <StationDetailModal
            station={selectedStation}
            onClose={() => { setIsDetailOpen(false); setHighlightedId(null); }}
          />
        )
      }
    </div >
  );
};

export default StationListPage;
