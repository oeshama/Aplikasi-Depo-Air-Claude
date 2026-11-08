import { AppStore } from './store';
import { rentangMingguDari, rentangBulanDari, rentangSebelumnya, kunciTanggal } from './laporan';
import { Pesanan } from './types';

// Rekap penjualan harian, mingguan (Senin sampai Minggu), dan bulanan untuk kasir, admin, dan pengantar.
// Hanya penjualan: tidak memuat laba, HPP, atau biaya. Pesanan batal dan pelunasan hutang tidak dihitung.

export type PeriodeRekap = 'harian' | 'mingguan' | 'bulanan';

export interface AngkaRekap { omzet: number; transaksi: number; unit: number }

export interface DataRekap {
  periode: PeriodeRekap;
  label: string;
  labelSebelumnya: string;
  ini: AngkaRekap;
  sebelumnya: AngkaRekap;
  deret: { label: string; omzet: number; transaksi: number }[]; // per jam (harian) atau per hari
  produk: { nama: string; jumlah: number; omzet: number }[];
  pelanggan: { nama: string; pesanan: number; unit: number; omzet: number }[];
  walkIn: { pesanan: number; omzet: number };
  caraBayar: { metode: string; label: string; nominal: number }[];
}

const NAMA_HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const LABEL_BAYAR: Record<string, string> = { tunai: 'Tunai', qris: 'QRIS', transfer: 'Transfer', edc: 'EDC', hutang: 'Hutang', dp: 'DP', split: 'Campuran' };

function layak(p: Pesanan): boolean {
  return !!p && p.status_pesanan !== 'batal' && p.tipe_transaksi !== 'pelunasan_hutang';
}

function unitDari(p: Pesanan): number {
  return (p.items || []).reduce((a, i) => a + (i && !(i.nama_produk || '').startsWith('Pelunasan') ? (i.jumlah || 0) : 0), 0);
}

function angka(list: Pesanan[]): AngkaRekap {
  return { omzet: list.reduce((a, p) => a + (p.total_akhir || 0), 0), transaksi: list.length, unit: list.reduce((a, p) => a + unitDari(p), 0) };
}

export function hitungRekap(periode: PeriodeRekap, sekarang: Date = new Date()): DataRekap {
  const semua = AppStore.getPesanan().filter(layak);

  let mulai: Date, akhir: Date, label: string, mulaiLalu: Date, akhirLalu: Date, labelLalu: string;
  if (periode === 'harian') {
    mulai = new Date(sekarang); mulai.setHours(0, 0, 0, 0);
    akhir = new Date(mulai); akhir.setHours(23, 59, 59, 999);
    mulaiLalu = new Date(mulai); mulaiLalu.setDate(mulai.getDate() - 1);
    akhirLalu = new Date(mulaiLalu); akhirLalu.setHours(23, 59, 59, 999);
    label = mulai.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    labelLalu = 'Kemarin';
  } else {
    const r = periode === 'mingguan' ? rentangMingguDari(sekarang) : rentangBulanDari(sekarang);
    const lalu = rentangSebelumnya(r);
    mulai = r.mulai; akhir = r.akhir; label = r.label;
    mulaiLalu = lalu.mulai; akhirLalu = lalu.akhir; labelLalu = lalu.label;
  }

  const dalam = (p: Pesanan, a: Date, b: Date) => { const t = new Date(p.created_at).getTime(); return t >= a.getTime() && t <= b.getTime(); };
  const ini = semua.filter(p => dalam(p, mulai, akhir));
  const lalu = semua.filter(p => dalam(p, mulaiLalu, akhirLalu));

  // Deret waktu: per jam untuk hari ini, per hari untuk minggu dan bulan
  const deret: DataRekap['deret'] = [];
  if (periode === 'harian') {
    for (let j = 0; j < 24; j++) deret.push({ label: String(j).padStart(2, '0'), omzet: 0, transaksi: 0 });
    ini.forEach(p => { const j = new Date(p.created_at).getHours(); deret[j].omzet += p.total_akhir || 0; deret[j].transaksi += 1; });
  } else {
    const peta = new Map<string, number>();
    const hari = new Date(mulai);
    while (hari.getTime() <= akhir.getTime()) {
      peta.set(kunciTanggal(hari), deret.length);
      deret.push({ label: periode === 'mingguan' ? NAMA_HARI[hari.getDay()] : String(hari.getDate()), omzet: 0, transaksi: 0 });
      hari.setDate(hari.getDate() + 1);
    }
    ini.forEach(p => { const i = peta.get(kunciTanggal(new Date(p.created_at))); if (i !== undefined) { deret[i].omzet += p.total_akhir || 0; deret[i].transaksi += 1; } });
  }

  // Produk terlaris
  const perProduk = new Map<string, { nama: string; jumlah: number; omzet: number }>();
  ini.forEach(p => (p.items || []).forEach(i => {
    if (!i || (i.nama_produk || '').startsWith('Pelunasan')) return;
    const b = perProduk.get(i.nama_produk) || { nama: i.nama_produk, jumlah: 0, omzet: 0 };
    b.jumlah += i.jumlah || 0; b.omzet += (i.harga_satuan || 0) * (i.jumlah || 0); perProduk.set(i.nama_produk, b);
  }));

  // Pelanggan terbanyak (pelanggan umum / walk-in dipisah karena bukan satu orang)
  const perPlg = new Map<string, { nama: string; pesanan: number; unit: number; omzet: number }>();
  const walkIn = { pesanan: 0, omzet: 0 };
  ini.forEach(p => {
    if (!p.kontak_id || p.kontak_id === 'kt-1') { walkIn.pesanan += 1; walkIn.omzet += p.total_akhir || 0; return; }
    const b = perPlg.get(p.kontak_id) || { nama: p.nama_pelanggan, pesanan: 0, unit: 0, omzet: 0 };
    b.pesanan += 1; b.unit += unitDari(p); b.omzet += p.total_akhir || 0; perPlg.set(p.kontak_id, b);
  });

  // Cara bayar (dari rincian pembayaran tiap pesanan)
  const perBayar = new Map<string, number>();
  ini.forEach(p => (p.pembayaran_details || []).forEach(d => { if (d && d.jumlah > 0) perBayar.set(d.metode, (perBayar.get(d.metode) || 0) + d.jumlah); }));

  return {
    periode, label, labelSebelumnya: labelLalu,
    ini: angka(ini), sebelumnya: angka(lalu),
    deret,
    produk: Array.from(perProduk.values()).sort((a, b) => b.jumlah - a.jumlah || b.omzet - a.omzet).slice(0, 10),
    pelanggan: Array.from(perPlg.values()).sort((a, b) => b.omzet - a.omzet || b.pesanan - a.pesanan).slice(0, 10),
    walkIn,
    caraBayar: Array.from(perBayar.entries()).map(([metode, nominal]) => ({ metode, label: LABEL_BAYAR[metode] || metode, nominal })).sort((a, b) => b.nominal - a.nominal),
  };
}

// Perubahan dalam persen dibanding periode sebelumnya; null bila tidak bisa dibandingkan
export function selisihPersen(sekarang: number, sebelum: number): number | null {
  if (sebelum <= 0) return sekarang > 0 ? null : 0;
  return Math.round(((sekarang - sebelum) / sebelum) * 100);
}
