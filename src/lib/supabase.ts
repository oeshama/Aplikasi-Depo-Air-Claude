import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function fetchProdukFromSupabase() {
  const { data, error } = await supabase.from('produk').select('*');
  if (error) {
    console.warn('Supabase fetch error, fallback to local storage:', error.message);
    return null;
  }
  return data;
}

export async function fetchKontakFromSupabase() {
  const { data, error } = await supabase.from('kontak').select('*');
  if (error) {
    console.warn('Supabase fetch error, fallback to local storage:', error.message);
    return null;
  }
  return data;
}
