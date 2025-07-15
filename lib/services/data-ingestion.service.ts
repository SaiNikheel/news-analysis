import { supabase } from '@/lib/supabase';
import { LiveIncident } from './supabase-data.service';

export interface DataSource {
  id: string;
  name: string;
  type: 'api' | 'rss' | 'scraper' | 'manual';
  url?: string;
  api_key?: string;
  last_sync?: string;
  status: 'active' | 'inactive' | 'error';
  sync_interval: number;
  created_at: string;
}

export class DataIngestionService {
  // RSS Feed Parser
  async parseRSSFeed(source: DataSource): Promise<number> {
    try {
      if (!source.url) {
        throw new Error('RSS source URL is required');
      }

      console.log(`📡 Fetching RSS feed: ${source.name}`);
      
      // Fetch RSS feed
      const response = await fetch(source.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch RSS feed: ${response.statusText}`);
      }
      
      const xmlText = await response.text();
      const incidents = await this.parseRSSXML(xmlText, source);
      
      if (incidents.length > 0) {
        await this.batchInsertIncidents(incidents);
        console.log(`✅ RSS feed processed: ${incidents.length} incidents`);
      }
      
      // Update last sync time
      await this.updateDataSourceSync(source.id);
      
      return incidents.length;
    } catch (error) {
      console.error(`❌ Error parsing RSS feed ${source.name}:`, error);
      await this.updateDataSourceStatus(source.id, 'error');
      throw error;
    }
  }

  // API Data Fetcher
  async fetchFromAPI(source: DataSource): Promise<number> {
    try {
      if (!source.url) {
        throw new Error('API source URL is required');
      }

      console.log(`🔌 Fetching API data: ${source.name}`);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (source.api_key) {
        headers['Authorization'] = `Bearer ${source.api_key}`;
      }
      
      const response = await fetch(source.url, { headers });
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      const incidents = this.transformAPIData(data, source);
      
      if (incidents.length > 0) {
        await this.batchInsertIncidents(incidents);
        console.log(`✅ API data processed: ${incidents.length} incidents`);
      }
      
      // Update last sync time
      await this.updateDataSourceSync(source.id);
      
      return incidents.length;
    } catch (error) {
      console.error(`❌ Error fetching from API ${source.name}:`, error);
      await this.updateDataSourceStatus(source.id, 'error');
      throw error;
    }
  }

  // Manual Data Entry
  async addManualIncident(incidentData: {
    title: string;
    description: string;
    published_date: string;
    latitude: number;
    longitude: number;
    news_type: string;
    location: string;
    keywords?: string[];
    impact?: string;
    source?: string;
    tone?: string;
    quotes?: string;
    public_reaction?: string;
    past_events?: string;
    future_implications?: string;
    main_subject?: string;
    day_of_week?: string;
    images_and_media?: string;
  }): Promise<LiveIncident> {
    const incident = {
      ...incidentData,
      involved_persons_role: 'Unknown',
      date_time: incidentData.published_date,
      status: 'active' as const,
      priority: this.calculatePriority(incidentData.news_type),
      source_type: 'manual' as const,
      verification_status: 'pending' as const
    };

    const { data, error } = await supabase
      .from('incidents')
      .insert([incident])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  // Get all active data sources
  async getActiveDataSources(): Promise<DataSource[]> {
    const { data, error } = await supabase
      .from('data_sources')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  // Add new data source
  async addDataSource(source: Omit<DataSource, 'id' | 'created_at'>): Promise<DataSource> {
    const { data, error } = await supabase
      .from('data_sources')
      .insert([source])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  // Update data source sync time
  private async updateDataSourceSync(sourceId: string): Promise<void> {
    await supabase
      .from('data_sources')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', sourceId);
  }

  // Update data source status
  private async updateDataSourceStatus(sourceId: string, status: 'active' | 'inactive' | 'error'): Promise<void> {
    await supabase
      .from('data_sources')
      .update({ status })
      .eq('id', sourceId);
  }

  // Batch insert incidents
  private async batchInsertIncidents(incidents: Omit<LiveIncident, 'id' | 'created_at' | 'updated_at' | 'last_updated'>[]): Promise<void> {
    const batchSize = 1000;
    
    for (let i = 0; i < incidents.length; i += batchSize) {
      const batch = incidents.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('incidents')
        .insert(batch);
      
      if (error) {
        console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
        throw error;
      }
    }
  }

  // Parse RSS XML
  private async parseRSSXML(xmlText: string, source: DataSource): Promise<Omit<LiveIncident, 'id' | 'created_at' | 'updated_at' | 'last_updated'>[]> {
    const incidents: Omit<LiveIncident, 'id' | 'created_at' | 'updated_at' | 'last_updated'>[] = [];
    
    // Simple XML parsing (you might want to use a proper XML parser)
    const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/g);
    
    if (itemMatches) {
      for (const item of itemMatches) {
        try {
          const title = this.extractXMLValue(item, 'title');
          const description = this.extractXMLValue(item, 'description');
          const pubDate = this.extractXMLValue(item, 'pubDate');
          const link = this.extractXMLValue(item, 'link');
          
          if (title && description) {
            const incident = {
              title: this.cleanHTML(title),
              description: this.cleanHTML(description),
              published_date: new Date(pubDate || Date.now()).toISOString(),
              latitude: 18.1124 + (Math.random() * 1.5 - 0.75), // Default coordinates
              longitude: 79.0193 + (Math.random() * 1.5 - 0.75),
              news_type: 'rss_feed',
              involved_persons_role: 'Unknown',
              location: 'Unknown Location',
              keywords: this.extractKeywords(title + ' ' + description),
              impact: '',
              source: source.name,
              date_time: pubDate || new Date().toISOString(),
              tone: 'neutral',
              quotes: '',
              public_reaction: '',
              past_events: '',
              future_implications: '',
              main_subject: title,
              day_of_week: new Date(pubDate || Date.now()).toLocaleDateString('en-US', { weekday: 'long' }),
              images_and_media: link || '',
              status: 'active' as const,
              priority: this.calculatePriority(title),
              source_type: 'rss' as const,
              verification_status: 'pending' as const
            };
            
            incidents.push(incident);
          }
        } catch (error) {
          console.warn('Error parsing RSS item:', error);
        }
      }
    }
    
    return incidents;
  }

  // Transform API data
  private transformAPIData(data: any, source: DataSource): Omit<LiveIncident, 'id' | 'created_at' | 'updated_at' | 'last_updated'>[] {
    const incidents: Omit<LiveIncident, 'id' | 'created_at' | 'updated_at' | 'last_updated'>[] = [];
    
    // Handle different API response formats
    const items = Array.isArray(data) ? data : data.items || data.results || data.data || [];
    
    for (const item of items) {
      try {
        const incident = {
          title: item.title || item.headline || item.name || 'No Title',
          description: item.description || item.summary || item.content || 'No Description',
          published_date: new Date(item.published_date || item.date || item.created_at || Date.now()).toISOString(),
          latitude: item.latitude || 18.1124 + (Math.random() * 1.5 - 0.75),
          longitude: item.longitude || 79.0193 + (Math.random() * 1.5 - 0.75),
          news_type: item.news_type || item.type || item.category || 'api_feed',
          involved_persons_role: item.involved_persons_role || 'Unknown',
          location: item.location || item.place || 'Unknown Location',
          keywords: item.keywords || this.extractKeywords(item.title + ' ' + item.description),
          impact: item.impact || '',
          source: source.name,
          date_time: item.date_time || item.published_date || new Date().toISOString(),
          tone: item.tone || 'neutral',
          quotes: item.quotes || '',
          public_reaction: item.public_reaction || '',
          past_events: item.past_events || '',
          future_implications: item.future_implications || '',
          main_subject: item.main_subject || item.title || '',
          day_of_week: new Date(item.published_date || Date.now()).toLocaleDateString('en-US', { weekday: 'long' }),
          images_and_media: item.images_and_media || item.image || '',
          status: 'active' as const,
          priority: this.calculatePriority(item.news_type || item.title),
          source_type: 'api' as const,
          verification_status: 'pending' as const
        };
        
        incidents.push(incident);
      } catch (error) {
        console.warn('Error transforming API item:', error);
      }
    }
    
    return incidents;
  }

  // Calculate priority based on content
  private calculatePriority(content: string): 'low' | 'medium' | 'high' | 'critical' {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('murder') || lowerContent.includes('homicide') || lowerContent.includes('death')) {
      return 'critical';
    }
    if (lowerContent.includes('assault') || lowerContent.includes('robbery') || lowerContent.includes('attack')) {
      return 'high';
    }
    if (lowerContent.includes('theft') || lowerContent.includes('burglary') || lowerContent.includes('stolen')) {
      return 'medium';
    }
    return 'low';
  }

  // Extract keywords from text
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 10);
    
    return Array.from(new Set(words));
  }

  // Extract value from XML
  private extractXMLValue(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  // Clean HTML tags
  private cleanHTML(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }
} 