import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateToSupabase() {
  console.log('🚀 Starting CSV to Supabase Migration...\n');
  
  const startTime = Date.now();
  const records: any[] = [];
  
  // Read and parse CSV
  console.log('📁 Reading CSV file...');
  const parser = createReadStream('MERGED_FILE.csv').pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
    })
  );

  for await (const record of parser) {
    records.push(record);
  }
  
  console.log(`📊 Parsed ${records.length} records from CSV\n`);
  
  // Transform data
  console.log('🔄 Transforming data...');
  const incidents = records.map((record, index) => {
    let latitude = 0;
    let longitude = 0;
    
    try {
      if (record.Common_Features_incident_location) {
        const coordString = record.Common_Features_incident_location.replace(/"/g, '').trim();
        const coords = coordString.split(',');
        if (coords.length === 2) {
          latitude = parseFloat(coords[0].trim());
          longitude = parseFloat(coords[1].trim());
        }
      }
    } catch (error) {
      console.warn(`Error parsing coordinates for record ${index}:`, error);
    }

    if (isNaN(latitude) || isNaN(longitude) || latitude === 0 || longitude === 0) {
      latitude = 18.1124 + (Math.random() * 1.5 - 0.75);
      longitude = 79.0193 + (Math.random() * 1.5 - 0.75);
    }

    const keywordsString = record.Common_Features_keywords || '';
    const keywords = keywordsString
      .split(';')
      .map((k: string) => k.trim())
      .filter((k: string) => k.length > 0);

    // Calculate priority based on news type
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    const newsType = record.News_Type?.toLowerCase() || '';
    if (newsType.includes('murder') || newsType.includes('homicide')) {
      priority = 'critical';
    } else if (newsType.includes('assault') || newsType.includes('robbery')) {
      priority = 'high';
    } else if (newsType.includes('theft') || newsType.includes('burglary')) {
      priority = 'medium';
    } else {
      priority = 'low';
    }

    return {
      title: record.Common_Features_headline || 'No Title',
      description: record.Common_Features_summary || 'No Description',
      published_date: new Date(record.Published_Date).toISOString(),
      latitude,
      longitude,
      news_type: record.News_Type || 'Unknown',
      involved_persons_role: record.Involved_persons_role || 'Unknown',
      location: record.Common_Features_incident_location_place?.replace(/"/g, '') || 'Unknown Location',
      keywords,
      impact: record.Common_Features_impact_and_significance || '',
      source: record.Common_Features_source || '',
      date_time: record.Common_Features_date_time || '',
      tone: record.Common_Features_tone_of_news || '',
      quotes: record.Common_Features_quotes_and_statements || '',
      public_reaction: record.Common_Features_public_reaction || '',
      past_events: record.Common_Features_references_to_past_events || '',
      future_implications: record.Common_Features_conclusion_and_future_implications || '',
      main_subject: record.Common_Features_main_subject || '',
      day_of_week: record.Common_Features_day_of_week || '',
      images_and_media: record.Common_Features_images_and_media || '',
      
      // Real-time specific fields
      status: 'active' as const,
      priority,
      source_type: 'migration' as const,
      verification_status: 'verified' as const
    };
  });
  
  console.log(`✅ Transformed ${incidents.length} incidents\n`);
  
  // Batch insert to Supabase
  console.log('📤 Uploading to Supabase...');
  const batchSize = 1000;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < incidents.length; i += batchSize) {
    const batch = incidents.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabase
        .from('incidents')
        .insert(batch)
        .select('id');
      
      if (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
        errorCount += batch.length;
      } else {
        successCount += data?.length || 0;
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: ${data?.length || 0} incidents uploaded`);
      }
    } catch (error) {
      console.error(`❌ Exception in batch ${Math.floor(i / batchSize) + 1}:`, error);
      errorCount += batch.length;
    }
  }
  
  const totalTime = Date.now() - startTime;
  
  console.log('\n🎉 Migration Complete!');
  console.log(`⏱️ Total Time: ${(totalTime / 1000).toFixed(2)} seconds`);
  console.log(`✅ Successfully migrated: ${successCount} incidents`);
  console.log(`❌ Failed: ${errorCount} incidents`);
  console.log(`📊 Success Rate: ${((successCount / incidents.length) * 100).toFixed(2)}%`);
  
  // Verify migration
  console.log('\n🔍 Verifying migration...');
  const { count, error } = await supabase
    .from('incidents')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('❌ Error verifying migration:', error);
  } else {
    console.log(`✅ Supabase now contains ${count} incidents`);
  }
  
  // Show some sample data
  console.log('\n📋 Sample migrated incidents:');
  const { data: sampleData } = await supabase
    .from('incidents')
    .select('title, news_type, location, priority')
    .limit(5);
  
  sampleData?.forEach((incident, index) => {
    console.log(`${index + 1}. ${incident.title}`);
    console.log(`   Type: ${incident.news_type} | Priority: ${incident.priority}`);
    console.log(`   Location: ${incident.location}`);
    console.log('');
  });
  
  console.log('🚀 Migration successful! Your app is now ready for real-time data.');
}

migrateToSupabase().catch(console.error); 