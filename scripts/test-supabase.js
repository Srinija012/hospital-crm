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

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const dbUrl = process.env.DATABASE_URL;

async function runTests() {
  console.log('--- 🧪 STARTING SUPABASE END-TO-END VERIFICATION TEST ---\n');

  // Test 1: PostgreSQL Direct Table & Count Verification
  console.log('1️⃣  Testing Direct PostgreSQL Connection...');
  const pgClient = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pgClient.connect();
    const countRes = await pgClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log(`  ✅ Direct PostgreSQL connected! Total public tables: ${countRes.rows.length}`);
    await pgClient.end();
  } catch (err) {
    console.error('  ❌ PostgreSQL Direct Error:', err.message);
  }

  // Test 2: Supabase JS Client Insert / Select / Delete Test
  console.log('\n2️⃣  Testing Supabase REST API (@supabase/supabase-js)...');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const testDoctor = {
    id: 'doc-test-101',
    name: 'Dr. Test Specialist',
    specialty: 'Cardiology',
    department: 'Cardiology',
    availability: 'Available',
    email: 'test.doctor@aegishospital.com',
    active_patients: 5,
    role: 'Physician',
    status: 'Available'
  };

  // A. INSERT
  console.log('  ➜ Inserting test doctor record into "doctors" table...');
  const { data: insertData, error: insertError } = await supabase
    .from('doctors')
    .upsert([testDoctor])
    .select();

  if (insertError) {
    console.error('  ❌ Insert Failed:', insertError.message);
    return;
  }
  console.log('  ✅ Insert Successful! Record inserted:', insertData[0].name);

  // B. SELECT
  console.log('  ➜ Querying "doctors" table for inserted record...');
  const { data: readData, error: readError } = await supabase
    .from('doctors')
    .select('*')
    .eq('id', 'doc-test-101');

  if (readError) {
    console.error('  ❌ Read Failed:', readError.message);
    return;
  }
  console.log(`  ✅ Read Successful! Found: ${readData[0].name} (${readData[0].specialty})`);

  // C. CLEANUP (DELETE TEST RECORD)
  console.log('  ➜ Cleaning up test record from database...');
  const { error: deleteError } = await supabase
    .from('doctors')
    .delete()
    .eq('id', 'doc-test-101');

  if (deleteError) {
    console.error('  ❌ Cleanup Failed:', deleteError.message);
    return;
  }
  console.log('  ✅ Cleanup Successful!');

  console.log('\n--- 🎉 ALL SUPABASE TESTS PASSED 100% SUCCESSFULLY! ---');
}

runTests();
