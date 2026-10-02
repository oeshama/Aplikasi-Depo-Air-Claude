import { PesananMasuk } from './types';
import { linkWa } from './telepon';

const rp = (n: number) => 'Rp ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const jamLokal = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');

// Teks balasan WhatsApp setelah kasir mengonfirmasi pesanan online (siap kirim, bisa diubah dulu di WhatsApp)
export function teksKonfirmasi(pm: PesananMasuk, namaDepo: string, total: number, ongkir: number, estimasiIso: string): string {
  const daftar = pm.items.map(i => `- ${i.jumlah} ${i.nama_produk}`).join('\n');
  return [
    `Halo ${pm.nama}, pesanan ${pm.no} sudah kami terima dan dikonfirmasi.`,
    daftar,
    `Total ${rp(total)}${ongkir > 0 ? ` (sudah termasuk ongkir ${rp(ongkir)})` : ''}.`,
    `Perkiraan tiba sekitar pukul ${jamLokal(estimasiIso)}.`,
    `Terima kasih, ${namaDepo}.`
  ].join('\n');
}

export function teksTolak(pm: PesananMasuk, namaDepo: string, alasan: string): string {
  return [
    `Halo ${pm.nama}, mohon maaf pesanan ${pm.no} belum bisa kami proses${alasan ? `: ${alasan}` : ''}.`,
    'Silakan hubungi kami kalau ada yang ingin ditanyakan.',
    namaDepo
  ].join('\n');
}

export function linkBalas(pm: PesananMasuk, teks: string): string {
  return linkWa(pm.no_hp, teks);
}
