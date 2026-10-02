import { NextResponse } from 'next/server';
import { dbPublik, ambilEtalase } from '@/lib/apiPublik';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Halaman /pesan hanya boleh melihat "etalase" (nama, nomor WA, produk dengan harga umum), bukan data toko yang lain.
export async function GET() {
  const db = dbPublik();
  if (!db) return NextResponse.json({ aktif: false, alasan: 'belum_siap' }, { status: 503 });
  const { etalase: e, galat } = await ambilEtalase(db);
  if (galat) return NextResponse.json({ aktif: false, alasan: 'gagal' }, { status: 502 });

  if (!e || !e.aktif || !e.wa || !Array.isArray(e.produk) || e.produk.length === 0) {
    return NextResponse.json({ aktif: false, nama: e?.nama || '', wa: e?.wa || '' });
  }
  return NextResponse.json({ aktif: true, nama: e.nama, wa: e.wa, produk: e.produk });
}
