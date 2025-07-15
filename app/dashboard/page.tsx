'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { IncidentSummary, DashboardFilters, IncidentDetails } from '@/lib/types';
import OverviewCard from '../components/dashboard/OverviewCard';
import InsightPanel from '../components/dashboard/InsightPanel';
import { useAnalytics } from '@/lib/hooks/useAnalytics';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function DashboardPage() {
  const { data: session } = useSession();
  const { trackEvent } = useAnalytics();
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'week'|'month'|'year'>('month');
  const [filters, setFilters] = useState<DashboardFilters | null>(null);
  const [selectedIncidentDetails, setSelectedIncidentDetails] = useState<IncidentDetails | null>(null);

  useEffect(() => {
    const fetchIncidentSummaries = async () => {
      setLoading(true);
      let allIncidents: IncidentSummary[] = [];
      let page = 1;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const response = await fetch(`/api/incidents/summary?page=${page}&pageSize=${pageSize}`);
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
      setLoading(false);
      console.log('Loaded incident summaries:', allIncidents.length);
    };
    fetchIncidentSummaries();
  }, []);

  // Remove all filtering, just use all incidents
  const recentIncidents = incidents;
  const totalIncidents = incidents.length;
  
  // Filter incidents by selected timeframe
  const getFilteredIncidents = (timeframe: 'week'|'month'|'year') => {
    const now = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return incidents.filter(incident => {
      const incidentDate = new Date(incident.publishedDate);
      return incidentDate >= startDate && incidentDate <= now;
    });
  };
  
  const filteredIncidents = getFilteredIncidents(timeframe);
  const recentIncidentsCount = filteredIncidents.length;
  
  // Calculate rate change (comparing to previous period)
  const getPreviousPeriodCount = (timeframe: 'week'|'month'|'year') => {
    const now = new Date();
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'week':
        endDate.setDate(now.getDate() - 7);
        startDate.setDate(now.getDate() - 14);
        break;
      case 'month':
        endDate.setMonth(now.getMonth() - 1);
        startDate.setMonth(now.getMonth() - 2);
        break;
      case 'year':
        endDate.setFullYear(now.getFullYear() - 1);
        startDate.setFullYear(now.getFullYear() - 2);
        break;
    }
    
    return incidents.filter(incident => {
      const incidentDate = new Date(incident.publishedDate);
      return incidentDate >= startDate && incidentDate <= endDate;
    }).length;
  };
  
  const previousPeriodCount = getPreviousPeriodCount(timeframe);
  const rateChange = previousPeriodCount > 0 
    ? Math.round(((recentIncidentsCount - previousPeriodCount) / previousPeriodCount) * 100)
    : 0;

  // Prepare data for charts
  const incidentsByMonth = filteredIncidents.reduce((acc: Record<string, number>, incident: IncidentSummary) => {
    const month = new Date(incident.publishedDate).toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const crimeTypes = filteredIncidents.reduce((acc: Record<string, number>, incident: IncidentSummary) => {
    acc[incident.newsType] = (acc[incident.newsType] || 0) + 1;
    return acc;
  }, {});

  const top5CrimeTypes = Object.entries(crimeTypes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Group by locations for hotspot analysis
  const locationCounts = filteredIncidents.reduce((acc: Record<string, number>, incident: IncidentSummary) => {
    const locationKey = incident.location || 'Unknown Location';
    acc[locationKey] = (acc[locationKey] || 0) + 1;
    return acc;
  }, {});

  const topLocations = Object.entries(locationCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Count by time of day for temporal analysis
  const timeOfDayCounts = filteredIncidents.reduce((acc: Record<string, number>, incident: IncidentSummary) => {
    let hour = 0;
    try {
      const date = new Date(incident.publishedDate);
      hour = date.getHours();
    } catch (e) {
      // Default to morning if date parsing fails
      hour = 9;
    }

    let timeCategory = 'Unknown';
    if (hour >= 5 && hour < 12) timeCategory = 'Morning (5AM-12PM)';
    else if (hour >= 12 && hour < 17) timeCategory = 'Afternoon (12PM-5PM)';
    else if (hour >= 17 && hour < 21) timeCategory = 'Evening (5PM-9PM)';
    else timeCategory = 'Night (9PM-5AM)';
    
    acc[timeCategory] = (acc[timeCategory] || 0) + 1;
    return acc;
  }, {});

  // Track timeframe changes
  const handleTimeframeChange = (newTimeframe: 'week'|'month'|'year') => {
    setTimeframe(newTimeframe);
    trackEvent('timeframe_change', { timeframe: newTimeframe });
  };

  // Handle incident click to show details
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Data Caution Banner */}
      <div className="bg-yellow-50 border-b border-yellow-100 text-yellow-700 text-xs py-2 px-4 mb-4 flex items-center justify-between" role="alert">
        <div className="flex items-center">
          <svg className="h-4 w-4 text-yellow-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Data has been processed through AI models and may contain minor inconsistencies.</span>
        </div>
        <button className="text-yellow-600 hover:text-yellow-800" onClick={() => document.querySelector('[role="alert"]')?.remove()}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-4">News Analysis Dashboard</h1>
        <div className="flex gap-4 mb-6">
          <button 
            onClick={() => handleTimeframeChange('week')} 
            className={`px-4 py-2 rounded ${timeframe === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Weekly
          </button>
          <button 
            onClick={() => handleTimeframeChange('month')} 
            className={`px-4 py-2 rounded ${timeframe === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => handleTimeframeChange('year')} 
            className={`px-4 py-2 rounded ${timeframe === 'year' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Yearly
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <OverviewCard
          title="Total Incidents"
          value={totalIncidents}
          trend={undefined}
          loading={loading}
        />
        <OverviewCard
          title={`${timeframe === 'week' ? 'This Week' : timeframe === 'month' ? 'This Month' : 'This Year'}`}
          value={recentIncidentsCount}
          trend={rateChange}
          loading={loading}
        />
        <OverviewCard
          title="Hotspot Locations"
          value={topLocations.length}
          loading={loading}
        />
        <OverviewCard
          title="Active News Types"
          value={Object.keys(crimeTypes).length}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <h2 className="text-xl font-semibold mb-4">Incidents Over Time</h2>
          <Line
            data={{
              labels: Object.keys(incidentsByMonth),
              datasets: [{
                label: 'Incidents',
                data: Object.values(incidentsByMonth),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
              }]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      return `Incidents: ${context.raw}`;
                    }
                  }
                }
              }
            }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <h2 className="text-xl font-semibold mb-4">Top News Types</h2>
          <Bar
            data={{
              labels: top5CrimeTypes.map(([type]) => type),
              datasets: [{
                label: 'Incidents',
                data: top5CrimeTypes.map(([, count]) => count),
                backgroundColor: [
                  'rgba(255, 99, 132, 0.6)',   // pink
                  'rgba(54, 162, 235, 0.6)',   // blue
                  'rgba(255, 206, 86, 0.6)',   // yellow
                  'rgba(75, 192, 192, 0.6)',   // teal
                  'rgba(153, 102, 255, 0.6)',  // purple
                ],
              }]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                },
              }
            }}
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <h2 className="text-xl font-semibold mb-4">Crime Hotspots</h2>
          <div className="h-64 overflow-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 text-left">Location</th>
                  <th className="py-2 px-4 text-right">Incidents</th>
                  <th className="py-2 px-4 text-right">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {topLocations.map(([location, count], index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-4">{location}</td>
                    <td className="py-2 px-4 text-right">{count}</td>
                    <td className="py-2 px-4 text-right">
                      {(count / totalIncidents * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <h2 className="text-xl font-semibold mb-4">Time of Day Analysis</h2>
          <div className="h-64 flex items-center justify-center">
            <Pie
              data={{
                labels: Object.keys(timeOfDayCounts),
                datasets: [{
                  data: Object.values(timeOfDayCounts),
                  backgroundColor: [
                    'rgba(255, 206, 86, 0.6)', // Morning - yellow
                    'rgba(75, 192, 192, 0.6)', // Afternoon - teal
                    'rgba(153, 102, 255, 0.6)', // Evening - purple
                    'rgba(54, 162, 235, 0.6)', // Night - blue
                  ],
                  borderWidth: 1,
                }]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        const value = context.raw as number;
                        const total = (context.chart.data.datasets[0].data as number[]).reduce((a, b) => (a as number) + (b as number), 0) as number;
                        const percentage = Math.round((value / total) * 100);
                        return `${context.label}: ${value} (${percentage}%)`;
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </motion.div>
      </div>

      {/* Recent Incidents Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg shadow p-6 mb-8"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Recent Incidents</h2>
          <span className="text-sm text-gray-500">
            Showing {Math.min(filteredIncidents.length, 10)} of {filteredIncidents.length} incidents
          </span>
        </div>
        
        <div className="grid gap-4">
          {filteredIncidents.slice(0, 10).map((incident) => (
            <div
              key={incident.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => handleIncidentClick(incident.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 line-clamp-2 mb-2">
                    {incident.title}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {incident.location || 'Unknown Location'}
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(incident.publishedDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {incident.newsType}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleIncidentClick(incident.id);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredIncidents.length > 10 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Showing first 10 incidents. Use the map page to explore all incidents.
            </p>
          </div>
        )}
      </motion.div>
      
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