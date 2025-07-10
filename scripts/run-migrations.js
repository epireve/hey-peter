const fs = require('fs').promises;
const path = require('path');

// Load environment variables from .env.local manually
try {
  const envContent = require('fs').readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
} catch (error) {
  console.log('No .env.local file found, checking environment variables...');
}

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('Error: DATABASE_URL not found in .env.local');
    console.error('Please add your database connection string to .env.local');
    console.error('\nTo get your DATABASE_URL:');
    console.error('1. Go to https://supabase.com/dashboard/project/rgqcbsjucvpffyajrjrc/settings/database');
    console.error('2. Find "Connection string" section');
    console.error('3. Switch to "URI" tab');
    console.error('4. Copy the connection string and add it to .env.local');
    process.exit(1);
  }

  // Install pg package if not already installed
  let pg;
  try {
    pg = require('pg');
  } catch (e) {
    console.log('Installing pg package...');
    require('child_process').execSync('npm install pg', { stdio: 'inherit' });
    pg = require('pg');
  }

  const { Client } = pg;
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  const migrations = [
    '20250628000000_lms_core_schema.sql',
    '20250628000001_lms_rls_policies.sql',
    '20250628000002_lms_views_functions.sql',
    '20250629000000_studio_schema.sql'
  ];

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!\n');

    console.log('Running migrations...');

    for (const migration of migrations) {
      const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migration);
      
      try {
        const sql = await fs.readFile(migrationPath, 'utf8');
        await client.query(sql);
        console.log(`✓ ${migration} completed successfully`);
      } catch (error) {
        console.error(`✗ Failed to run ${migration}:`, error.message);
        throw error;
      }
    }

    console.log('\nAll migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations().catch(console.error);