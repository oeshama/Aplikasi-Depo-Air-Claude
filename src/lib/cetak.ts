import { PengaturanDepo, Pesanan } from './types';
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

export function susunStrukPenjualan(p: Pesanan, peng: PengaturanDepo): BarisStruk[] {
  const L = kolomKertas(peng.printer_lebar_mm);
  const baris: BarisStruk[] = [];
  // Bungkus dulu (baris baru di teks dihormati), baru dibersihkan per baris
  const tengah = (t: string, tebal = false) => bungkus(t, L).forEach(b => baris.push({ teks: bersihkanTeks(b), rata: 'tengah', tebal }));
  const kiri = (t: string) => bungkus(t, L).forEach(b => baris.push({ teks: bersihkanTeks(b) }));
  const dua = (a: string, b: string, tebal = false) => kiriKanan(a, b, L).forEach(x => baris.push({ teks: x, tebal }));

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
