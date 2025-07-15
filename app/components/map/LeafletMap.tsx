'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { IncidentMapMarker } from '@/lib/types';

interface LeafletMapProps {
  center: [number, number];
  incidents: IncidentMapMarker[];
  style?: React.CSSProperties;
  zoom?: number;
  onIncidentClick?: (incidentId: string) => void;
}

export default function LeafletMap({
  center,
  incidents,
  style,
  zoom = 12,
  onIncidentClick,
}: LeafletMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={style}
      className="rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {incidents.map((incident) => (
        <CircleMarker
          key={incident.id}
          center={[incident.latitude, incident.longitude]}
          radius={6}
          fillColor="#ef4444"
          color="#dc2626"
          weight={1}
          opacity={0.8}
          fillOpacity={0.6}
          eventHandlers={{
            click: () => {
              if (onIncidentClick) {
                onIncidentClick(incident.id);
              }
            },
          }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{incident.newsType}</p>
              <p className="text-gray-600">
                {new Date(incident.publishedDate).toLocaleDateString()}
              </p>
              <p className="text-gray-500 mt-1">
                {incident.location}
              </p>
              {onIncidentClick && (
                <button
                  onClick={() => onIncidentClick(incident.id)}
                  className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                >
                  View Details
                </button>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
} 