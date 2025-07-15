import { supabase } from '@/lib/supabase';
import { CrimeIncident, DashboardFilters } from '@/lib/types';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface LiveIncident {
  id: string;
  title: string;
  description: string;
  published_date: string;
  latitude: number;
  longitude: number;
  news_type: string;
  involved_persons_role: string;
  location: string;
  keywords?: string[];
  impact?: string;
  source?: string;
  source_url?: string;  // Add source URL field
  date_time?: string;
  tone?: string;
  quotes?: string;
  public_reaction?: string;
  past_events?: string;
  future_implications?: string;
  main_subject?: string;
  day_of_week?: string;
  images_and_media?: string;
  
  // Real-time specific fields
  status: 'active' | 'resolved' | 'investigating';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_officer?: string;
  source_type: 'manual' | 'api' | 'rss' | 'scraper' | 'public_report' | 'migration';
  verification_status: 'pending' | 'verified' | 'false_alarm';
  
  created_at: string;
  updated_at: string;
  last_updated: string;
}

export class SupabaseDataService {
  // Real-time subscription to incidents
  subscribeToIncidents(
    filters: DashboardFilters,
    callback: (incidents: LiveIncident[]) => void
  ): RealtimeChannel {
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
          // Fetch updated data
          try {
            const result = await this.getIncidents(filters);
            callback(result.incidents);
          } catch (error) {
            console.error('Error fetching updated incidents:', error);
          }
        }
      )
      .subscribe();

    return channel;
  }

  // Get incidents with pagination
  async getIncidents(
    filters?: DashboardFilters,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ incidents: LiveIncident[]; total: number; hasMore: boolean }> {
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

    const { data, error, count } = await query
      .order('published_date', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Supabase query error:', error);
      throw new Error(error.message);
    }

    return {
      incidents: data || [],
      total: count || 0,
      hasMore: (count || 0) > to + 1
    };
  }

  // Add new incident
  async addIncident(incident: Omit<LiveIncident, 'id' | 'created_at' | 'updated_at' | 'last_updated'>) {
    const { data, error } = await supabase
      .from('incidents')
      .insert([incident])
      .select()
      .single();

    if (error) {
      console.error('Error adding incident:', error);
      throw new Error(error.message);
    }

    return data;
  }

  // Update incident
  async updateIncident(id: string, updates: Partial<LiveIncident>) {
    const { data, error } = await supabase
      .from('incidents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating incident:', error);
      throw new Error(error.message);
    }

    return data;
  }

  // Batch insert incidents
  async batchInsertIncidents(incidents: Omit<LiveIncident, 'id' | 'created_at' | 'updated_at' | 'last_updated'>[]) {
    const { data, error } = await supabase
      .from('incidents')
      .insert(incidents)
      .select();

    if (error) {
      console.error('Error batch inserting incidents:', error);
      throw new Error(error.message);
    }

    return data;
  }

  // Get analytics data
  async getAnalytics() {
    const { data, error } = await supabase
      .rpc('get_incident_analytics');

    if (error) {
      console.error('Error fetching analytics:', error);
      throw new Error(error.message);
    }

    return data;
  }

  // Get incidents by location (for map)
  async getIncidentsByLocation(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .gte('latitude', bounds.south)
      .lte('latitude', bounds.north)
      .gte('longitude', bounds.west)
      .lte('longitude', bounds.east)
      .order('published_date', { ascending: false });

    if (error) {
      console.error('Error fetching incidents by location:', error);
      throw new Error(error.message);
    }

    return data || [];
  }

  // Search incidents
  async searchIncidents(searchTerm: string, filters?: DashboardFilters) {
    let query = supabase
      .from('incidents')
      .select('*')
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`);

    // Apply additional filters
    if (filters?.dateRange) {
      query = query
        .gte('published_date', filters.dateRange[0].toISOString())
        .lte('published_date', filters.dateRange[1].toISOString());
    }

    if (filters?.crimeType) {
      query = query.eq('news_type', filters.crimeType);
    }

    const { data, error } = await query
      .order('published_date', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error searching incidents:', error);
      throw new Error(error.message);
    }

    return data || [];
  }

  // Get data sources
  async getDataSources() {
    const { data, error } = await supabase
      .from('data_sources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching data sources:', error);
      throw new Error(error.message);
    }

    return data || [];
  }

  // Add data source
  async addDataSource(source: {
    name: string;
    type: 'api' | 'rss' | 'scraper' | 'manual';
    url?: string;
    api_key?: string;
    sync_interval?: number;
  }) {
    const { data, error } = await supabase
      .from('data_sources')
      .insert([source])
      .select()
      .single();

    if (error) {
      console.error('Error adding data source:', error);
      throw new Error(error.message);
    }

    return data;
  }
} 