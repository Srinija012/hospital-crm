import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cbwweyxbecyjpakfcefe.supabase.co';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_lUNicqvEHJkZoCK6Ezt9SA_vciWk7Bn';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
