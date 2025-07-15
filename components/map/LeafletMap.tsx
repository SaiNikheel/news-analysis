'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import { IncidentMapMarker, IncidentDetails } from '@/lib/types';
import IncidentDetailsPanel from './IncidentDetails';
import { PlusIcon, MinusIcon } from '@heroicons/react/24/outline';

// Import Leaflet CSS only on client-side
if (typeof window !== 'undefined') {
  require('leaflet/dist/leaflet.css');
}

// Custom zoom control component
function ZoomControls() {
  const map = useMap();
  
  return (
    <div className="absolute bottom-24 right-4 flex flex-col gap-2">
      <button
        onClick={() => map.zoomIn()}
        className="bg-white rounded-lg shadow-lg p-2 hover:bg-gray-50 transition-colors"
        aria-label="Zoom in"
      >
        <PlusIcon className="h-5 w-5 text-gray-600" />
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="bg-white rounded-lg shadow-lg p-2 hover:bg-gray-50 transition-colors"
        aria-label="Zoom out"
      >
        <MinusIcon className="h-5 w-5 text-gray-600" />
      </button>
    </div>
  );
}

interface LeafletMapProps {
  center: [number, number];
  zoom?: number;
  incidents?: IncidentMapMarker[];
  style?: React.CSSProperties;
  onIncidentOpen?: () => void;
  onIncidentClose?: () => void;
  onIncidentClick?: (incidentId: string) => void;
  selectedIncidentDetails?: IncidentDetails | null;
}

