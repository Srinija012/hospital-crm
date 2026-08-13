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

const samplePatients = [
  {
    id: 'pat-101',
    name: 'Rajesh Sharma',
    age: 42,
    gender: 'Male',
    dob: '1982-05-14',
    phone: '9876543210',
    alternate_phone: '9876543211',
    email: 'rajesh.sharma@example.com',
    address_info: { address: 'Plot 45, Jubilee Hills', city: 'Hyderabad', state: 'Telangana', country: 'India', pincode: '500033' },
    blood_group: 'O+',
    existing_conditions: 'Hypertension',
    allergies: 'Penicillin',
    doctor_assigned_id: 'doc-1',
    doctor_assigned_name: 'Dr. Sarah Connor',
    preferred_language: 'English',
    preferred_contact_method: 'WhatsApp',
    whatsapp_opt_in: true,
    last_visit: '2026-08-10',
    enable_automated_follow_up: true
  },
  {
    id: 'pat-102',
    name: 'Priya Patel',
    age: 29,
    gender: 'Female',
    dob: '1995-11-20',
    phone: '9123456789',
    alternate_phone: '',
    email: 'priya.patel@example.com',
    address_info: { address: 'Flat 302, Green Glen Layout', city: 'Bengaluru', state: 'Karnataka', country: 'India', pincode: '560103' },
    blood_group: 'B+',
    existing_conditions: 'Asthma',
    allergies: 'None',
    doctor_assigned_id: 'doc-2',
    doctor_assigned_name: 'Dr. James Carter',
    preferred_language: 'Telugu',
    preferred_contact_method: 'WhatsApp',
    whatsapp_opt_in: true,
    last_visit: '2026-08-11',
    enable_automated_follow_up: true
  },
  {
    id: 'pat-103',
    name: 'Anil Kumar',
    age: 58,
    gender: 'Male',
    dob: '1966-03-08',
    phone: '8498919411',
    alternate_phone: '',
    email: 'anil.kumar@example.com',
    address_info: { address: 'House No 12-4-56', city: 'Hyderabad', state: 'Telangana', country: 'India', pincode: '500018' },
    blood_group: 'A+',
    existing_conditions: 'Type 2 Diabetes',
    allergies: 'Dust, Sulfa drugs',
    doctor_assigned_id: 'doc-1',
    doctor_assigned_name: 'Dr. Sarah Connor',
    preferred_language: 'Hindi',
    preferred_contact_method: 'WhatsApp',
    whatsapp_opt_in: true,
    last_visit: '2026-08-12',
    enable_automated_follow_up: true
  }
];

async function seedPatients() {
  console.log('Seeding initial patient records into Supabase database...');
  const { data, error } = await supabase.from('patients').upsert(samplePatients).select();

  if (error) {
    console.error('❌ Failed to populate patients in Supabase:', error.message);
  } else {
    console.log(`✅ Successfully populated ${data.length} patient records in Supabase!`);
    data.forEach(p => console.log(`   - ${p.name} (${p.id}) [Phone: ${p.phone}]`));
  }
}

seedPatients();
