import { PengaturanDepo, Pesanan, Pengeluaran } from './types';
import { AppStore } from './store';

// Cetak struk ke printer thermal (mis. Panda 58 mm lewat Bluetooth).
// - Metode 'rawbt': aplikasi RawBT (Android) menerima perintah ESC/POS dari tautan dan mencetak tanpa dialog.
// - Metode 'dialog': dialog cetak bawaan browser (ukuran kertas diatur lewat @page).

export type MetodeCetak = 'dialog' | 'rawbt';

export interface BarisStruk {
  teks: string;
  rata?: 'kiri' | 'tengah';
  tebal?: boolean;
}

export function kolomKertas(lebarMm: number | undefined): number {
  return lebarMm === 80 ? 48 : 32;
}

// Printer thermal hanya paham karakter sederhana: buang aksen dan ganti yang tidak dikenal
export function bersihkanTeks(t: string): string {
  return String(t ?? '')
    .replace(/[  ]/g, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7e]/g, '?');
}

function bungkus(teks: string, lebar: number): string[] {
  const hasil: string[] = [];
  teks.split('\n').forEach(paragraf => {
    let sisa = paragraf.trim();
    if (sisa === '') { hasil.push(''); return; }
    while (sisa.length > lebar) {
      let potong = sisa.lastIndexOf(' ', lebar);
      if (potong <= 0) potong = lebar;
      hasil.push(sisa.slice(0, potong).trimEnd());
      sisa = sisa.slice(potong).trimStart();
    }
    hasil.push(sisa);
  });
  return hasil;
}

// "kiri .......... kanan" dalam satu baris selebar kertas
function kiriKanan(kiri: string, kanan: string, lebar: number): string[] {
  const k = bersihkanTeks(kiri);
  const r = bersihkanTeks(kanan);
  if (k.length + 1 + r.length <= lebar) return [k + ' '.repeat(lebar - k.length - r.length) + r];
  const baris = bungkus(k, lebar);
  baris.push(' '.repeat(Math.max(0, lebar - r.length)) + r);
  return baris;
}

function garis(lebar: number, ch = '-'): string {
  return ch.repeat(lebar);
}

function rp(n: number): string {
  return bersihkanTeks(AppStore.formatRupiah(n));
}

// Alat bantu menyusun baris struk selebar kertas
function penyusun(peng: PengaturanDepo) {
  const L = kolomKertas(peng.printer_lebar_mm);
  const baris: BarisStruk[] = [];
  // Bungkus dulu (baris baru di teks dihormati), baru dibersihkan per baris
  const tengah = (t: string, tebal = false) => bungkus(t, L).forEach(b => baris.push({ teks: bersihkanTeks(b), rata: 'tengah', tebal }));
  const kiri = (t: string) => bungkus(t, L).forEach(b => baris.push({ teks: bersihkanTeks(b) }));
  const dua = (a: string, b: string, tebal = false) => kiriKanan(a, b, L).forEach(x => baris.push({ teks: x, tebal }));
  const garisStrip = () => baris.push({ teks: garis(L) });
  const garisSama = () => baris.push({ teks: garis(L, '=') });
  const kosong = (n = 1) => { for (let i = 0; i < n; i++) baris.push({ teks: '' }); };
  return { L, baris, tengah, kiri, dua, garisStrip, garisSama, kosong };
}

function kepala(s: ReturnType<typeof penyusun>, peng: PengaturanDepo, judul: string) {
  s.tengah(peng.nama_depo || 'Depo Air', true);
  if (peng.alamat) s.tengah(peng.alamat);
  if (peng.no_wa) s.tengah(`WA: ${peng.no_wa}`);
  s.garisSama();
  s.tengah(judul, true);
  s.garisSama();
}

