// components/stations/StationMap.tsx
import React, { useEffect, useRef } from 'react';
import type { ChargingStation } from '../../types/station';
import type { GeoLocation } from '../../hooks/useGeolocation';

export type MapTypeId = 'roadmap' | 'satellite' | 'terrain' | 'hybrid';

interface StationMapProps {
  center: GeoLocation;
  stations: ChargingStation[];
  radius: number;                    // km
  highlightedId: string | null;
  onStationClick: (station: ChargingStation) => void;
  onMapReady?: () => void;
  mapType?: MapTypeId;
}

/* ── Google Maps loader (module-level singleton) ──── */
let mapsLoaded = false;
let mapsLoading = false;
const mapsCallbacks: (() => void)[] = [];

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (mapsLoaded) { resolve(); return; }
    mapsCallbacks.push(resolve);
    if (mapsLoading) return;
    mapsLoading = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      mapsLoaded = true;
      mapsLoading = false;
      mapsCallbacks.forEach((cb) => cb());
      mapsCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

function reliabilityToColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

/* ── Component ─────────────────────────────────────── */
const StationMap: React.FC<StationMapProps> = ({
  center,
  stations,
  radius,
  highlightedId,
  onStationClick,
  mapType = 'roadmap',
}) => {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapReady, setMapReady] = React.useState(false);

  /* Load Google Maps SDK once */
  useEffect(() => {
    if (!MAPS_KEY) return;
    loadGoogleMaps(MAPS_KEY).then(() => setMapReady(true));
  }, []);

  /* Initialize map (only once, guard from uploaded pattern) */
  useEffect(() => {
    if (!mapReady || !mapDivRef.current || googleMapRef.current) return;
    googleMapRef.current = new window.google.maps.Map(mapDivRef.current, {
      center: { lat: Number(center.lat), lng: Number(center.lng) },
      zoom: 12,
      mapTypeId: mapType,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#f0f4f1' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8d4' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
        { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
      zoomControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      mapTypeControl: false,
    });
  }, [mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Sync map type when it changes */
  useEffect(() => {
    if (!googleMapRef.current || !mapReady) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (googleMapRef.current as any).setMapTypeId(mapType);
  }, [mapType, mapReady]);

  /* Pan + update user marker + circle when center/radius changes */
  useEffect(() => {
    if (!googleMapRef.current || !mapReady) return;
    const pos = { lat: Number(center.lat), lng: Number(center.lng) };
    if (isNaN(pos.lat) || isNaN(pos.lng)) return;
    googleMapRef.current.panTo(pos);

    // User location marker (blue dot)
    userMarkerRef.current?.setMap(null);
    userMarkerRef.current = new window.google.maps.Marker({
      position: pos,
      map: googleMapRef.current,
      title: 'Your Location',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
      zIndex: 999,
    });

    // Radius circle — update radius without recreating if possible
    if (circleRef.current) {
      circleRef.current.setCenter(pos);
      circleRef.current.setRadius(radius * 1000);
    } else {
      circleRef.current = new window.google.maps.Circle({
        map: googleMapRef.current,
        center: pos,
        radius: radius * 1000,
        strokeColor: '#10b981',
        strokeOpacity: 0.5,
        strokeWeight: 1.5,
        fillColor: '#10b981',
        fillOpacity: 0.06,
      });
    }
  }, [center.lat, center.lng, radius, mapReady]);

  /* Update station markers + fit bounds when stations/highlight changes */
  useEffect(() => {
    if (!googleMapRef.current || !mapReady) return;

    // Clear old station markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    infoWindowRef.current?.close();

    const bounds = new window.google.maps.LatLngBounds();
    const centerPos = { lat: Number(center.lat), lng: Number(center.lng) };
    if (!isNaN(centerPos.lat) && !isNaN(centerPos.lng)) {
      bounds.extend(centerPos);
    }

    stations.forEach((station) => {
      const sLat = Number(station.lat);
      const sLng = Number(station.lon);
      // Skip stations with invalid coordinates (API returning strings or nulls)
      if (isNaN(sLat) || isNaN(sLng)) return;
      // Recommended = bright green; others colored by reliability score
      const isHighlighted = highlightedId === station.id;
      const color = station.recommended
        ? '#10b981'
        : reliabilityToColor(station.reliabilityScore);

      const marker = new window.google.maps.Marker({
        position: { lat: sLat, lng: sLng },
        map: googleMapRef.current!,
        title: station.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: station.recommended ? 13 : isHighlighted ? 12 : 9,
          fillColor: color,
          fillOpacity: isHighlighted ? 1 : 0.85,
          strokeColor: '#ffffff',
          strokeWeight: isHighlighted ? 3 : 2,
        },
        zIndex: isHighlighted ? 100 : 1,
      });

      // Info window on marker click
      const iw = new window.google.maps.InfoWindow({
        content: `
          <div style="font-family:'Inter',sans-serif;padding:6px 2px;min-width:170px;">
            <div style="font-weight:700;font-size:0.9rem;color:#1f2937;margin-bottom:4px;">${station.name}</div>
            <div style="font-size:0.78rem;color:#6b7280;">${Number(station.distanceKm).toFixed(1)} km · ⚡ ${Number(station.powerKw)} kW</div>
            <div style="font-size:0.76rem;color:${color};font-weight:600;margin-top:3px;">Score: ${station.reliabilityScore}/100</div>
            ${station.recommended ? '<div style="font-size:0.72rem;color:#10b981;margin-top:2px;">★ Recommended for battery health</div>' : ''}
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindowRef.current?.close();
        iw.open(googleMapRef.current!, marker);
        infoWindowRef.current = iw;
        onStationClick(station);
      });

      markersRef.current.push(marker);
      bounds.extend({ lat: sLat, lng: sLng });
    });

    // Fit bounds to show all markers
    if (stations.length > 0) {
      (googleMapRef.current as google.maps.Map).fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    }
  }, [stations, mapReady, highlightedId, onStationClick]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!MAPS_KEY) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', color: '#0369a1', fontSize: '0.85rem', gap: '0.5rem' }}>
        <span style={{ fontSize: '2.5rem', opacity: 0.4 }}>🗺️</span>
        Google Maps API key not configured
      </div>
    );
  }

  return <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />;
};

export default StationMap;
