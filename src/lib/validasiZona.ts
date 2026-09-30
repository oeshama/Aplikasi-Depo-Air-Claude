import { Kontak, ZoneOngkir } from './types';
import { Koordinat, jarakKm, jarakZonaKm, koordinatValid, zonaUntukJarak } from './geo';

export interface SaranZona {
  kontak: Kontak;
  jarak: number;                 // km dari depo (garis lurus)
  zonaSekarang?: ZoneOngkir;     // kosong = belum ada zona
  zonaSaran: ZoneOngkir;
  dekatBatas: boolean;           // jarak dalam ±0,3 km dari batas zona, jadi hitungan garis lurus kurang pasti
}

const TOLERANSI_BATAS_KM = 0.3;

// Pelanggan yang zona tersimpannya berbeda dari zona menurut jarak ke depo
export function hitungSaranZona(kontak: Kontak[], zona: ZoneOngkir[], depo: Koordinat): SaranZona[] {
  const aktif = zona.filter(z => z.aktif);
  const batasList = aktif.map(z => jarakZonaKm(z)).filter((b): b is number => b !== null);
  const hasil: SaranZona[] = [];

  kontak.forEach(k => {
    if (!k.aktif || !koordinatValid(k.lat, k.lng)) return;
    const jarak = jarakKm(depo, { lat: k.lat as number, lng: k.lng as number });
    const saran = zonaUntukJarak(jarak, aktif);
    if (!saran || saran.id === k.zona_id) return;
    hasil.push({
      kontak: k,
      jarak,
      zonaSekarang: k.zona_id ? aktif.find(z => z.id === k.zona_id) : undefined,
      zonaSaran: saran,
      dekatBatas: batasList.some(b => Math.abs(jarak - b) <= TOLERANSI_BATAS_KM)
    });
  });

  // Yang paling meragukan di atas: belum ada zona dulu, lalu yang paling jauh meleset
  return hasil.sort((a, b) => Number(!!a.zonaSekarang) - Number(!!b.zonaSekarang) || b.jarak - a.jarak);
}

// Urutan antar sederhana: selalu ke titik terdekat berikutnya, mulai dari depo
export function urutkanRute<T extends Koordinat>(titik: T[], awal: Koordinat): T[] {
  const sisa = [...titik];
  const hasil: T[] = [];
  let posisi = awal;
  while (sisa.length > 0) {
    let terdekat = 0;
    let jarakMin = Infinity;
    sisa.forEach((t, i) => {
      const d = jarakKm(posisi, t);
      if (d < jarakMin) { jarakMin = d; terdekat = i; }
    });
    const [dipilih] = sisa.splice(terdekat, 1);
    hasil.push(dipilih);
    posisi = dipilih;
  }
  return hasil;
}

// Tautan Google Maps dengan beberapa perhentian (maksimal 9 titik antara, sisanya tidak ikut)
export function urlRuteGoogleMaps(asal: Koordinat | null, perhentian: Koordinat[]): string {
  if (perhentian.length === 0) return '';
  const fmt = (p: Koordinat) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
  const batas = perhentian.slice(0, 10);
  const tujuan = batas[batas.length - 1];
  const antara = batas.slice(0, -1);
  let url = `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${fmt(tujuan)}`;
  if (asal) url += `&origin=${fmt(asal)}`;
  if (antara.length > 0) url += `&waypoints=${antara.map(fmt).join('%7C')}`;
  return url;
}
