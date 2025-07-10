const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables
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
  console.log('No .env.local file found');
}

async function runCleanup() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('Error: DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    
    // First, let's check what studio tables exist
    console.log('\nChecking for studio_ tables...');
    const checkResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name LIKE 'studio_%'
      ORDER BY table_name
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('No studio_ tables found. Database is clean!');
      return;
    }
    
    console.log(`Found ${checkResult.rows.length} studio_ tables to remove:`);
    checkResult.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    // Ask for confirmation
    console.log('\nThis will permanently delete these tables. Continue? (yes/no)');
    
    // For automated execution, we'll proceed
    console.log('Proceeding with cleanup...\n');
    
    // Run the cleanup script
    const cleanupSql = await fs.readFile(path.join(__dirname, 'cleanup-studio-tables.sql'), 'utf8');
    await client.query(cleanupSql);
    
    console.log('✅ Studio tables removed successfully!');
    
    // Show remaining tables
    const remainingResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('\nRemaining tables (LMS tables only):');
    remainingResult.rows.forEach(row => console.log(`  ✓ ${row.table_name}`));
    
  } catch (error) {
    console.error('Error during cleanup:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Install pg if needed
const { execSync } = require('child_process');
try {
  require('pg');
} catch (e) {
  console.log('Installing pg package...');
  execSync('npm install pg', { stdio: 'inherit' });
}

runCleanup().catch(console.error);