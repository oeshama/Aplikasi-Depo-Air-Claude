import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Etalase, TautanPesan } from './types';

// Pembantu untuk jalur server halaman publik (/api/etalase, /api/pesan, /api/tautan, /api/status).
// Memakai SUPABASE_SERVICE_ROLE_KEY (kunci rahasia, hanya ada di server, TIDAK dikirim ke browser) bila tersedia, supaya tetap
// berfungsi setelah tabel dikunci hanya untuk akun login. Tanpa kunci itu, dipakai kunci publik (hanya jalan selagi tabel masih terbuka).
export function dbPublik(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function ambilEtalase(db: SupabaseClient): Promise<{ etalase: Etalase | null; galat: boolean }> {
  const { data, error } = await db.from('depo_records').select('data, deleted').eq('collection', 'etalase').eq('id', 'main').maybeSingle();
  if (error) return { etalase: null, galat: true };
  return { etalase: (data && !data.deleted ? data.data : null) as Etalase | null, galat: false };
}

// Kode rahasia harus berupa huruf/angka biasa (mencegah isian aneh masuk ke pencarian)
export function tokenValid(t: unknown): t is string {
  return typeof t === 'string' && /^[a-z0-9]{6,32}$/i.test(t);
}

export async function ambilTautan(db: SupabaseClient, token: string): Promise<TautanPesan | null> {
  const { data } = await db.from('depo_records').select('data, deleted').eq('collection', 'tautan').eq('id', token).maybeSingle();
  const t = (data && !data.deleted ? data.data : null) as TautanPesan | null;
  return t && t.aktif ? t : null;
}
