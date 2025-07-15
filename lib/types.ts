export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  createdAt: Date;
  lastLogin: Date;
}

export interface CrimeIncident {
  id: string;
  title: string;
  description: string;
  publishedDate: string;
  latitude: number;
  longitude: number;
  newsType: string;
  involvedPersonsRole: string;
  location: string;
  keywords?: string[];
  impact?: string;
  source?: string;
  sourceUrl?: string;  // Add source URL field
  date_time?: string;
  tone?: string;
  quotes?: string;
  category?: string;
  publicReaction?: string;
  pastEvents?: string;
  futureImplications?: string;
  mainSubject?: string;
  dayOfWeek?: string;
  imagesAndMedia?: string;
}

// Lightweight type for map markers
export interface IncidentMapMarker {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  newsType: string;
  location: string;
  publishedDate: string;
}

// Lightweight type for dashboard summary
export interface IncidentSummary {
  id: string;
  title: string;
  publishedDate: string;
  newsType: string;
  location: string;
  dayOfWeek?: string;
}

// Complete details type for individual incident view
export interface IncidentDetails {
  id: string;
  title: string;
  description: string;
  publishedDate: string;
  latitude: number;
  longitude: number;
  newsType: string;
  involvedPersonsRole: string;
  location: string;
  keywords?: string[];
  impact?: string;
  source?: string;
  sourceUrl?: string;
  date_time?: string;
  tone?: string;
  quotes?: string;
  category?: string;
  publicReaction?: string;
  pastEvents?: string;
  futureImplications?: string;
  mainSubject?: string;
  dayOfWeek?: string;
  imagesAndMedia?: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  action: 'search' | 'filter' | 'view';
  details: {
    location?: string;
    filters?: {
      dateRange?: [Date, Date];
      crimeType?: string;
      role?: string;
    };
    tab?: 'dashboard' | 'map';
    duration?: number;
  };
  timestamp: Date;
}

export interface DashboardFilters {
  dateRange: [Date, Date];
  crimeType?: string;
  role?: string;
  status?: 'active' | 'resolved' | 'investigating';
  location?: {
    lat: number;
    lng: number;
    radius: number; // in kilometers
  };
}

export interface InsightSummary {
  id: string;
  type: 'hotspot' | 'trend' | 'anomaly';
  title: string;
  description: string;
  data?: any;
  generatedAt: Date;
  filters?: DashboardFilters;
}

export interface MapViewState {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
  bounds?: {
    ne: { lat: number; lng: number };
    sw: { lat: number; lng: number };
  };
} 