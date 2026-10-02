import { NextResponse } from 'next/server';
import { dbPublik, ambilEtalase, ambilTautan, tokenValid } from '@/lib/apiPublik';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Tautan pribadi pelanggan langganan: hanya pemegang kode rahasia yang bisa melihat nama, alamat, dan pesanan biasanya.
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams.get('p');
  const db = dbPublik();
  if (!db) return NextResponse.json({ ok: false }, { status: 503 });
  if (!tokenValid(p)) return NextResponse.json({ ok: false }, { status: 404 });

  const { etalase } = await ambilEtalase(db);
  if (!etalase || !etalase.aktif) return NextResponse.json({ ok: false, tutup: true });
  const t = await ambilTautan(db, p);
  if (!t) return NextResponse.json({ ok: false }, { status: 404 });

  const items = t.items
    .map(i => ({ produk: etalase.produk.find(x => x.id === i.produk_id), jumlah: i.jumlah }))
    .filter(x => x.produk && x.jumlah > 0)
    .map(x => ({ produk_id: x.produk!.id, nama: x.produk!.nama, harga: x.produk!.harga, jumlah: x.jumlah }));
  return NextResponse.json({ ok: true, nama: t.nama, alamat: t.alamat, punyaLokasi: t.lat != null, items });
}
