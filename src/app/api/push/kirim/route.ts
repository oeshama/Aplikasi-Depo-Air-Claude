import { NextResponse } from 'next/server';
import { dbPublik } from '@/lib/apiPublik';
import { ambilPenanya, kirimKePeran, kirimKeDaftar, tandaiSekali, bersih, pushSiap, idLangganan, endpointDiizinkan, KOLEKSI_LANGGANAN } from '@/lib/pushServer';
import type { Langganan } from '@/lib/pushServer';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

const tolak = (pesan: string, status: number) => NextResponse.json({ ok: false, pesan }, { status });

// Dipanggil aplikasi saat ada kejadian di dalam aplikasi:
//  - jenis 'dikonfirmasi': kasir mengonfirmasi pesanan online, lalu pengantar diberi tahu untuk mengantar
//  - jenis 'uji': mengirim satu notifikasi percobaan ke HP yang sedang dipakai
export async function POST(req: Request) {
  const db = dbPublik();
  if (!db || !pushSiap()) return tolak('Notifikasi belum disiapkan di server.', 503);
  const penanya = await ambilPenanya(db, req);
  if (!penanya) return tolak('Harus masuk dengan akun dulu.', 401);

  let b: any;
  try { b = await req.json(); } catch { return tolak('Data tidak terbaca.', 400); }

  if (b?.jenis === 'uji') {
    if (!endpointDiizinkan(b.endpoint)) return tolak('Data langganan tidak valid.', 400);
    const { data } = await db.from('depo_records').select('data, deleted').eq('collection', KOLEKSI_LANGGANAN).eq('id', idLangganan(b.endpoint)).maybeSingle();
    if (!data || data.deleted) return tolak('HP ini belum terdaftar. Aktifkan notifikasi dulu.', 404);
    const hasil = await kirimKeDaftar(db, [data.data as Langganan], {
      title: 'Notifikasi percobaan', body: `Halo ${penanya.nama}, notifikasi di HP ini sudah aktif.`, url: '/', tag: 'uji'
    });
    return NextResponse.json({ ok: hasil.terkirim > 0, ...hasil });
  }

  if (b?.jenis === 'dikonfirmasi') {
    if (penanya.peran === 'pengantar') return tolak('Peran ini tidak boleh memicu notifikasi.', 403);
    const no = bersih(b.no, 12);
    if (!no) return tolak('Kode pesanan kosong.', 400);
    // Satu pesanan hanya memicu satu kali, walau tombol ditekan berulang
    if (!(await tandaiSekali(db, `konfirmasi-${no}`))) return NextResponse.json({ ok: true, terkirim: 0, sudahPernah: true });
    const ringkas = bersih(b.ringkas, 100);
    const alamat = bersih(b.alamat, 80);
    const hasil = await kirimKePeran(db, ['pengantar'], {
      title: 'Pesanan online untuk diantar',
      body: `${ringkas || 'Pesanan baru'}${alamat ? ' ke ' + alamat : ''} (${no})`,
      url: '/pengantar', tag: `antar-${no}`
    });
    return NextResponse.json({ ok: true, ...hasil });
  }

  return tolak('Jenis tidak dikenal.', 400);
}
