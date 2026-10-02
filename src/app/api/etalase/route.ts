import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Etalase } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Halaman /pesan hanya boleh melihat "etalase" (nama, nomor WA, produk dengan harga umum), bukan data toko yang lain.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ aktif: false, alasan: 'belum_siap' }, { status: 503 });

  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.from('depo_records').select('data, deleted').eq('collection', 'etalase').eq('id', 'main').maybeSingle();
  if (error) return NextResponse.json({ aktif: false, alasan: 'gagal' }, { status: 502 });

  const e = (data && !data.deleted ? data.data : null) as Etalase | null;
  if (!e || !e.aktif || !e.wa || !Array.isArray(e.produk) || e.produk.length === 0) {
    return NextResponse.json({ aktif: false, nama: e?.nama || '', wa: e?.wa || '' });
  }
  return NextResponse.json({ aktif: true, nama: e.nama, wa: e.wa, produk: e.produk });
}
