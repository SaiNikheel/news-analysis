'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { IncidentMapMarker, IncidentDetails } from '@/lib/types';

const MapWithNoSSR = dynamic(
  () => import('@/components/map/LeafletMap'),
  { ssr: false }
);

interface MapPreviewProps {
  // No props needed - component fetches its own data
}

const mapContainerStyle = {
  width: '100%',
  height: '300px',
};

const defaultCenter: [number, number] = [18.1124, 79.0193]; // Default center for Telangana

export default function MapPreview({}: MapPreviewProps) {
  const [incidents, setIncidents] = useState<IncidentMapMarker[]>([]);
  const [center, setCenter] = useState<[number, number]>(defaultCenter);
  const [loading, setLoading] = useState(true);
  const [selectedIncidentDetails, setSelectedIncidentDetails] = useState<IncidentDetails | null>(null);

  useEffect(() => {
    const fetchMapData = async () => {
      try {
        setLoading(true);
        // Fetch recent incidents for map preview (limit to 100 for performance)
        const response = await fetch('/api/incidents/map-markers?page=1&pageSize=100');
        const data = await response.json();
        
        if (data.incidents && data.incidents.length > 0) {
          setIncidents(data.incidents);
          
          // Calculate center based on incidents
          const avgLat = data.incidents.reduce((sum: number, inc: IncidentMapMarker) => sum + (inc.latitude || 0), 0) / data.incidents.length;
          const avgLng = data.incidents.reduce((sum: number, inc: IncidentMapMarker) => sum + (inc.longitude || 0), 0) / data.incidents.length;
          
          if (!isNaN(avgLat) && !isNaN(avgLng)) {
            setCenter([avgLat, avgLng]);
          }
        }
      } catch (error) {
        console.error('Error fetching map data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();
  }, []);

  const handleIncidentClick = async (incidentId: string) => {
    try {
      const response = await fetch(`/api/incidents/${incidentId}`);
      if (response.ok) {
        const details = await response.json();
        setSelectedIncidentDetails(details);
      } else {
        console.error('Failed to fetch incident details');
      }
    } catch (error) {
      console.error('Error fetching incident details:', error);
    }
  };

  const handleIncidentClose = () => {
    setSelectedIncidentDetails(null);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Incidents Map</h2>
        <div className="rounded-lg overflow-hidden">
          {loading ? (
            <div className="h-[300px] bg-gray-100 flex items-center justify-center">
              <div className="text-gray-500">Loading map...</div>
            </div>
          ) : (
            <MapWithNoSSR
              center={center}
              incidents={incidents}
              style={mapContainerStyle}
              zoom={8}
              onIncidentClick={handleIncidentClick}
            />
          )}
        </div>
      </div>
      
      {/* Incident Details Modal */}
      {selectedIncidentDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">Incident Details</h2>
                <button
                  onClick={handleIncidentClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {selectedIncidentDetails.title}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {selectedIncidentDetails.newsType}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {new Date(selectedIncidentDetails.publishedDate).toLocaleDateString()}
                    </span>
                    {selectedIncidentDetails.location && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        📍 {selectedIncidentDetails.location}
                      </span>
                    )}
                  </div>
                </div>
                
                {selectedIncidentDetails.description && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {selectedIncidentDetails.description}
                    </p>
                  </div>
                )}
                
                {selectedIncidentDetails.involvedPersonsRole && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Involved Persons Role</h4>
                    <p className="text-gray-700 text-sm">
                      {selectedIncidentDetails.involvedPersonsRole}
                    </p>
                  </div>
                )}
                
                {selectedIncidentDetails.impact && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Impact</h4>
                    <p className="text-gray-700 text-sm">
                      {selectedIncidentDetails.impact}
                    </p>
                  </div>
                )}
                
                {selectedIncidentDetails.source && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Source</h4>
                    <p className="text-gray-700 text-sm">
                      {selectedIncidentDetails.source}
                    </p>
                  </div>
                )}
                
                {selectedIncidentDetails.sourceUrl && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Source URL</h4>
                    <a
                      href={selectedIncidentDetails.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm break-all"
                    >
                      {selectedIncidentDetails.sourceUrl}
                    </a>
                  </div>
                )}
                
                {selectedIncidentDetails.keywords && selectedIncidentDetails.keywords.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Keywords</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedIncidentDetails.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedIncidentDetails.quotes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Quotes</h4>
                    <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700 text-sm">
                      {selectedIncidentDetails.quotes}
                    </blockquote>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedIncidentDetails.tone && (
                    <div>
                      <span className="font-medium text-gray-900">Tone:</span>
                      <span className="ml-2 text-gray-700">{selectedIncidentDetails.tone}</span>
                    </div>
                  )}
                  {selectedIncidentDetails.category && (
                    <div>
                      <span className="font-medium text-gray-900">Category:</span>
                      <span className="ml-2 text-gray-700">{selectedIncidentDetails.category}</span>
                    </div>
                  )}
                  {selectedIncidentDetails.dayOfWeek && (
                    <div>
                      <span className="font-medium text-gray-900">Day:</span>
                      <span className="ml-2 text-gray-700">{selectedIncidentDetails.dayOfWeek}</span>
                    </div>
                  )}
                  {selectedIncidentDetails.date_time && (
                    <div>
                      <span className="font-medium text-gray-900">Date/Time:</span>
                      <span className="ml-2 text-gray-700">{selectedIncidentDetails.date_time}</span>
                    </div>
                  )}
                </div>
                
                {selectedIncidentDetails.publicReaction && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Public Reaction</h4>
                    <p className="text-gray-700 text-sm">
                      {selectedIncidentDetails.publicReaction}
                    </p>
                  </div>
                )}
                
                {selectedIncidentDetails.futureImplications && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Future Implications</h4>
                    <p className="text-gray-700 text-sm">
                      {selectedIncidentDetails.futureImplications}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleIncidentClose}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 