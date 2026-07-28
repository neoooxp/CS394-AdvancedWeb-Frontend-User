import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export function RouteMap({ stops = [], selectedStopId, onSelectStop }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const polylineRef = useRef(null);
  const [routeStats, setRouteStats] = useState({ distanceKm: null, durationMin: null });

  // Generate distinct non-overlapping fallback coordinates across Phnom Penh route corridor
  const defaultCoords = Array.from({ length: 30 }, (_, idx) => ({
    lat: 11.5580 + (idx * 0.007),
    lng: 104.9120 + (idx * 0.006),
  }));

  const validStops = stops.map((s, idx) => {
    const fallback = defaultCoords[idx % defaultCoords.length];
    return {
      ...s,
      stop_key: String(s.stop_id || s.id || `stop_${idx}`),
      lat: typeof s.lat === 'number' && !isNaN(s.lat) ? s.lat : fallback.lat,
      lng: typeof s.lng === 'number' && !isNaN(s.lng) ? s.lng : fallback.lng,
    };
  });

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const centerLat = validStops.length > 0 ? validStops[0].lat : 11.5760;
    const centerLng = validStops.length > 0 ? validStops[0].lng : 104.9230;

    // Initialize Leaflet map
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers & polyline
    Object.values(markersRef.current).forEach((m) => map.removeLayer(m));
    markersRef.current = {};

    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    if (validStops.length === 0) return;

    const stopCoords = validStops.map((s) => [s.lat, s.lng]);

    // OSRM street route driving fetch
    const drawRoutePath = async () => {
      let streetLatLngs = stopCoords;
      if (validStops.length >= 2) {
        const coordString = validStops.map((s) => `${s.lng},${s.lat}`).join(';');
        try {
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`
          );
          const data = await res.json();
          if (data?.code === 'Ok' && data.routes?.[0]) {
            const osrmCoords = data.routes[0].geometry.coordinates;
            streetLatLngs = osrmCoords.map((c) => [c[1], c[0]]);
            const distance = (data.routes[0].distance / 1000).toFixed(1);
            const duration = Math.round(data.routes[0].duration / 60);
            setRouteStats({ distanceKm: distance, durationMin: duration });
          }
        } catch (err) {
          console.warn('OSRM street route fetch warning:', err);
        }
      }

      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
      }

      const polyline = L.polyline(streetLatLngs, {
        color: '#0544a5',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      polylineRef.current = polyline;

      if (streetLatLngs.length > 0 && !selectedStopId) {
        const bounds = L.latLngBounds(streetLatLngs);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      }
    };

    drawRoutePath();

    // Create numbered pin markers for each stop (1, 2, 3...)
    validStops.forEach((stop, index) => {
      const isSelected = String(stop.stop_id || stop.id || stop.stop_key) === String(selectedStopId);
      const isDepot = stop.type === 'depot';
      const isDropoff = stop.type === 'dropoff';

      let badgeBg = '#0544a5';
      let badgeColor = '#ffffff';
      let border = '2px solid #ffffff';

      if (isDepot) {
        badgeBg = '#0284c7';
      } else if (isDropoff) {
        badgeBg = '#16a34a';
      }

      if (isSelected) {
        border = '3px solid #0f172a';
      }

      const customIcon = L.divIcon({
        className: 'custom-route-pin',
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background-color: ${badgeBg};
            color: ${badgeColor};
            border: ${border};
            font-weight: 800;
            font-size: 14px;
            box-shadow: ${isSelected ? '0 0 0 6px rgba(5,68,165,0.35)' : '0 4px 10px rgba(0,0,0,0.25)'};
            transition: all 0.3s ease;
            transform: ${isSelected ? 'scale(1.25)' : 'scale(1)'};
          ">
            ${index + 1}
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -17],
      });

      const marker = L.marker([stop.lat, stop.lng], { icon: customIcon }).addTo(map);

      const studentNames =
        stop.students && stop.students.length > 0
          ? stop.students.map((st) => `${st.first_name} ${st.last_name}`).join(', ')
          : (isDepot ? 'Route Origin (Start Depot)' : isDropoff ? 'Final School Destination' : 'No passengers listed');

      const stopTitle = isDepot
        ? `Stop #${index + 1} - Start Location`
        : isDropoff
        ? `Stop #${index + 1} - Destination School`
        : `Stop #${index + 1}`;

      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; text-align: left; padding: 4px; min-width: 170px;">
          <div style="font-weight: 700; font-size: 13.5px; color: #0f172a;">${stopTitle}</div>
          <div style="font-size: 12px; color: #334155; font-weight: 600; margin-top: 2px;">${stop.stop_address || stop.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">⏰ Scheduled: ${stop.pickup_time || 'Scheduled'}</div>
          <div style="margin-top: 6px; font-size: 11px; color: #1e293b;">
            <b>Details:</b> ${studentNames}
          </div>
        </div>
      `);

      marker.on('click', () => {
        if (onSelectStop) onSelectStop(stop.stop_id || stop.id);
      });

      markersRef.current[stop.stop_key] = marker;
    });
  }, [stops]);

  // Dynamically pan map and open marker popup when selectedStopId changes
  useEffect(() => {
    if (!mapInstanceRef.current || selectedStopId === null || selectedStopId === undefined) return;

    const targetStop = validStops.find((s) => String(s.stop_id || s.id || s.stop_key) === String(selectedStopId));
    if (targetStop && typeof targetStop.lat === 'number' && typeof targetStop.lng === 'number') {
      mapInstanceRef.current.flyTo([targetStop.lat, targetStop.lng], 15, {
        animate: true,
        duration: 0.8,
      });

      const marker = markersRef.current[targetStop.stop_key];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedStopId, stops]);

  return (
    <div className="route-map-container" style={{ position: 'relative', width: '100%', height: '360px', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--card-shadow)', border: '1px solid var(--card-border)' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

      {/* Route Badge Overlay */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '54px',
          backgroundColor: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(4px)',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 700,
          color: '#0f172a',
          zIndex: 400,
          boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid rgba(5, 68, 165, 0.15)',
        }}
      >
        <span style={{ width: '12px', height: '3px', backgroundColor: '#0544a5', borderRadius: '2px', display: 'inline-block' }} />
        <span>Live Route Map ({stops.length} Stops)</span>
        {routeStats.distanceKm && (
          <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>
            🛣️ {routeStats.distanceKm} km ({routeStats.durationMin} min)
          </span>
        )}
      </div>
    </div>
  );
}
