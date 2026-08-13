const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        process.env[key] = process.env[key] || value;
      }
    });
  }
}

loadEnv();

const dbUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function searchAll() {
  const searchTerm = 'pappa';
  console.log(`\n🔍 Searching for "${searchTerm}" across Supabase tables and local files...\n`);

  // 1. Search Supabase via PostgreSQL text search
  if (dbUrl) {
    const pgClient = new Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await pgClient.connect();
      const tablesRes = await pgClient.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);

      let foundInSupabase = false;
      for (const row of tablesRes.rows) {
        const tableName = row.table_name;
        // Search table converted to text
        const searchRes = await pgClient.query(
          `SELECT * FROM public.${tableName} WHERE row_to_json(${tableName})::text ILIKE $1`,
          [`%${searchTerm}%`]
        );

        if (searchRes.rows.length > 0) {
          foundInSupabase = true;
          console.log(`📌 Found ${searchRes.rows.length} match(es) in Supabase table "${tableName}":`);
          console.log(JSON.stringify(searchRes.rows, null, 2));
        }
      }

      if (!foundInSupabase) {
        console.log('ℹ️  No matches found in Supabase database tables yet.');
      }

      await pgClient.end();
    } catch (err) {
      console.error('PostgreSQL Search Error:', err.message);
    }
  }

  // 2. Search local JSON files
  console.log('\n🔍 Searching local JSON data files...');
  const rootDir = path.join(__dirname, '..');
  const jsonFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.json'));

  for (const file of jsonFiles) {
    const filePath = path.join(rootDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.toLowerCase().includes(searchTerm.toLowerCase())) {
        console.log(`📌 Found match in local file "${file}"!`);
      }
    } catch (e) {}
  }
}

searchAll();
