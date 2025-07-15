import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardFilters } from '@/lib/types';
import { LiveIncident } from '@/lib/services/supabase-data.service';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseSupabaseIncidentsOptions {
  filters?: DashboardFilters;
  pageSize?: number;
  enableRealtime?: boolean;
}

interface UseSupabaseIncidentsReturn {
  incidents: LiveIncident[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  currentPage: number;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setFilters: (filters: DashboardFilters) => void;
}

export function useSupabaseIncidents(options: UseSupabaseIncidentsOptions = {}): UseSupabaseIncidentsReturn {
  const { filters, pageSize = 50, enableRealtime = true } = options;
  
  const [incidents, setIncidents] = useState<LiveIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [subscription, setSubscription] = useState<RealtimeChannel | null>(null);

  const fetchIncidents = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('incidents')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters?.dateRange) {
        query = query
          .gte('published_date', filters.dateRange[0].toISOString())
          .lte('published_date', filters.dateRange[1].toISOString());
      }

      if (filters?.crimeType) {
        query = query.eq('news_type', filters.crimeType);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error: queryError, count } = await query
        .order('published_date', { ascending: false })
        .range(from, to);

      if (queryError) {
        throw new Error(queryError.message);
      }

      const newIncidents = data || [];
      
      if (append) {
        setIncidents(prev => [...prev, ...newIncidents]);
      } else {
        setIncidents(newIncidents);
      }
      
      setTotal(count || 0);
      setHasMore((count || 0) > to + 1);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch incidents');
      console.error('Error fetching incidents:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, pageSize]);

  // Set up real-time subscription
  useEffect(() => {
    if (!enableRealtime) return;

    const channel = supabase
      .channel('incidents_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incidents'
        },
        async (payload: any) => {
          console.log('Real-time update:', payload);
          // Refresh data when changes occur
          await fetchIncidents(1, false);
        }
      )
      .subscribe();

    setSubscription(channel);

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [enableRealtime, fetchIncidents]);

  // Fetch initial data
  useEffect(() => {
    fetchIncidents(1, false);
  }, [fetchIncidents]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchIncidents(currentPage + 1, true);
  }, [hasMore, loading, currentPage, fetchIncidents]);

  const refresh = useCallback(async () => {
    await fetchIncidents(1, false);
  }, [fetchIncidents]);

  const setFilters = useCallback((newFilters: DashboardFilters) => {
    // Reset to page 1 when filters change
    setCurrentPage(1);
    setIncidents([]);
    // The useEffect will trigger a new fetch with the new filters
  }, []);

  return {
    incidents,
    loading,
    error,
    total,
    hasMore,
    currentPage,
    loadMore,
    refresh,
    setFilters
  };
} 