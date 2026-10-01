import { AppStore } from './store';
import { ambilTarget } from './target';
import { hitungFrekuensiSemua } from './sebaran';
import { Pesanan, Pengeluaran } from './types';

// Laporan mingguan (Senin sampai Minggu) dan bulanan (kalender) untuk owner.
// Rumus laba rugi mengikuti Dashboard Owner supaya angkanya sama.

export type JenisLaporan = 'mingguan' | 'bulanan';

export interface RentangLaporan {
  jenis: JenisLaporan;
  mulai: Date;       // 00:00 hari pertama
  akhir: Date;       // 23:59:59.999 hari terakhir
  label: string;     // mis. "28 Sep - 4 Okt 2026" atau "September 2026"
  kunci: string;     // pengenal unik, mis. 2026-09-28 atau 2026-09
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const LABEL_KATEGORI: Record<string, string> = {
  operasional: 'Operasional depo',
  lain_lain: 'Lain-lain',
  konsumsi: 'Konsumsi / uang makan',
  bensin: 'Bensin dan BBM',
  ongkir: 'Ongkir kurir',
  gaji: 'Gaji karyawan',
  kasbon: 'Kasbon karyawan',
  pengembalian_kasbon: 'Pengembalian kasbon',
  pembelian_air_baku: 'Pembelian air baku',
  bayar_hutang_toko: 'Bayar hutang toko',
};

function awalHari(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function akhirHari(d: Date): Date { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
export function kunciTanggal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function rentangMingguDari(tanggal: Date): RentangLaporan {
  const hari = awalHari(tanggal);
  const selisihSenin = (hari.getDay() + 6) % 7; // Senin = 0
  const mulai = new Date(hari); mulai.setDate(hari.getDate() - selisihSenin);
  const akhirMinggu = new Date(mulai); akhirMinggu.setDate(mulai.getDate() + 6);
  const sama = mulai.getMonth() === akhirMinggu.getMonth();
  const label = sama
    ? `${mulai.getDate()} - ${akhirMinggu.getDate()} ${BULAN_PENDEK[akhirMinggu.getMonth()]} ${akhirMinggu.getFullYear()}`
    : `${mulai.getDate()} ${BULAN_PENDEK[mulai.getMonth()]} - ${akhirMinggu.getDate()} ${BULAN_PENDEK[akhirMinggu.getMonth()]} ${akhirMinggu.getFullYear()}`;
  return { jenis: 'mingguan', mulai, akhir: akhirHari(akhirMinggu), label, kunci: kunciTanggal(mulai) };
}

export function rentangBulanDari(tanggal: Date): RentangLaporan {
  const mulai = new Date(tanggal.getFullYear(), tanggal.getMonth(), 1);
  const akhir = new Date(tanggal.getFullYear(), tanggal.getMonth() + 1, 0);
  return {
    jenis: 'bulanan', mulai, akhir: akhirHari(akhir),
    label: `${BULAN[mulai.getMonth()]} ${mulai.getFullYear()}`,
    kunci: `${mulai.getFullYear()}-${String(mulai.getMonth() + 1).padStart(2, '0')}`
  };
}

// Daftar pilihan periode, yang terbaru di atas. Periode yang sedang berjalan ikut ditandai belum selesai.
export function daftarRentang(jenis: JenisLaporan, jumlah = 12, sekarang: Date = new Date()): (RentangLaporan & { berjalan: boolean })[] {
  const hasil: (RentangLaporan & { berjalan: boolean })[] = [];
  let acuan = new Date(sekarang);
  for (let i = 0; i < jumlah; i++) {
    const r = jenis === 'mingguan' ? rentangMingguDari(acuan) : rentangBulanDari(acuan);
    hasil.push({ ...r, berjalan: sekarang.getTime() <= r.akhir.getTime() });
    acuan = new Date(r.mulai); acuan.setDate(acuan.getDate() - 1);
  }
  return hasil;
}

// Periode terakhir yang sudah selesai (minggu lalu / bulan lalu)
export function rentangTerakhirSelesai(jenis: JenisLaporan, sekarang: Date = new Date()): RentangLaporan {
  const hari = awalHari(sekarang);
  if (jenis === 'mingguan') { const lalu = new Date(hari); lalu.setDate(hari.getDate() - 7); return rentangMingguDari(lalu); }
  return rentangBulanDari(new Date(hari.getFullYear(), hari.getMonth() - 1, 1));
}

export function rentangSebelumnya(r: RentangLaporan): RentangLaporan {
  const acuan = new Date(r.mulai); acuan.setDate(acuan.getDate() - 1);
  return r.jenis === 'mingguan' ? rentangMingguDari(acuan) : rentangBulanDari(acuan);
}

// ---------------------------------------------------------------------

export interface AngkaPeriode {
  omzet: number;
  transaksi: number;
  galon: number;
  liter: number;
  biayaOperasional: number;
  hpp: number;
  labaBersih: number;
}

export interface DataLaporan {
  rentang: RentangLaporan;
  sebelumnya: AngkaPeriode & { label: string };
  ini: AngkaPeriode;
  target: { omzet: number; galon: number; liter: number };
  perHari: { tanggal: Date; omzet: number }[];
  hppPerLiter: number;
  hppDiperkirakan: boolean;
  biayaPerKategori: { kategori: string; label: string; nominal: number }[];
  labaKotor: number;
  marginPersen: number;
  uang: {
    tunaiLangsung: number; setoranKurir: number; nonTunai: number; hutangBaru: number;
    pengeluaranLaci: number; diserahkanOwner: number;
    selisihKasir: { kasir: string; shift: number; selisihLaci: number; selisihSetoran: number }[];
    saldoAkhir: { nama: string; saldo: number }[] | null;
  };
  piutang: { total: number; jumlahPelanggan: number; teratas: { nama: string; hutang: number }[] };
  karyawan: { gajiDibayar: number; kasbonDiberikan: number; kasbonDikembalikan: number; ongkirDibayar: number; kasbonAktif: number };
  pelanggan: {
    teratas: { nama: string; pesanan: number; omzet: number }[];
    baruBertransaksi: number; aktif: number; lamaTidakBeli: number; belumPernah: number;
  };
  produk: { nama: string; jumlah: number; omzet: number }[];
  airBaku: { stokSekarang: number; minimum: number; dibeliLiter: number; dibeliBiaya: number; terjualLiter: number; pemakaianMeterLiter: number | null };
}

function dalam(iso: string | undefined, r: { mulai: Date; akhir: Date }): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= r.mulai.getTime() && t <= r.akhir.getTime();
}

function literItem(it: { produk_id: string; nama_produk?: string; jumlah?: number }, produk: { id: string; volume_liter?: number }[]): number {
  const prod = produk.find(p => p && p.id === it.produk_id);
  const nama = it.nama_produk || '';
  const vol = prod ? (prod.volume_liter || 19) : nama.includes('19L') ? 19 : nama.includes('15L') ? 15 : 10;
  return vol * (it.jumlah || 0);
}

function hitungAngka(pesananAll: Pesanan[], pengeluaranAll: Pengeluaran[], produk: any[], r: RentangLaporan, hppPerLiter: number) {
  const pesanan = pesananAll.filter(p => p && p.status_pesanan !== 'batal' && dalam(p.created_at, r));
  const omzet = pesanan.reduce((a, p) => a + (p.total_akhir || 0), 0);
  const galon = pesanan.reduce((a, p) => a + (p.items || []).filter(i => i && (i.nama_produk || '').includes('Galon')).reduce((s, i) => s + (i.jumlah || 0), 0), 0);
  const liter = pesanan.reduce((a, p) => a + (p.items || []).reduce((s, i) => s + (i ? literItem(i, produk) : 0), 0), 0);
  const biayaOperasional = pengeluaranAll
    .filter(p => p && dalam(p.tanggal, r) && p.tipe_arus_kas !== 'masuk' && p.kategori !== 'pengembalian_kasbon' && p.kategori !== 'pembelian_air_baku')
    .reduce((a, p) => a + (p.nominal || 0), 0);
  const hpp = Math.round(liter * hppPerLiter);
  const labaBersih = Math.max(0, omzet - (hpp + biayaOperasional));
  return { omzet, transaksi: pesanan.length, galon, liter, biayaOperasional, hpp, labaBersih, pesanan };
}

export function hitungLaporan(rentang: RentangLaporan): DataLaporan {
  const pesananAll = AppStore.getPesanan();
  const pengeluaranAll = AppStore.getPengeluaran();
  const produk = AppStore.getProduk();
  const kontak = AppStore.getKontak();
  const pengaturan = AppStore.getPengaturan();
  const sebelumnyaR = rentangSebelumnya(rentang);

  // HPP air per liter: dari pembelian air baku pada periode, kalau tidak ada dari seluruh riwayat, kalau tidak ada nilai standar depo
  const beliAir = (r: { mulai: Date; akhir: Date } | null) => pengeluaranAll.filter(p => p && p.kategori === 'pembelian_air_baku' && (p.volume_air_masuk_liter || 0) > 0 && (!r || dalam(p.tanggal, r)));
  const jumlahBiaya = (l: Pengeluaran[]) => l.reduce((a, p) => a + (p.nominal || 0), 0);
  const jumlahVol = (l: Pengeluaran[]) => l.reduce((a, p) => a + (p.volume_air_masuk_liter || 0), 0);
  const beliPeriode = beliAir(rentang);
  const beliSemua = beliAir(null);
  let hppPerLiter = 37.5; let hppDiperkirakan = true;
  if (jumlahVol(beliPeriode) > 0) { hppPerLiter = jumlahBiaya(beliPeriode) / jumlahVol(beliPeriode); hppDiperkirakan = false; }
  else if (jumlahVol(beliSemua) > 0) { hppPerLiter = jumlahBiaya(beliSemua) / jumlahVol(beliSemua); hppDiperkirakan = false; }

  const ini = hitungAngka(pesananAll, pengeluaranAll, produk, rentang, hppPerLiter);
  const prev = hitungAngka(pesananAll, pengeluaranAll, produk, sebelumnyaR, hppPerLiter);

  // Omzet per hari
  const perHari: { tanggal: Date; omzet: number }[] = [];
  for (let d = new Date(rentang.mulai); d.getTime() <= rentang.akhir.getTime(); d.setDate(d.getDate() + 1)) {
    const hari = new Date(d);
    const kunci = kunciTanggal(hari);
    perHari.push({ tanggal: hari, omzet: ini.pesanan.filter(p => kunciTanggal(new Date(p.created_at)) === kunci).reduce((a, p) => a + (p.total_akhir || 0), 0) });
  }

  // Biaya per kategori (rumus dashboard: semua pengeluaran kas kecuali pembelian air baku dan pengembalian kasbon)
  const peta = new Map<string, number>();
  pengeluaranAll
    .filter(p => p && dalam(p.tanggal, rentang) && p.tipe_arus_kas !== 'masuk' && p.kategori !== 'pengembalian_kasbon' && p.kategori !== 'pembelian_air_baku')
    .forEach(p => { const k = p.kategori || 'operasional'; peta.set(k, (peta.get(k) || 0) + (p.nominal || 0)); });
  const biayaPerKategori = Array.from(peta.entries())
    .map(([kategori, nominal]) => ({ kategori, label: LABEL_KATEGORI[kategori] || kategori, nominal }))
    .sort((a, b) => b.nominal - a.nominal);

  // Uang
  const kas = AppStore.hitungKasLaci(0, rentang.mulai.getTime(), rentang.akhir.getTime());
  const nonTunai = ini.pesanan.reduce((a, p) => a + (p.pembayaran_details || []).filter(d => d && d.metode !== 'tunai' && d.metode !== 'hutang').reduce((s, d) => s + (d.jumlah || 0), 0), 0);
  const hutangBaru = ini.pesanan.reduce((a, p) => a + (p.sisa_hutang || 0), 0);

  const kasirMap = new Map<string, { kasir: string; shift: number; selisihLaci: number; selisihSetoran: number }>();
  const ambilKasir = (nama: string) => { const k = (nama || 'Kasir').trim().toLowerCase(); let b = kasirMap.get(k); if (!b) { b = { kasir: nama || 'Kasir', shift: 0, selisihLaci: 0, selisihSetoran: 0 }; kasirMap.set(k, b); } return b; };
  AppStore.getShiftList().filter(s => s.status === 'tutup' && dalam(s.waktu_tutup, rentang)).forEach(s => { const b = ambilKasir(s.kasir_nama || ''); b.shift += 1; b.selisihLaci += s.selisih || 0; });
  AppStore.getSetoranOwner().filter(s => s.status === 'diterima' && s.jenis === 'serah_kasir' && dalam(s.diterima_at, rentang)).forEach(s => { ambilKasir(s.kasir_nama).selisihSetoran += s.selisih || 0; });

  let saldoAkhir: { nama: string; saldo: number }[] | null = null;
  if (AppStore.keuanganSudahMulai()) {
    const saldoPada = (akun: string) => {
      const buku = AppStore.getBukuKas(akun).filter(b => new Date(b.waktu).getTime() <= rentang.akhir.getTime());
      return buku.length ? buku[buku.length - 1].saldo : 0;
    };
    saldoAkhir = [{ nama: 'Kas besar (tunai)', saldo: saldoPada('kas_besar') }, ...AppStore.getRekening().filter(x => x.aktif).map(x => ({ nama: x.nama, saldo: saldoPada(x.id) }))];
  }

  // Piutang (posisi saat laporan dibuat)
  const penunggak = kontak.filter(k => k && (k.hutang_saat_ini || 0) > 0).sort((a, b) => (b.hutang_saat_ini || 0) - (a.hutang_saat_ini || 0));
  const piutang = {
    total: penunggak.reduce((a, k) => a + (k.hutang_saat_ini || 0), 0),
    jumlahPelanggan: penunggak.length,
    teratas: penunggak.slice(0, 5).map(k => ({ nama: k.nama, hutang: k.hutang_saat_ini || 0 }))
  };

  // Karyawan
  const dalamPeng = pengeluaranAll.filter(p => p && dalam(p.tanggal, rentang));
  const jum = (kat: string) => dalamPeng.filter(p => p.kategori === kat).reduce((a, p) => a + (p.nominal || 0), 0);
  const karyawan = {
    gajiDibayar: jum('gaji'), kasbonDiberikan: jum('kasbon'), kasbonDikembalikan: jum('pengembalian_kasbon'), ongkirDibayar: jum('ongkir'),
    kasbonAktif: (pengaturan.karyawan_list || []).reduce((a, k) => a + AppStore.getSisaKasbon(k.id), 0)
  };

  // Pelanggan
  const perPlg = new Map<string, { nama: string; pesanan: number; omzet: number }>();
  ini.pesanan.forEach(p => {
    const kunci = p.kontak_id || p.nama_pelanggan;
    const b = perPlg.get(kunci) || { nama: p.nama_pelanggan, pesanan: 0, omzet: 0 };
    b.pesanan += 1; b.omzet += p.total_akhir || 0; perPlg.set(kunci, b);
  });
  const pertamaBeli = new Map<string, number>();
  pesananAll.filter(p => p && p.status_pesanan !== 'batal' && p.kontak_id).forEach(p => {
    const t = new Date(p.created_at).getTime(); const lama = pertamaBeli.get(p.kontak_id as string);
    if (lama === undefined || t < lama) pertamaBeli.set(p.kontak_id as string, t);
  });
  const baruBertransaksi = Array.from(pertamaBeli.entries()).filter(([id, t]) => id !== 'kt-1' && t >= rentang.mulai.getTime() && t <= rentang.akhir.getTime()).length;
  const frek = hitungFrekuensiSemua(kontak.filter(k => k.aktif), pesananAll, produk, rentang.akhir.getTime());
  let aktif = 0, lama = 0, belum = 0;
  frek.forEach(f => { if (f.kategori === 'belum') belum++; else if (f.kategori === 'lama') lama++; else aktif++; });
  const pelanggan = {
    teratas: Array.from(perPlg.values()).sort((a, b) => b.omzet - a.omzet).slice(0, 5),
    baruBertransaksi, aktif, lamaTidakBeli: lama, belumPernah: belum
  };

  // Produk terlaris
  const perProduk = new Map<string, { nama: string; jumlah: number; omzet: number }>();
  ini.pesanan.forEach(p => (p.items || []).forEach(i => {
    if (!i || (i.nama_produk || '').startsWith('Pelunasan')) return;
    const b = perProduk.get(i.nama_produk) || { nama: i.nama_produk, jumlah: 0, omzet: 0 };
    b.jumlah += i.jumlah || 0; b.omzet += (i.harga_satuan || 0) * (i.jumlah || 0); perProduk.set(i.nama_produk, b);
  }));

  // Air baku
  const shiftTutup = AppStore.getShiftList().filter(s => s.status === 'tutup' && dalam(s.waktu_tutup, rentang));
  const pemakaianMeter = shiftTutup.length > 0 ? shiftTutup.reduce((a, s) => a + (s.total_pemakaian_air_liter || 0), 0) : null;

  return {
    rentang,
    sebelumnya: { omzet: prev.omzet, transaksi: prev.transaksi, galon: prev.galon, liter: prev.liter, biayaOperasional: prev.biayaOperasional, hpp: prev.hpp, labaBersih: prev.labaBersih, label: sebelumnyaR.label },
    ini: { omzet: ini.omzet, transaksi: ini.transaksi, galon: ini.galon, liter: ini.liter, biayaOperasional: ini.biayaOperasional, hpp: ini.hpp, labaBersih: ini.labaBersih },
    target: {
      omzet: ambilTarget(pengaturan, 'omzet', rentang.jenis), galon: ambilTarget(pengaturan, 'galon', rentang.jenis), liter: ambilTarget(pengaturan, 'liter', rentang.jenis)
    },
    perHari,
    hppPerLiter, hppDiperkirakan,
    biayaPerKategori,
    labaKotor: ini.omzet - ini.hpp,
    marginPersen: ini.omzet > 0 ? Math.round((ini.labaBersih / ini.omzet) * 100) : 0,
    uang: {
      tunaiLangsung: kas.tunaiLangsung, setoranKurir: kas.setoranKurir, nonTunai, hutangBaru,
      pengeluaranLaci: kas.keluar, diserahkanOwner: kas.diserahkanOwner,
      selisihKasir: Array.from(kasirMap.values()), saldoAkhir
    },
    piutang, karyawan, pelanggan,
    produk: Array.from(perProduk.values()).sort((a, b) => b.jumlah - a.jumlah).slice(0, 5),
    airBaku: {
      stokSekarang: pengaturan.stok_air_baku_saat_ini ?? 0, minimum: pengaturan.min_stok_air_baku_liter ?? 2000,
      dibeliLiter: jumlahVol(beliPeriode), dibeliBiaya: jumlahBiaya(beliPeriode), terjualLiter: ini.liter, pemakaianMeterLiter: pemakaianMeter
    }
  };
}

// Perubahan dalam persen dibanding periode sebelumnya; null bila tidak bisa dibandingkan
export function perubahanPersen(sekarang: number, sebelum: number): number | null {
  if (sebelum <= 0) return sekarang > 0 ? null : 0;
  return Math.round(((sekarang - sebelum) / sebelum) * 100);
}
