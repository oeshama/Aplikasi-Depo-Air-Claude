import { NextResponse } from 'next/server';
import { normalisasiHp } from '@/lib/telepon';
import { dbPublik, ambilEtalase, ambilTautan, tokenValid } from '@/lib/apiPublik';
import { kirimKePeran } from '@/lib/pushServer';
import type { PesananMasuk } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

const BATAS_PER_NOMOR_PER_JAM = 3;
const BATAS_SEMUA_PER_JAM = 60;
const HURUF_KODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const HURUF_LACAK = 'abcdefghjkmnpqrstuvwxyz23456789';

function acak(huruf: string, n: number): string {
  let k = '';
  for (let i = 0; i < n; i++) k += huruf[Math.floor(Math.random() * huruf.length)];
  return k;
}

function bersih(v: unknown, maks: number): string {
  return typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maks) : '';
}

function galat(pesan: string, status = 400) {
  return NextResponse.json({ ok: false, pesan }, { status });
}

// Pelanggan mengirim pesanan. Hanya menambah satu baris "pesanan_masuk"; isinya diperiksa ulang di sini
// (produk dicocokkan dengan etalase, jumlah dibatasi, ada batas pesanan per nomor) karena halaman publik tidak bisa dipercaya.
// Dengan tautan pribadi (p), nama/nomor/alamat diambil dari data pelanggan, bukan dari kiriman halaman.
export async function POST(req: Request) {
  const db = dbPublik();
  if (!db) return galat('Layanan pesan online belum siap.', 503);

  let b: any;
  try { b = await req.json(); } catch { return galat('Data tidak terbaca.'); }
  if (!b || typeof b !== 'object') return galat('Data tidak terbaca.');

  // Jebakan bot: kolom tersembunyi harus kosong, dan formulir tidak mungkin selesai dalam 3 detik
  if (b.website) return NextResponse.json({ ok: true, no: acak(HURUF_KODE, 4) });
  if (typeof b.lama === 'number' && b.lama < 3000 && !b.p) return galat('Mohon periksa lagi pesanan Anda, lalu kirim.');

  const { etalase, galat: gagalEtalase } = await ambilEtalase(db);
  if (gagalEtalase) return galat('Layanan sedang sibuk. Coba lagi sebentar.', 502);
  if (!etalase || !etalase.aktif) return galat('Pemesanan online sedang tidak tersedia.', 403);

  let nama = bersih(b.nama, 60);
  let alamat = bersih(b.alamat, 300);
  let hp = normalisasiHp(String(b.hp || ''));
  let lat = typeof b.lat === 'number' && Math.abs(b.lat) <= 90 ? b.lat : undefined;
  let lng = typeof b.lng === 'number' && Math.abs(b.lng) <= 180 ? b.lng : undefined;
  let kontakId: string | undefined;

  if (b.p !== undefined && b.p !== null && b.p !== '') {
    if (!tokenValid(b.p)) return galat('Tautan pribadi tidak valid. Gunakan halaman pesan biasa.', 404);
    const t = await ambilTautan(db, b.p);
    if (!t || !t.hp) return galat('Tautan pribadi ini sudah tidak berlaku. Gunakan halaman pesan biasa.', 404);
    nama = t.nama; hp = t.hp; kontakId = t.kontak_id;
    // Alamat boleh diubah pelanggan (mis. dikirim ke tempat lain); bila kosong dipakai alamat langganan
    if (alamat.length < 5) { alamat = t.alamat; lat = t.lat; lng = t.lng; }
  }

  const catatan = bersih(b.catatan, 200);
  if (nama.length < 2) return galat('Isi nama Anda.');
  if (!hp) return galat('Nomor WhatsApp tidak valid. Contoh: 0812 3456 7890.');
  if (alamat.length < 5) return galat('Isi alamat pengantaran.');
  const bayar = b.bayar === 'transfer' ? 'transfer' : 'tunai';
  const waktuAntar = bersih(b.waktu_antar, 40) || 'secepatnya';

  const items: PesananMasuk['items'] = [];
  const dipakai = new Set<string>();
  if (!Array.isArray(b.items)) return galat('Pilih minimal satu produk.');
  let totalJumlah = 0;
  for (const it of b.items) {
    const jumlah = Math.floor(Number(it?.jumlah));
    if (!(jumlah > 0)) continue;
    const prod = etalase.produk.find(p => p.id === it?.produk_id);
    if (!prod || dipakai.has(prod.id)) return galat('Ada produk yang tidak valid. Muat ulang halaman ini.');
    if (jumlah > 50) return galat('Jumlah per produk maksimal 50. Untuk jumlah lebih besar, hubungi kami lewat WhatsApp.');
    dipakai.add(prod.id);
    totalJumlah += jumlah;
    items.push({ produk_id: prod.id, nama_produk: prod.nama, jumlah });
  }
  if (items.length === 0) return galat('Pilih minimal satu produk.');
  if (totalJumlah > 100) return galat('Jumlah terlalu banyak. Hubungi kami lewat WhatsApp.');

  // Batas pesanan: per nomor dan keseluruhan, dalam satu jam terakhir
  const sejam = new Date(Date.now() - 3600 * 1000).toISOString();
  const perNomor = await db.from('depo_records').select('id', { count: 'exact', head: true })
    .eq('collection', 'pesanan_masuk').eq('data->>no_hp', hp).gte('updated_at', sejam);
  const semua = await db.from('depo_records').select('id', { count: 'exact', head: true })
    .eq('collection', 'pesanan_masuk').gte('updated_at', sejam);
  if ((perNomor.count || 0) >= BATAS_PER_NOMOR_PER_JAM) return galat('Pesanan dari nomor ini sudah beberapa kali masuk. Mohon tunggu, kami segera menghubungi Anda.', 429);
  if ((semua.count || 0) >= BATAS_SEMUA_PER_JAM) return galat('Pesanan sedang ramai. Silakan hubungi kami lewat WhatsApp.', 429);

  const no = acak(HURUF_KODE, 4);
  const lacak = acak(HURUF_LACAK, 10);
  const pm: PesananMasuk = {
    id: `pmk-${Date.now()}-${no}`, no, waktu: new Date().toISOString(), nama, no_hp: hp, alamat, lat, lng,
    items, waktu_antar: waktuAntar, bayar, catatan: catatan || undefined, status: 'baru', lacak, kontak_id_tautan: kontakId
  };
  const { error } = await db.from('depo_records').insert({ collection: 'pesanan_masuk', id: pm.id, data: pm, device_id: 'publik' });
  if (error) return galat('Pesanan belum berhasil dikirim. Coba lagi sebentar.', 502);

  // Beri tahu HP kasir, owner, dan admin yang sudah mengaktifkan notifikasi. Kegagalan di sini tidak boleh menggagalkan pesanan.
  try {
    await kirimKePeran(db, ['owner', 'admin', 'kasir'], {
      title: 'Pesanan online baru',
      body: `${nama}: ${items.map(i => `${i.jumlah} ${i.nama_produk}`).join(', ')} (${no})`,
      url: '/kasir/pesanan-masuk',
      tag: `pm-${no}`
    }, 4000);
  } catch { /* abaikan */ }

  return NextResponse.json({ ok: true, no, lacak, wa: etalase.wa });
}