export function susunStrukPenjualan(p: Pesanan, peng: PengaturanDepo): BarisStruk[] {
  const { L, baris, tengah, kiri, dua } = penyusun(peng);

  tengah(peng.nama_depo || 'Depo Air', true);
  if (peng.alamat) tengah(peng.alamat);
  if (peng.no_wa) tengah(`WA: ${peng.no_wa}`);
  baris.push({ teks: garis(L) });

  kiri(`No   : ${p.no_nota}`);
  kiri(`Tgl  : ${new Date(p.created_at).toLocaleString('id-ID')}`);
  kiri(`Plgn : ${p.nama_pelanggan}`);
  kiri(`Tipe : ${p.tipe_transaksi.toUpperCase().replace(/_/g, ' ')}`);
  baris.push({ teks: garis(L) });

  p.items.forEach(item => {
    dua(`${item.nama_produk} x${item.jumlah}`, rp(item.subtotal));
    if (item.harga_khusus) kiri(`  @${rp(item.harga_satuan)} (harga khusus)`);
  });
  if (p.total_ongkir > 0) dua('Ongkir Delivery', rp(p.total_ongkir));
  baris.push({ teks: garis(L) });

  dua('TOTAL', rp(p.total_akhir), true);
  if (p.bayar_ke_kurir && !p.kurir_diterima_at) {
    tengah('Bayar tunai ke kurir saat barang tiba', true);
  } else {
    (p.pembayaran_details || []).forEach(pay => dua(`Bayar (${String(pay.metode).toUpperCase()})`, rp(pay.jumlah)));
  }
  if (p.sisa_hutang > 0) dua('SISA HUTANG', rp(p.sisa_hutang), true);

  baris.push({ teks: garis(L, '=') });
  if (peng.footer_struk) tengah(peng.footer_struk);
  return baris;
}

export function susunStrukUji(peng: PengaturanDepo): BarisStruk[] {
  const L = kolomKertas(peng.printer_lebar_mm);
  const angka = '1234567890'.repeat(5).slice(0, L);
  return [
    { teks: 'UJI CETAK', rata: 'tengah', tebal: true },
    { teks: bersihkanTeks(peng.nama_depo || 'Depo Air'), rata: 'tengah' },
    { teks: garis(L) },
    { teks: angka },
    { teks: `Kertas ${peng.printer_lebar_mm === 80 ? 80 : 58} mm` },
    { teks: `${L} huruf per baris` },
    ...kiriKanan('Contoh item x2', 'Rp 8.000', L).map(t => ({ teks: t })),
    ...kiriKanan('TOTAL', 'Rp 8.000', L).map(t => ({ teks: t, tebal: true })),
    { teks: garis(L, '=') },
    { teks: 'Kalau tulisan ini rapi dan', rata: 'tengah' },
    { teks: 'tidak terpotong, printer siap.', rata: 'tengah' },
  ];
}

// Perintah ESC/POS standar yang dipahami printer thermal
export function susunEscPos(baris: BarisStruk[], opsi: { bukaLaci?: boolean } = {}): Uint8Array {
  const b: number[] = [];
  const kirim = (...x: number[]) => b.push(...x);
  kirim(0x1b, 0x40);                                  // inisialisasi
  baris.forEach(l => {
    kirim(0x1b, 0x61, l.rata === 'tengah' ? 1 : 0);   // rata tengah/kiri
    kirim(0x1b, 0x45, l.tebal ? 1 : 0);               // tebal
    for (const ch of bersihkanTeks(l.teks)) kirim(ch.charCodeAt(0));
    kirim(0x0a);
  });
  kirim(0x1b, 0x45, 0, 0x1b, 0x61, 0);
  kirim(0x1b, 0x64, 4);                               // dorong kertas 4 baris
  if (opsi.bukaLaci) kirim(0x1b, 0x70, 0x00, 0x19, 0xfa); // picu laci kas
  return Uint8Array.from(b);
}

function keBase64(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach(x => { s += String.fromCharCode(x); });
  return btoa(s);
}

export function urlRawBt(bytes: Uint8Array): string {
  return `rawbt:base64,${keBase64(bytes)}`;
}