export default function LeafletMap({ 
  center, 
  zoom = 11, 
  incidents = [],
  style = { height: '100%', width: '100%', minHeight: '400px' },
  onIncidentOpen,
  onIncidentClose,
  onIncidentClick,
  selectedIncidentDetails,
}: LeafletMapProps) {
  const [mount, setMount] = useState(false);

  // Only render map on client-side
  useEffect(() => {
    setMount(true);
  }, []);

  // Handle incident open/close callbacks
  useEffect(() => {
    if (selectedIncidentDetails && onIncidentOpen) onIncidentOpen();
    if (!selectedIncidentDetails && onIncidentClose) onIncidentClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIncidentDetails]);

  if (!mount) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  // Find center point based on incidents if not provided
  let mapCenter = center;
  if (incidents.length > 0 && (center[0] === 0 && center[1] === 0)) {
    const validIncidents = incidents.filter(inc => 
      inc.latitude && inc.longitude && 
      !isNaN(inc.latitude) && !isNaN(inc.longitude)
    );
    if (validIncidents.length > 0) {
      const avgLat = validIncidents.reduce((sum, inc) => sum + (inc.latitude || 0), 0) / validIncidents.length;
      const avgLng = validIncidents.reduce((sum, inc) => sum + (inc.longitude || 0), 0) / validIncidents.length;
      mapCenter = [avgLat, avgLng];
    }
  }

  return (
    <div className={`relative w-full h-full transition-all duration-300 ${selectedIncidentDetails ? 'ml-96' : ''}`}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={style}
        className="rounded-lg z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {Array.isArray(incidents) && incidents.map((incident, index) => {
          if (!incident.latitude || !incident.longitude || !incident.newsType) return null;
          
          const { color, category } = getColorByType(incident.newsType);
          const isSelected = selectedIncidentDetails?.id === incident.id;

          return (
            <CircleMarker
              key={incident.id || index}
              center={[incident.latitude, incident.longitude]}
              radius={isSelected ? 12 : 8}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: isSelected ? 0.9 : 0.7,
                weight: isSelected ? 3 : 1,
              }}
              eventHandlers={{
                click: () => {
                  if (onIncidentClick && incident.id) {
                    onIncidentClick(incident.id);
                  }
                },
                mouseover: (e) => {
                  e.target.setRadius(12);
                  e.target.setStyle({
                    fillOpacity: 0.9,
                    weight: 3,
                  });
                },
                mouseout: (e) => {
                  if (selectedIncidentDetails?.id !== incident.id) {
                    e.target.setRadius(8);
                    e.target.setStyle({
                      fillOpacity: 0.7,
                      weight: 1,
                    });
                  }
                },
              }}
            />
          );
        })}
        
        {/* Custom zoom control */}
        <ZoomControls />
      </MapContainer>

      {/* Side Panel for Incident Details */}
      <IncidentDetailsPanel
        incident={selectedIncidentDetails ?? null}
        onClose={() => {
          if (onIncidentClose) onIncidentClose();
        }}
      />

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg z-10">
        <h3 className="text-sm font-semibold mb-2">Incident Types</h3>
        <div className="space-y-1">
          {[
            { label: 'Violent Crime', color: '#ef4444' },
            { label: 'Property Crime', color: '#f97316' },
            { label: 'Drug-Related', color: '#8b5cf6' },
            { label: 'Cyber Crime', color: '#3b82f6' },
            { label: 'Financial Crime', color: '#14b8a6' },
            { label: 'Political', color: '#6366f1' },
            { label: 'Accident/Hazard', color: '#f59e0b' },
            { label: 'Community Issue', color: '#10b981' },
            { label: 'Cultural/Social', color: '#ec4899' },
            { label: 'Other', color: '#6b7280' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Function to get different colors for different crime types
function getColorByType(type: string): { color: string, category: string } {
  const typeClean = type.toLowerCase().trim();
  
  // Violent crimes - Red
  if (['murder', 'homicide', 'assault', 'kidnapping', 'sexual harassment', 
       'child abuse', 'domestic violence', 'custodial deaths', 'mob violence'].includes(typeClean)) {
    return { color: '#ef4444', category: 'Violent Crime' };
  }
  
  // Property crimes - Orange
  if (['theft', 'burglary', 'housebreaking', 'smuggling', 
       'property / real estate frauds', 'vehicle-related frauds'].includes(typeClean)) {
    return { color: '#f97316', category: 'Property Crime' };
  }
  
  // Drug-related - Purple
  if (['drug trafficking', 'drug possession', 'drug distribution', 
       'narcotics', 'drug seizure'].includes(typeClean)) {
    return { color: '#8b5cf6', category: 'Drug-Related' };
  }
  
  // Cyber crimes - Blue
  if (['cyberbullying', 'online fraud', 'cyber attack', 
       'mobile sim card frauds', 'document & identity frauds'].includes(typeClean)) {
    return { color: '#3b82f6', category: 'Cyber Crime' };
  }
  
  // Financial crimes - Teal
  if (['corruption', 'money laundering', 'racketeering', 'extortion', 'syndicate',
       'investment frauds', 'financial / banking frauds', 'business / corporate frauds',
       'education / degree frauds', 'immigration / visa frauds',
       'employment / job-related frauds', 'matrimonial / relationship frauds',
       'cheating in overseas job offers', 'misuse of funds'].includes(typeClean)) {
    return { color: '#14b8a6', category: 'Financial Crime' };
  }
  
  // Political issues - Indigo
  if (['protest', 'religious conflict', 'court cases', 'arrest', 'abuse of power',
       'cabinet reshuffle', 'national security policy', 'state vs. central government disputes',
       'political party', 'policy announcement', 'election campaign', 'party switching'].includes(typeClean)) {
    return { color: '#6366f1', category: 'Political' };
  }
  
  // Accidents/Hazards - Yellow
  if (['accident', 'fire', 'explosion', 'natural disaster', 'infrastructure failure',
       'transportation accident', 'industrial accident'].includes(typeClean)) {
    return { color: '#f59e0b', category: 'Accident/Hazard' };
  }
  
  // Community issues - Green
  if (['community development', 'public health', 'education', 'environmental issue',
       'social welfare', 'public safety', 'infrastructure'].includes(typeClean)) {
    return { color: '#10b981', category: 'Community Issue' };
  }
  
  // Cultural/Social - Pink
  if (['cultural event', 'social issue', 'entertainment', 'sports', 'arts',
       'festival', 'celebration', 'social movement'].includes(typeClean)) {
    return { color: '#ec4899', category: 'Cultural/Social' };
  }
  
  // Default - Gray
  return { color: '#6b7280', category: 'Other' };
} 