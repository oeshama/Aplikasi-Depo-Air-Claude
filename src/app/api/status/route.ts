import { NextResponse } from 'next/server';
import { dbPublik, ambilEtalase, tokenValid } from '@/lib/apiPublik';
import type { PesananMasuk } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Status satu pesanan untuk pelanggan, dicari dari kode lacak rahasia. Alamat, nomor HP, dan harga tidak ikut dikirim.
export async function GET(req: Request) {
  const s = new URL(req.url).searchParams.get('s');
  const db = dbPublik();
  if (!db) return NextResponse.json({ ok: false }, { status: 503 });
  if (!tokenValid(s)) return NextResponse.json({ ok: false }, { status: 404 });

  const { data, error } = await db.from('depo_records').select('data, deleted').eq('collection', 'pesanan_masuk').eq('data->>lacak', s).limit(1);
  if (error) return NextResponse.json({ ok: false }, { status: 502 });
  const row = data && data[0];
  if (!row || row.deleted) return NextResponse.json({ ok: false }, { status: 404 });
  const pm = row.data as PesananMasuk;

  const { etalase } = await ambilEtalase(db);
  return NextResponse.json({
    ok: true,
    no: pm.no,
    nama: pm.nama,
    ringkas: pm.items.map(i => `${i.jumlah} ${i.nama_produk}`).join(', '),
    status: pm.status,
    tahap: pm.tahap || (pm.status === 'dikonfirmasi' ? 'dikonfirmasi' : null),
    estimasi_tiba: pm.estimasi_tiba || null,
    terkirim_at: pm.terkirim_at || null,
    alasan_tolak: pm.alasan_tolak || null,
    depo: etalase?.nama || '',
    wa: etalase?.wa || ''
  });
}
