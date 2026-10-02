import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Dashboard Supabase baru menamainya PUBLISHABLE_KEY, yang lama ANON_KEY; keduanya diterima
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Tanpa .env.local aplikasi tetap jalan dalam mode lokal (data hanya di perangkat ini)
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Mode login akun: sesi login disimpan di perangkat supaya tetap masuk setelah halaman dimuat ulang
const modeAkun = process.env.NEXT_PUBLIC_LOGIN_AKUN === '1';

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: modeAkun, autoRefreshToken: modeAkun, detectSessionInUrl: false }
    })
  : null;