function cetakDialog(lebarMm: number | undefined) {
  const gaya = document.createElement('style');
  gaya.textContent = `@page { size: ${lebarMm === 80 ? 80 : 58}mm auto; margin: 3mm; }`;
  document.head.appendChild(gaya);
  window.print();
  setTimeout(() => gaya.remove(), 1000);
}

function kirimRawBt(baris: BarisStruk[], peng: PengaturanDepo, bukaLaci: boolean) {
  window.location.href = urlRawBt(susunEscPos(baris, { bukaLaci }));
}

// Cetak struk penjualan sesuai pengaturan toko
export function cetakStrukPenjualan(p: Pesanan, opsi: { otomatis?: boolean } = {}) {
  const peng = AppStore.getPengaturan();
  const metode: MetodeCetak = peng.printer_metode === 'rawbt' ? 'rawbt' : 'dialog';
  if (metode === 'rawbt') {
    const tunai = (p.pembayaran_details || []).some(d => d.metode === 'tunai');
    kirimRawBt(susunStrukPenjualan(p, peng), peng, !!peng.printer_buka_laci && tunai && !(p.bayar_ke_kurir && !p.kurir_diterima_at));
    return;
  }
  if (!opsi.otomatis) cetakDialog(peng.printer_lebar_mm);
}

export function cetakUji(peng: PengaturanDepo) {
  if (peng.printer_metode === 'rawbt') {
    kirimRawBt(susunStrukUji(peng), peng, false);
  } else {
    cetakDialog(peng.printer_lebar_mm);
  }
}

export interface DataBukaShift {
  kasir: string;
  waktuBuka: string;
  kasAwal: number;
  meterAwal: number;
  ownerNama: string;
}

export function susunStrukBukaShift(d: DataBukaShift, peng: PengaturanDepo): BarisStruk[] {
  const s = penyusun(peng);
  kepala(s, peng, 'STRUK BUKA SHIFT KASIR');
  s.kiri(`Kasir : ${d.kasir}`);
  s.kiri(`Buka  : ${new Date(d.waktuBuka).toLocaleString('id-ID')}`);
  s.garisStrip();
  s.dua('MODAL KAS AWAL', rp(d.kasAwal), true);
  s.dua('METERAN AIR AWAL', `${d.meterAwal.toLocaleString('id-ID')} L`, true);
  s.garisStrip();
  s.kosong(2);
  s.kiri('Petugas Shift:');
  s.kosong(2);
  s.tengah(`( ${d.kasir} )`);
  s.kosong(1);
  s.kiri('Pengelola Depo:');
  s.kosong(2);
  s.tengah(`( ${d.ownerNama || 'Owner'} )`);
  s.garisSama();
  s.tengah(peng.footer_struk || 'Struk Buka Shift Sah Depo Air');
  return s.baris;
}

export interface DataTutupShift {
  kasir: string;
  waktuBuka: string;
  waktuTutup: string;
  modalAwal: number;
  penjualanTunai: number;
  setoranKurir: number;
  pelunasanKasbon: number;
  pengeluaran: number;
  diserahkanSebelumnya: number;
  ekspektasi: number;
  uangDiKurir: number;
  serahOwner: number;
  kasFisik: number;
  sisaLaci: number;
  selisih: number;
  meterAwal: number;
  meterAkhir: number;
  pemakaianAir: number;
  ownerNama: string;
}

