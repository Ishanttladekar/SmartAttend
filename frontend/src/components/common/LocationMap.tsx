import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationMapProps {
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  studentLat?: number | null;
  studentLng?: number | null;
  studentAccuracy?: number | null;
  className?: string;
  centerLabel?: string;
}

export const LocationMap: React.FC<LocationMapProps> = ({
  centerLat,
  centerLng,
  radiusMeters,
  studentLat,
  studentLng,
  studentAccuracy,
  className = 'h-64 w-full',
  centerLabel = 'Classroom Location',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if not yet created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 18,
        zoomControl: true,
        attributionControl: false,
      });

      // OpenStreetMap Tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const layers = layerGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    // Custom SVG Icon for Center (Classroom / Teacher)
    const classroomIcon = L.divIcon({
      className: 'custom-classroom-icon',
      html: `
        <div style="background-color: #2563eb; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border: 2px solid white;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

    // Add Classroom Marker
    const classroomMarker = L.marker([centerLat, centerLng], { icon: classroomIcon })
      .bindPopup(`<b>${centerLabel}</b><br>Authorized Attendance Perimeter`)
      .addTo(layers);

    // Add 25m (or radiusMeters) Geofence Circle
    const geofenceCircle = L.circle([centerLat, centerLng], {
      radius: radiusMeters,
      color: '#2563eb',
      fillColor: '#3b82f6',
      fillOpacity: 0.15,
      weight: 2,
      dashArray: '4, 4',
    })
      .bindPopup(`Allowed Radius: ${radiusMeters} meters`)
      .addTo(layers);

    // If Student location is provided, display student dot and accuracy
    if (studentLat != null && studentLng != null) {
      const studentIcon = L.divIcon({
        className: 'custom-student-icon',
        html: `
          <div style="background-color: #10b981; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border: 2px solid white;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="m10 15 5-3-5-3v6Z"/>
            </svg>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28],
      });

      L.marker([studentLat, studentLng], { icon: studentIcon })
        .bindPopup(`<b>Your Live Location</b>`)
        .addTo(layers);

      // Accuracy circle
      if (studentAccuracy && studentAccuracy > 0) {
        L.circle([studentLat, studentLng], {
          radius: studentAccuracy,
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.08,
          weight: 1,
        }).addTo(layers);
      }

      // Connecting line
      L.polyline(
        [
          [centerLat, centerLng],
          [studentLat, studentLng],
        ],
        {
          color: '#64748b',
          weight: 2,
          dashArray: '3, 6',
        }
      ).addTo(layers);

      // Fit bounds to show both points
      const bounds = L.latLngBounds([
        [centerLat, centerLng],
        [studentLat, studentLng],
      ]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
    } else {
      map.setView([centerLat, centerLng], 18);
    }
  }, [centerLat, centerLng, radiusMeters, studentLat, studentLng, studentAccuracy, centerLabel]);

  return (
    <div className={`relative rounded-xl overflow-hidden border border-slate-200 z-0 ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

