import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Simple Supabase Connection Test...\n');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please add these to your .env.local file:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_project_url');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  process.exit(1);
}

console.log('✅ Environment variables found');
console.log(`📡 Supabase URL: ${supabaseUrl.substring(0, 30)}...`);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function simpleTest() {
  try {
    console.log('\n📡 Testing basic connection...');
    
    // Test basic connection by checking if we can connect
    const { data, error } = await supabase
      .from('_dummy_table_that_doesnt_exist')
      .select('*')
      .limit(1);
    
    // We expect an error, but it should be a "relation does not exist" error, not a connection error
    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('✅ Connection successful! (Expected error for non-existent table)');
        console.log('📊 Database is accessible');
      } else {
        console.error('❌ Connection failed:', error.message);
        process.exit(1);
      }
    }
    
    console.log('\n🎉 Supabase connection is working!');
    console.log('\n📋 Next steps:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Click "SQL Editor" in the left sidebar');
    console.log('3. Click "New Query"');
    console.log('4. Copy and paste the SQL schema from supabase-setup.md');
    console.log('5. Click "Run" to create the database tables');
    console.log('\nAfter creating the schema, run:');
    console.log('npx tsx scripts/test-supabase-connection.ts');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    process.exit(1);
  }
}

simpleTest(); 