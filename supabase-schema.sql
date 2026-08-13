-- Aegis Hospital CRM Supabase Schema

-- 1. Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  age INT,
  gender TEXT,
  dob TEXT,
  phone TEXT,
  alternate_phone TEXT,
  email TEXT,
  address_info JSONB DEFAULT '{}'::jsonb,
  blood_group TEXT,
  existing_conditions TEXT,
  allergies TEXT,
  doctor_assigned_id TEXT,
  doctor_assigned_name TEXT,
  preferred_language TEXT DEFAULT 'English',
  preferred_contact_method TEXT DEFAULT 'WhatsApp',
  whatsapp_opt_in BOOLEAN DEFAULT true,
  last_visit TEXT,
  vitals JSONB DEFAULT '[]'::jsonb,
  medical_history JSONB DEFAULT '[]'::jsonb,
  prescriptions JSONB DEFAULT '[]'::jsonb,
  communications JSONB DEFAULT '[]'::jsonb,
  enable_automated_follow_up BOOLEAN DEFAULT true,
  custom_follow_up_days INT,
  custom_follow_up_message TEXT,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Doctors Table
CREATE TABLE IF NOT EXISTS public.doctors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT,
  department TEXT,
  availability TEXT DEFAULT 'Available',
  avatar TEXT,
  email TEXT,
  active_patients INT DEFAULT 0,
  role TEXT DEFAULT 'Physician',
  attendance_rate NUMERIC DEFAULT 100,
  salary NUMERIC DEFAULT 0,
  salary_status TEXT DEFAULT 'Paid',
  status TEXT DEFAULT 'Available',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  patient_name TEXT,
  doctor_id TEXT,
  doctor_name TEXT,
  date TEXT,
  time_slot TEXT,
  department TEXT,
  status TEXT DEFAULT 'Scheduled',
  notes TEXT,
  cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id TEXT PRIMARY KEY,
  invoice_no TEXT,
  patient_id TEXT,
  patient_name TEXT,
  date TEXT,
  amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Unpaid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Follow Ups Table
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  patient_name TEXT,
  age INT,
  phone TEXT,
  last_visit_date TEXT,
  follow_up_date TEXT,
  follow_up_time TEXT,
  doctor_id TEXT,
  doctor_name TEXT,
  status TEXT DEFAULT 'Pending',
  custom_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Communications Table
CREATE TABLE IF NOT EXISTS public.communications (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  type TEXT,
  channel TEXT,
  direction TEXT,
  content TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status TEXT,
  media_url TEXT,
  media_type TEXT,
  whatsapp_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  staff_name TEXT,
  staff_role TEXT,
  actor_role TEXT,
  entity_type TEXT,
  patient_id TEXT,
  patient_name TEXT,
  action TEXT
);

-- 8. Auto Reply Rules Table
CREATE TABLE IF NOT EXISTS public.auto_reply_rules (
  id TEXT PRIMARY KEY,
  keyword TEXT NOT NULL,
  reply_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Trashed Patients Table
CREATE TABLE IF NOT EXISTS public.trashed_patients (
  trashed_id TEXT PRIMARY KEY,
  id TEXT,
  name TEXT,
  phone TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_by TEXT,
  patient_data JSONB
);

-- 10. App Settings Table
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_reply_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trashed_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public Read Write Patients" ON public.patients;
DROP POLICY IF EXISTS "Public Read Write Doctors" ON public.doctors;
DROP POLICY IF EXISTS "Public Read Write Appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public Read Write Invoices" ON public.invoices;
DROP POLICY IF EXISTS "Public Read Write FollowUps" ON public.follow_ups;
DROP POLICY IF EXISTS "Public Read Write Communications" ON public.communications;
DROP POLICY IF EXISTS "Public Read Write AuditLogs" ON public.audit_logs;
DROP POLICY IF EXISTS "Public Read Write AutoReplyRules" ON public.auto_reply_rules;
DROP POLICY IF EXISTS "Public Read Write TrashedPatients" ON public.trashed_patients;
DROP POLICY IF EXISTS "Public Read Write AppSettings" ON public.app_settings;

-- Create policies for full access
CREATE POLICY "Public Read Write Patients" ON public.patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Write Doctors" ON public.doctors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Write Appointments" ON public.appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Write Invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Write FollowUps" ON public.follow_ups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Write Communications" ON public.communications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Write AuditLogs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Write AutoReplyRules" ON public.auto_reply_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Write TrashedPatients" ON public.trashed_patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Write AppSettings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
