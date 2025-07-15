import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { IncidentDetails } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Transform database response to detailed format
function transformToDetails(dbIncident: any): IncidentDetails {
  return {
    id: dbIncident.id,
    title: dbIncident.title,
    description: dbIncident.description,
    publishedDate: dbIncident.published_date,
    latitude: dbIncident.latitude,
    longitude: dbIncident.longitude,
    newsType: dbIncident.news_type,
    involvedPersonsRole: dbIncident.involved_persons_role,
    location: dbIncident.location,
    keywords: dbIncident.keywords,
    impact: dbIncident.impact,
    source: dbIncident.source,
    sourceUrl: dbIncident.source_url,
    date_time: dbIncident.date_time,
    tone: dbIncident.tone,
    quotes: dbIncident.quotes,
    category: dbIncident.category,
    publicReaction: dbIncident.public_reaction,
    pastEvents: dbIncident.past_events,
    futureImplications: dbIncident.future_implications,
    mainSubject: dbIncident.main_subject,
    dayOfWeek: dbIncident.day_of_week,
    imagesAndMedia: dbIncident.images_and_media,
  };
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Incident ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to load incident details', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Incident not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformToDetails(data));
  } catch (error) {
    console.error('Error fetching incident details:', error);
    return NextResponse.json(
      { error: 'Failed to load incident details', details: String(error) },
      { status: 500 }
    );
  }
} 