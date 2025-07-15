import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { DashboardFilters, IncidentMapMarker } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Transform database response to map marker format
function transformToMapMarker(dbIncident: any): IncidentMapMarker {
  return {
    id: dbIncident.id,
    title: dbIncident.title,
    latitude: dbIncident.latitude,
    longitude: dbIncident.longitude,
    newsType: dbIncident.news_type,
    location: dbIncident.location,
    publishedDate: dbIncident.published_date,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const crimeType = searchParams.get('crimeType');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '1000');

    const filters: Partial<DashboardFilters> = {};
    if (startDate && endDate) {
      filters.dateRange = [new Date(startDate), new Date(endDate)];
    }
    if (crimeType) {
      filters.crimeType = crimeType;
    }
    if (status) {
      filters.status = status as 'active' | 'resolved' | 'investigating';
    }

    const supabase = createServerSupabaseClient();
    
    // Select only the fields needed for map markers
    let query = supabase
      .from('incidents')
      .select('id, title, latitude, longitude, news_type, location, published_date', { count: 'exact' });

    // Apply filters
    if (filters.dateRange) {
      query = query
        .gte('published_date', filters.dateRange[0].toISOString())
        .lte('published_date', filters.dateRange[1].toISOString());
    }

    if (filters.crimeType) {
      query = query.eq('news_type', filters.crimeType);
    }

    if (filters.status) {
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
      return NextResponse.json(
        { error: 'Failed to load map markers', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      incidents: (data || []).map(transformToMapMarker),
      total: count || 0,
      hasMore: (count || 0) > to + 1,
      page,
      pageSize
    });
  } catch (error) {
    console.error('Error fetching map markers:', error);
    return NextResponse.json(
      { error: 'Failed to load map markers', details: String(error) },
      { status: 500 }
    );
  }
} 