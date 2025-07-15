'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IncidentSummary, DashboardFilters, InsightSummary } from '@/lib/types';
import { LightBulbIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface InsightPanelProps {
  incidents: IncidentSummary[];
  filters: DashboardFilters;
}

export default function InsightPanel({ incidents, filters }: InsightPanelProps) {
  const [insights, setInsights] = useState<InsightSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const generateInsights = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/insights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            incidents,
            filters,
          }),
        });
        const data = await response.json();
        setInsights(data);
      } catch (error) {
        console.error('Error generating insights:', error);
      }
      setLoading(false);
    };

    if (incidents.length > 0) {
      generateInsights();
    }
  }, [incidents, filters]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <LightBulbIcon className="h-6 w-6 text-yellow-500 mr-2" />
          AI Insights
        </h2>
        <button
          onClick={() => setInsights([])}
          className="text-gray-400 hover:text-gray-600"
          title="Refresh insights"
        >
          <ArrowPathIcon className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="space-y-3 mt-4">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {insights.map((insight, index) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border-b border-gray-200 pb-4 last:border-b-0"
            >
              <h3 className="font-medium text-gray-900 mb-2">{insight.title}</h3>
              <p className="text-gray-600 text-sm">{insight.description}</p>
              {insight.data && (
                <div className="mt-2 text-sm text-gray-500">
                  {/* Render additional insight data based on type */}
                  {insight.type === 'hotspot' && (
                    <ul className="list-disc list-inside">
                      {insight.data.locations.map((loc: string, i: number) => (
                        <li key={i}>{loc}</li>
                      ))}
                    </ul>
                  )}
                  {insight.type === 'trend' && (
                    <p className="italic">{insight.data.trendDescription}</p>
                  )}
                </div>
              )}
            </motion.div>
          ))}

          {insights.length === 0 && !loading && (
            <div className="text-center text-gray-500">
              <p>No insights available for the current selection.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 