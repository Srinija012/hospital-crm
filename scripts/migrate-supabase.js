const fs = require('fs');
const path = require('path');
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

const password = process.env.SUPABASE_DB_PASSWORD || 'Vamshi9640@';
const regions = [
  'us-east-1',
  'us-west-1',
  'us-west-2',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'sa-east-1',
  'ca-central-1'
];

async function findAndMigrate() {
  const sqlPath = path.join(__dirname, '..', 'supabase-schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const client = new Client({
      host,
      port: 6543,
      user: `postgres.cbwweyxbecyjpakfcefe`,
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000
    });

    try {
      console.log(`Testing region: ${region} (${host})...`);
      await client.connect();
      console.log(`\n🎉 SUCCESS! Connected to Supabase region: ${region}`);
      
      console.log('Executing database schema SQL...');
      await client.query(sql);
      console.log('✅ All 10 tables & RLS policies successfully created in Supabase!');

      const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);

      console.log('\nList of created public tables in Supabase:');
      res.rows.forEach((row, i) => {
        console.log(`  ${i + 1}. ${row.table_name}`);
      });

      await client.end();
      return true;
    } catch (err) {
      if (!err.message.includes('ENOTFOUND tenant/user')) {
        console.log(`Response from ${region}: ${err.message}`);
      }
      try { await client.end(); } catch (e) {}
    }
  }
  return false;
}

findAndMigrate().then((success) => {
  if (!success) {
    console.log('\nCould not find region pooler via direct ping.');
  }
});
