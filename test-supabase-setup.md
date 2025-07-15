# Supabase Setup Test Guide

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign up/Login with GitHub
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - Name: `crime-analysis-dashboard`
   - Database Password: (generate a strong password)
   - Region: Choose closest to your users
6. Click "Create new project"

## Step 2: Get Your Credentials

After project creation, go to Settings > API and copy:
- Project URL
- Anon public key
- Service role key (keep this secret!)

## Step 3: Update Environment Variables

Add these to your `.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 4: Run Database Schema

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Copy and paste the SQL from `supabase-setup.md`
4. Click "Run" to execute the schema

## Step 5: Test Connection

Run this command to test your Supabase connection:

```bash
npx tsx scripts/test-supabase-connection.ts
```

## Step 6: Run Migration

Once the connection test passes, run the migration:

```bash
npx tsx scripts/migrate-to-supabase.ts
```

## Step 7: Verify Migration

Check your Supabase dashboard:
1. Go to "Table Editor"
2. Click on "incidents" table
3. You should see your migrated data

## Troubleshooting

### Common Issues:

1. **Environment variables not found**
   - Make sure `.env.local` is in your project root
   - Restart your development server

2. **Database connection failed**
   - Check your Supabase URL and keys
   - Ensure your IP is not blocked

3. **Schema errors**
   - Make sure you're using the latest SQL schema
   - Check for any syntax errors in the SQL

4. **Migration fails**
   - Check the console output for specific errors
   - Verify your CSV file exists and is readable

### Support:

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- GitHub Issues: Create an issue in your repository 