export function susunStrukTutupShift(d: DataTutupShift, peng: PengaturanDepo): BarisStruk[] {
  const s = penyusun(peng);
  kepala(s, peng, 'STRUK TUTUP SHIFT & SETORAN');
  s.kiri(`Kasir : ${d.kasir}`);
  s.kiri(`Buka  : ${new Date(d.waktuBuka).toLocaleString('id-ID')}`);
  s.kiri(`Tutup : ${new Date(d.waktuTutup).toLocaleString('id-ID')}`);
  s.garisStrip();
  s.tengah('RINCIAN KAS LACI', true);
  s.dua('Modal Awal Kas', rp(d.modalAwal));
  s.dua('Penjualan Tunai (+)', rp(d.penjualanTunai));
  if (d.setoranKurir > 0) s.dua('Setoran Kurir (+)', rp(d.setoranKurir));
  if (d.pelunasanKasbon > 0) s.dua('Pelunasan Kasbon (+)', rp(d.pelunasanKasbon));
  s.dua('Pengeluaran Kas (-)', d.pengeluaran > 0 ? `-${rp(d.pengeluaran)}` : rp(0));
  if (d.diserahkanSebelumnya > 0) s.dua('Diserahkan Owner (-)', `-${rp(d.diserahkanSebelumnya)}`);
  s.garisStrip();
  s.dua('Ekspektasi Kas', rp(d.ekspektasi), true);
  if (d.uangDiKurir > 0) s.dua('Uang di kurir', rp(d.uangDiKurir));
  s.garisSama();
  s.dua('KAS DISETOR OWNER', rp(d.serahOwner), true);
  s.dua('Uang laci saat tutup', rp(d.kasFisik));
  if (d.sisaLaci > 0) s.dua('Tetap di laci', rp(d.sisaLaci));
  s.dua('Selisih Kas', d.selisih === 0 ? 'PAS (Rp 0)' : rp(d.selisih), true);
  s.garisSama();
  s.tengah('AIR BAKU & METERAN', true);
  s.dua('Meteran Awal', `${d.meterAwal.toLocaleString('id-ID')} L`);
  s.dua('Meteran Akhir', `${d.meterAkhir.toLocaleString('id-ID')} L`);
  s.dua('Pemakaian Air', `${d.pemakaianAir.toLocaleString('id-ID')} L`, true);
  s.garisStrip();
  s.kosong(1);
  s.kiri('Diserahkan oleh:');
  s.kosong(2);
  s.tengah(`( ${d.kasir} )`);
  s.kosong(1);
  s.kiri('Diterima oleh:');
  s.kosong(2);
  s.tengah(`( ${d.ownerNama || 'Owner'} )`);
  s.garisSama();
  s.tengah(peng.footer_struk || 'Struk Laporan Shift Sah Depo Air');
  return s.baris;
}

// Cetak struk non-penjualan (shift) sesuai pengaturan: RawBT atau dialog browser
export function cetakStrukBaris(baris: BarisStruk[]) {
  const peng = AppStore.getPengaturan();
  if (peng.printer_metode === 'rawbt') {
    kirimRawBt(baris, peng, false);
  } else {
    cetakDialog(peng.printer_lebar_mm);
  }
}

