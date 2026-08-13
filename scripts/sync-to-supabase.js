const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncPappaRecord() {
  console.log('Syncing patient "pappa" to Supabase database...');

  const pappaPatient = {
    id: 'pat-pappa-8498919411',
    name: 'pappa',
    phone: '8498919411',
    age: 55,
    gender: 'Male',
    preferred_language: 'English',
    preferred_contact_method: 'WhatsApp',
    whatsapp_opt_in: true,
    last_visit: '2026-08-12',
    enable_automated_follow_up: true
  };

  const { data, error } = await supabase
    .from('patients')
    .upsert([pappaPatient])
    .select();

  if (error) {
    console.error('❌ Error syncing to Supabase:', error.message);
  } else {
    console.log('✅ Patient "pappa" successfully saved in Supabase table "patients":');
    console.log(data);
  }
}

syncPappaRecord();
