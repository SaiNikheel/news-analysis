-- Create incidents table FIRST
CREATE TABLE incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  published_date TIMESTAMP WITH TIME ZONE NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  news_type TEXT,
  involved_persons_role TEXT,
  location TEXT,
  keywords TEXT[],
  impact TEXT,
  source TEXT,
  date_time TEXT,
  tone TEXT,
  quotes TEXT,
  public_reaction TEXT,
  past_events TEXT,
  future_implications TEXT,
  main_subject TEXT,
  day_of_week TEXT,
  images_and_media TEXT,
  
  -- Real-time specific fields
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'investigating')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_officer TEXT,
  source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual', 'api', 'rss', 'scraper', 'public_report', 'migration')),
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'false_alarm')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create data sources table
CREATE TABLE data_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('api', 'rss', 'scraper', 'manual')),
  url TEXT,
  api_key TEXT,
  last_sync TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  sync_interval INTEGER DEFAULT 15, -- minutes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_incidents_published_date ON incidents(published_date DESC);
CREATE INDEX idx_incidents_news_type ON incidents(news_type);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_location ON incidents(latitude, longitude);
CREATE INDEX idx_incidents_created_at ON incidents(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update timestamps
CREATE TRIGGER update_incidents_updated_at 
    BEFORE UPDATE ON incidents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Analytics function
CREATE OR REPLACE FUNCTION get_incident_analytics()
RETURNS TABLE (
  total_incidents BIGINT,
  active_incidents BIGINT,
  incidents_today BIGINT,
  top_crime_types JSON,
  monthly_trend JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM incidents) as total_incidents,
    (SELECT COUNT(*) FROM incidents WHERE status = 'active') as active_incidents,
    (SELECT COUNT(*) FROM incidents WHERE DATE(published_date) = CURRENT_DATE) as incidents_today,
    (SELECT json_agg(json_build_object('type', news_type, 'count', cnt))
     FROM (SELECT news_type, COUNT(*) as cnt 
           FROM incidents 
           GROUP BY news_type 
           ORDER BY cnt DESC 
           LIMIT 10) t) as top_crime_types,
    (SELECT json_agg(json_build_object('month', month, 'count', cnt))
     FROM (SELECT TO_CHAR(published_date, 'YYYY-MM') as month, COUNT(*) as cnt
           FROM incidents 
           WHERE published_date >= CURRENT_DATE - INTERVAL '12 months'
           GROUP BY month 
           ORDER BY month) t) as monthly_trend;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read incidents
CREATE POLICY "Allow authenticated users to read incidents" ON incidents
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert incidents
CREATE POLICY "Allow authenticated users to insert incidents" ON incidents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update incidents
CREATE POLICY "Allow authenticated users to update incidents" ON incidents
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Enable real-time subscriptions AFTER tables are created
alter publication supabase_realtime add table incidents; 