// Bukti kas keluar/masuk (pengeluaran, gaji, kasbon, pembelian air baku, dll)
export function susunBuktiKas(x: Pengeluaran, peng: PengaturanDepo, telpOwner: string): BarisStruk[] {
  const masuk = x.tipe_arus_kas === 'masuk';
  const s = penyusun(peng);
  s.tengah(peng.nama_depo || 'Depo Air', true);
  if (peng.alamat) s.tengah(peng.alamat);
  s.tengah(`Telp/WA Owner: ${telpOwner || '-'}`);
  s.garisSama();
  s.tengah(`BUKTI KAS ${masuk ? 'MASUK' : 'KELUAR'}`, true);
  s.garisSama();
  s.kiri(`No   : ${x.id}`);
  s.kiri(`Tgl  : ${new Date(x.tanggal).toLocaleString('id-ID')}`);
  s.kiri(`Kat  : ${x.kategori ? x.kategori.toUpperCase().replace(/_/g, ' ') : '-'}`);
  s.kiri(`Terima: ${x.karyawan_nama || '-'}`);
  s.kiri(`Kasir: ${x.kasir_nama}`);
  const sumber = x.sumber_kas === 'kas_besar' ? 'Kas besar' : x.sumber_kas === 'rekening' ? 'Rekening' : 'Laci kasir';
  s.kiri(`Dari : ${sumber}`);
  s.garisStrip();
  s.kiri('Peruntukan:');
  s.kiri(x.peruntukan);
  if (x.kategori === 'pembelian_air_baku') {
    s.kiri(`Vendor: ${x.nama_vendor_pengirim || '-'}`);
    s.dua('Volume Air', `${(x.volume_air_masuk_liter || 0).toLocaleString('id-ID')} L`);
    if (x.volume_air_masuk_liter) s.dua('HPP Air', `Rp ${((x.nominal || 0) / x.volume_air_masuk_liter).toFixed(1)}/L`);
    if (x.meteran_waktu_diisi_liter) s.dua('Meteran diisi', `${x.meteran_waktu_diisi_liter.toLocaleString('id-ID')} L`);
    if (x.harga_perolehan_air) s.dua('Harga perolehan', rp(x.harga_perolehan_air));
    if (x.tips_sopir_pengirim) s.dua('Tips sopir', rp(x.tips_sopir_pengirim));
  }
  if (x.catatan) s.kiri(`Catatan: ${x.catatan}`);
  s.garisStrip();
  s.dua('TOTAL NOMINAL', rp(x.nominal), true);
  s.garisStrip();
  s.kosong(1);
  s.kiri('Yang mengeluarkan:');
  s.kosong(2);
  s.tengah(`( ${x.kasir_nama} )`);
  s.kosong(1);
  s.kiri('Yang menerima:');
  s.kosong(2);
  s.tengah(`( ${x.karyawan_nama || '..................'} )`);
  s.garisSama();
  s.tengah(peng.footer_struk || 'Bukti Transaksi Sah Depo Air');
  return s.baris;
}

export interface DataRekapShift {
  kasir: string;
  waktu: string;
  status: string;
  jumlahTransaksi: number;
  omzet: number;
  tunaiLangsung: number;
  setoranKurir: number;
  nonTunai: number;
  hutang: number;
  produk: { nama: string; jumlah: number }[];
  modalAwal: number;
  kasbonMasuk: number;
  pengeluaran: number;
  diserahkanOwner: number;
  ekspektasi: number;
  uangDiKurir: number;
  fisik?: number;
  selisih?: number;
  meterAwal: number;
  meterAkhir?: number;
  daftarPengeluaran: { peruntukan: string; nominal: number }[];
}

