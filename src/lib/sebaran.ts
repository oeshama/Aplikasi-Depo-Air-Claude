import { Kontak, Pesanan, Produk } from './types';

// Seberapa sering pelanggan membeli, dihitung campuran jumlah pesanan dan jumlah galon dalam beberapa hari terakhir.
export type KategoriBeli = 'sering' | 'sedang' | 'jarang' | 'lama' | 'belum';

// Ambang bawaan (bisa diubah di sini sampai ada pengaturannya di Pengaturan Toko)
export const AMBANG_BELI = {
  jendelaHari: 30,
  seringPesanan: 4,
  seringGalon: 12,
  sedangPesanan: 2,
  sedangGalon: 4,
};

export const INFO_KATEGORI: Record<KategoriBeli, { label: string; warna: string; ket: string }> = {
  sering: { label: 'Sering', warna: '#15803d', ket: `${AMBANG_BELI.seringPesanan}+ pesanan atau ${AMBANG_BELI.seringGalon}+ galon dalam ${AMBANG_BELI.jendelaHari} hari` },
  sedang: { label: 'Sedang', warna: '#0369a1', ket: `${AMBANG_BELI.sedangPesanan}+ pesanan atau ${AMBANG_BELI.sedangGalon}+ galon dalam ${AMBANG_BELI.jendelaHari} hari` },
  jarang: { label: 'Jarang', warna: '#b45309', ket: `Membeli, tapi di bawah ambang sedang dalam ${AMBANG_BELI.jendelaHari} hari` },
  lama: { label: 'Lama tidak beli', warna: '#dc2626', ket: `Pernah membeli, tidak ada pesanan ${AMBANG_BELI.jendelaHari} hari terakhir` },
  belum: { label: 'Belum pernah beli', warna: '#64748b', ket: 'Belum ada pesanan tercatat' },
};

export const URUTAN_KATEGORI: KategoriBeli[] = ['sering', 'sedang', 'jarang', 'lama', 'belum'];

export interface Frekuensi {
  kategori: KategoriBeli;
  pesananJendela: number;
  galonJendela: number;
  totalPesanan: number;
  terakhir?: string; // ISO pesanan terakhir
}

function jumlahGalon(p: Pesanan, galonProdukIds: Set<string>): number {
  return (p.items || []).reduce((acc, it) => {
    if (!it) return acc;
    const galon = galonProdukIds.has(it.produk_id) || /galon/i.test(it.nama_produk || '');
    return acc + (galon ? (it.jumlah || 0) : 0);
  }, 0);
}

// Hitung frekuensi beli semua pelanggan sekaligus (satu kali lewat daftar pesanan)
export function hitungFrekuensiSemua(kontak: Kontak[], pesanan: Pesanan[], produk: Produk[], sekarang: number = Date.now()): Map<string, Frekuensi> {
  const galonIds = new Set(produk.filter(p => p.jenis_wadah === 'galon').map(p => p.id));
  const batas = sekarang - AMBANG_BELI.jendelaHari * 24 * 60 * 60 * 1000;
  const hasil = new Map<string, Frekuensi>();
  kontak.forEach(k => hasil.set(k.id, { kategori: 'belum', pesananJendela: 0, galonJendela: 0, totalPesanan: 0 }));

  pesanan.forEach(p => {
    if (!p || !p.kontak_id || p.status_pesanan === 'batal') return;
    const f = hasil.get(p.kontak_id);
    if (!f) return;
    const t = new Date(p.created_at).getTime();
    f.totalPesanan += 1;
    if (!f.terakhir || t > new Date(f.terakhir).getTime()) f.terakhir = p.created_at;
    if (t >= batas) {
      f.pesananJendela += 1;
      f.galonJendela += jumlahGalon(p, galonIds);
    }
  });

  hasil.forEach(f => {
    if (f.totalPesanan === 0) f.kategori = 'belum';
    else if (f.pesananJendela === 0) f.kategori = 'lama';
    else if (f.pesananJendela >= AMBANG_BELI.seringPesanan || f.galonJendela >= AMBANG_BELI.seringGalon) f.kategori = 'sering';
    else if (f.pesananJendela >= AMBANG_BELI.sedangPesanan || f.galonJendela >= AMBANG_BELI.sedangGalon) f.kategori = 'sedang';
    else f.kategori = 'jarang';
  });
  return hasil;
}
