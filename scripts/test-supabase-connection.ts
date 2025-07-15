import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Supabase Connection...\n');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please add these to your .env.local file:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_project_url');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    console.log('📡 Testing database connection...');
    
    // Test basic query
    const { data, error } = await supabase
      .from('incidents')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('\nPossible issues:');
      console.log('1. Check your Supabase URL and service key');
      console.log('2. Make sure the database schema is created');
      console.log('3. Verify your IP is not blocked');
      process.exit(1);
    }
    
    console.log('✅ Database connection successful!');
    console.log(`📊 Current incidents count: ${data || 0}`);
    
    // Test table structure
    console.log('\n🔍 Testing table structure...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('incidents')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('❌ Table structure test failed:', sampleError.message);
      console.log('Make sure you have run the database schema SQL');
      process.exit(1);
    }
    
    console.log('✅ Table structure is correct!');
    
    if (sampleData && sampleData.length > 0) {
      console.log('📋 Sample record fields:');
      const fields = Object.keys(sampleData[0]);
      fields.forEach(field => console.log(`  - ${field}`));
    }
    
    console.log('\n🎉 Supabase connection test passed!');
    console.log('You can now run the migration script:');
    console.log('npx tsx scripts/migrate-to-supabase.ts');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    process.exit(1);
  }
}

testConnection(); 