// Rekap shift versi ringkas untuk printer 58/80 mm
export function susunRekapShift(d: DataRekapShift, peng: PengaturanDepo): BarisStruk[] {
  const s = penyusun(peng);
  s.tengah(peng.nama_depo || 'Depo Air', true);
  s.garisSama();
  s.tengah('REKAP SHIFT KASIR', true);
  s.garisSama();
  s.kiri(`Kasir : ${d.kasir}`);
  s.kiri(`Waktu : ${new Date(d.waktu).toLocaleString('id-ID')}`);
  s.kiri(`Status: ${d.status}`);
  s.garisStrip();
  s.tengah('PENJUALAN', true);
  s.dua('Transaksi', String(d.jumlahTransaksi));
  s.dua('Omzet', rp(d.omzet), true);
  s.dua('Tunai langsung', rp(d.tunaiLangsung));
  if (d.setoranKurir > 0) s.dua('Setoran kurir', rp(d.setoranKurir));
  s.dua('Non-tunai', rp(d.nonTunai));
  s.dua('Hutang', rp(d.hutang));
  if (d.produk.length > 0) {
    s.garisStrip();
    s.tengah('PRODUK TERJUAL', true);
    d.produk.slice(0, 10).forEach(p => s.dua(p.nama, `x${p.jumlah}`));
    if (d.produk.length > 10) s.kiri(`+${d.produk.length - 10} produk lain`);
  }
  s.garisStrip();
  s.tengah('KAS LACI', true);
  s.dua('Modal awal', rp(d.modalAwal));
  s.dua('Tunai masuk (+)', rp(d.tunaiLangsung + d.setoranKurir));
  if (d.kasbonMasuk > 0) s.dua('Kasbon masuk (+)', rp(d.kasbonMasuk));
  s.dua('Pengeluaran (-)', d.pengeluaran > 0 ? `-${rp(d.pengeluaran)}` : rp(0));
  if (d.diserahkanOwner > 0) s.dua('Ke owner (-)', `-${rp(d.diserahkanOwner)}`);
  s.garisStrip();
  s.dua('Ekspektasi kas', rp(d.ekspektasi), true);
  if (d.uangDiKurir > 0) s.dua('Uang di kurir', rp(d.uangDiKurir));
  if (d.fisik !== undefined && d.fisik > 0) {
    s.dua('Uang fisik', rp(d.fisik));
    s.dua('Selisih', (d.selisih || 0) === 0 ? 'PAS (Rp 0)' : rp(d.selisih || 0), true);
  }
  if (d.daftarPengeluaran.length > 0) {
    s.garisStrip();
    s.tengah('PENGELUARAN LACI', true);
    d.daftarPengeluaran.slice(0, 8).forEach(x => s.dua(x.peruntukan.length > 18 ? `${x.peruntukan.slice(0, 17)}.` : x.peruntukan, rp(x.nominal)));
    if (d.daftarPengeluaran.length > 8) s.kiri(`+${d.daftarPengeluaran.length - 8} pengeluaran lain`);
  }
  s.garisStrip();
  s.tengah('METERAN AIR', true);
  s.dua('Awal', `${d.meterAwal.toLocaleString('id-ID')} L`);
  if (d.meterAkhir !== undefined) {
    s.dua('Akhir', `${d.meterAkhir.toLocaleString('id-ID')} L`);
    s.dua('Terpakai', `${Math.max(0, d.meterAkhir - d.meterAwal).toLocaleString('id-ID')} L`, true);
  } else {
    s.kiri('Shift masih berjalan');
  }
  s.garisSama();
  s.tengah(`Dicetak ${new Date().toLocaleString('id-ID')}`);
  return s.baris;
}

// Cetak lewat dialog browser hanya isi struk ini (bukan seluruh halaman)
function cetakDialogTeks(baris: BarisStruk[], lebarMm: number | undefined) {
  const L = kolomKertas(lebarMm);
  const teks = baris.map(b => {
    if (b.rata !== 'tengah') return b.teks;
    return ' '.repeat(Math.max(0, Math.floor((L - b.teks.length) / 2))) + b.teks;
  }).join('\n');
  const wadah = document.createElement('div');
  wadah.id = 'cetak-teks-sementara';
  const pre = document.createElement('pre');
  pre.textContent = teks;
  wadah.appendChild(pre);
  const gaya = document.createElement('style');
  gaya.textContent =
    `@page { size: ${lebarMm === 80 ? 80 : 58}mm auto; margin: 3mm; }` +
    '#cetak-teks-sementara { display: none; }' +
    '@media print { body > *:not(#cetak-teks-sementara) { display: none !important; } #cetak-teks-sementara { display: block !important; } }' +
    '#cetak-teks-sementara pre { font: 12px/1.25 monospace; margin: 0; white-space: pre; color: #000; background: #fff; }';
  document.head.appendChild(gaya);
  document.body.appendChild(wadah);
  window.print();
  setTimeout(() => { gaya.remove(); wadah.remove(); }, 1000);
}

// Cetak rekap (teks saja): RawBT atau dialog browser dengan isi struk saja
export function cetakRekapBaris(baris: BarisStruk[]) {
  const peng = AppStore.getPengaturan();
  if (peng.printer_metode === 'rawbt') kirimRawBt(baris, peng, false);
  else cetakDialogTeks(baris, peng.printer_lebar_mm);
}
