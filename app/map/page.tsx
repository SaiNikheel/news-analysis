'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { IncidentMapMarker, IncidentDetails, DashboardFilters } from '@/lib/types';
import FilterPanel from '@/components/dashboard/FilterPanel';
import PeopleIncidentSearchBar from '../components/map/SearchBar';
import LocationSearchBar from '../components/map/LocationSearchBar';
import 'leaflet/dist/leaflet.css';

// Default center coordinates for Telangana
const DEFAULT_CENTER: [number, number] = [18.1124, 79.0193];
const DEFAULT_ZOOM = 7;

const MapWithNoSSR = dynamic(
  () => import('@/components/map/LeafletMap'),
  { ssr: false }
);

export default function MapPage() {
  const { data: session } = useSession();
  const [incidents, setIncidents] = useState<IncidentMapMarker[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<IncidentMapMarker[]>([]);
  const [selectedIncidentDetails, setSelectedIncidentDetails] = useState<IncidentDetails | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()],
  });
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'people' | 'location'>('people');

  // Helper function to calculate distance between two points in kilometers
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Comprehensive filtering function
  const applyFilters = (incidents: IncidentMapMarker[], searchTerm: string, filters: DashboardFilters): IncidentMapMarker[] => {
    return incidents.filter((incident) => {
      // Search term filter
      if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase();
        const matchesSearch = 
          incident.title?.toLowerCase().includes(searchTermLower) ||
          incident.location?.toLowerCase().includes(searchTermLower) ||
          incident.newsType?.toLowerCase().includes(searchTermLower);
        
        if (!matchesSearch) return false;
      }

      // Date range filter
      if (filters.dateRange && filters.dateRange.length === 2) {
        const incidentDate = new Date(incident.publishedDate);
        const startDate = filters.dateRange[0];
        const endDate = filters.dateRange[1];
        
        if (incidentDate < startDate || incidentDate > endDate) {
          return false;
        }
      }

      // Crime type filter
      if (filters.crimeType && filters.crimeType !== '') {
        if (incident.newsType !== filters.crimeType) {
          return false;
        }
      }

      // Location radius filter
      if (filters.location && filters.location.radius > 0) {
        const distance = calculateDistance(
          incident.latitude,
          incident.longitude,
          filters.location.lat,
          filters.location.lng
        );
        
        if (distance > filters.location.radius) {
          return false;
        }
      }

      return true;
    });
  };

  // Update filtered incidents whenever incidents, search term, or filters change
  useEffect(() => {
    const filtered = applyFilters(incidents, currentSearchTerm, filters);
    setFilteredIncidents(filtered);
    
    // Update map center based on filtered results
    if (filtered.length > 0 && (currentSearchTerm || filters.crimeType || filters.location?.radius)) {
      const avgLat = filtered.reduce((sum, inc) => sum + (inc.latitude || 0), 0) / filtered.length;
      const avgLng = filtered.reduce((sum, inc) => sum + (inc.longitude || 0), 0) / filtered.length;
      if (!isNaN(avgLat) && !isNaN(avgLng) && avgLat !== 0 && avgLng !== 0) {
        setCenter([avgLat, avgLng]);
      }
    }
  }, [incidents, currentSearchTerm, filters]);

  useEffect(() => {
    const fetchMapMarkers = async () => {
      setLoading(true);
      let allIncidents: IncidentMapMarker[] = [];
      let page = 1;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const response = await fetch(`/api/incidents/map-markers?page=${page}&pageSize=${pageSize}`);
        const data = await response.json();
        if (data.incidents && data.incidents.length > 0) {
          allIncidents = allIncidents.concat(data.incidents);
          hasMore = data.hasMore;
          page++;
        } else {
          hasMore = false;
        }
      }
      setIncidents(allIncidents);
      
      // Set initial center based on all incidents
      if (allIncidents.length > 0 && center === DEFAULT_CENTER) {
        const avgLat = allIncidents.reduce((sum: number, inc: IncidentMapMarker) => sum + (inc.latitude || 0), 0) / allIncidents.length;
        const avgLng = allIncidents.reduce((sum: number, inc: IncidentMapMarker) => sum + (inc.longitude || 0), 0) / allIncidents.length;
        if (!isNaN(avgLat) && !isNaN(avgLng)) {
          setCenter([avgLat, avgLng]);
        }
      }
      setLoading(false);
    };
    fetchMapMarkers();
  }, []);

  // Function to fetch detailed incident data when marker is clicked
  const handleIncidentClick = async (incidentId: string) => {
    try {
      const response = await fetch(`/api/incidents/${incidentId}`);
      if (response.ok) {
        const details = await response.json();
        setSelectedIncidentDetails(details);
        setIncidentOpen(true);
      } else {
        console.error('Failed to fetch incident details');
      }
    } catch (error) {
      console.error('Error fetching incident details:', error);
    }
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    console.log("Location selected:", lat, lng);
    setCenter([lat, lng]);
    
    // Update location filter to center on selected location with default radius
    const updatedFilters = {
      ...filters,
      location: {
        lat,
        lng,
        radius: filters.location?.radius || 10 // Default 10km radius
      }
    };
    setFilters(updatedFilters);
  };

  const handleSearchSubmit = (term: string) => {
    console.log('MapPage handleSearchSubmit called, term:', term);
    setCurrentSearchTerm(term);
  };

  const handleFilterChange = (newFilters: DashboardFilters) => {
    setFilters(newFilters);
  };

  const handleIncidentClose = () => {
    setSelectedIncidentDetails(null);
    setIncidentOpen(false);
  };

  return (
    <div className="h-[calc(100vh-64px)] relative bg-gray-100">
      {/* Controls Container */}
      {!incidentOpen && (
        <div className="absolute inset-x-0 top-0 z-20 bg-white/80 backdrop-blur-sm shadow-md p-4">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Tab Buttons */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('people')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'people' 
                    ? 'border-b-2 border-indigo-500 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                People / Incidents
              </button>
              <button
                onClick={() => setActiveTab('location')}
                className={`ml-4 px-4 py-2 text-sm font-medium ${
                  activeTab === 'location' 
                    ? 'border-b-2 border-indigo-500 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Location
              </button>
            </div>

            {/* Tab Content */}
            <div className="mt-2">
              {activeTab === 'people' && (
                 <PeopleIncidentSearchBar onSearchSubmit={handleSearchSubmit} />
              )}
              {activeTab === 'location' && (
                 <LocationSearchBar onLocationSelect={handleLocationSelect} />
              )}
            </div>

            <FilterPanel filters={filters} onFilterChange={handleFilterChange} />
            
            {/* Filter Status Display */}
            {(currentSearchTerm || filters.crimeType || filters.location?.radius) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-blue-800">
                    <span className="font-medium">Active filters:</span>
                    {currentSearchTerm && <span className="ml-2 bg-blue-100 px-2 py-1 rounded">Search: "{currentSearchTerm}"</span>}
                    {filters.crimeType && <span className="ml-2 bg-blue-100 px-2 py-1 rounded">Type: {filters.crimeType}</span>}
                    {filters.location?.radius && <span className="ml-2 bg-blue-100 px-2 py-1 rounded">Radius: {filters.location.radius}km</span>}
                    <span className="ml-2 text-blue-600">({filteredIncidents.length} incidents shown)</span>
                  </div>
                  <button
                    onClick={() => {
                      setCurrentSearchTerm('');
                      setFilters({
                        dateRange: [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()],
                      });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className={`h-full transition-all duration-300 ${incidentOpen ? 'pt-4' : 'pt-[calc(4rem+1rem+2.5rem+2.5rem+3rem)]'}`}>
        {loading ? (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
            <div className="text-gray-500">Loading map data...</div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 bg-red-50 flex items-center justify-center">
            <div className="text-red-600">{error}</div>
          </div>
        ) : (
          <MapWithNoSSR
            center={center}
            incidents={filteredIncidents}
            style={{ height: '100%', width: '100%' }}
            zoom={DEFAULT_ZOOM}
            onIncidentClick={handleIncidentClick}
          />
        )}
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
    </div>
  );
} 