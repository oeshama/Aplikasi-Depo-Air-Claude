import { ZoneOngkir } from './types';

export interface Koordinat {
  lat: number;
  lng: number;
}

export function koordinatValid(lat?: number | null, lng?: number | null): boolean {
  return (
    typeof lat === 'number' && typeof lng === 'number' &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

// Jarak garis lurus (km) antara dua titik (rumus haversine). Perkiraan: jarak jalan biasanya lebih jauh.
export function jarakKm(a: Koordinat, b: Koordinat): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function urlGoogleMaps(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function urlNavigasiGoogleMaps(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function formatKoordinat(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

// ---------------------------------------------------------------------
// Membaca koordinat dari tautan Google Maps (hanya tautan panjang / angka koordinat)
// ---------------------------------------------------------------------
export type HasilBacaTautan = { ok: true; lat: number; lng: number } | { ok: false; pesan: string };

const TAUTAN_PENDEK = /maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs/i;

export function bacaTautanGoogleMaps(input: string): HasilBacaTautan {
  const teks = (input || '').trim();
  if (!teks) return { ok: false, pesan: 'Tempel tautan Google Maps atau angka koordinat dulu.' };

  let dekode = teks;
  try {
    dekode = decodeURIComponent(teks);
  } catch {
    // tautan dengan karakter aneh: pakai apa adanya
  }

  const ambil = (lat: string, lng: string): HasilBacaTautan => {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    return koordinatValid(la, ln)
      ? { ok: true, lat: la, lng: ln }
      : { ok: false, pesan: 'Angka koordinat di tautan itu tidak masuk akal. Periksa lagi tautannya.' };
  };

  // 1. Hanya angka: "-6.2088, 106.8456" (hasil menekan lama titik di Google Maps)
  const angka = dekode.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  if (angka) return ambil(angka[1], angka[2]);

  if (TAUTAN_PENDEK.test(dekode)) {
    return {
      ok: false,
      pesan:
        'Ini tautan pendek, belum bisa dibaca. Buka tautannya di browser, lalu salin alamat lengkap dari kolom alamat browser (yang panjang). Atau tekan lama titik di Google Maps lalu salin angka koordinatnya.'
    };
  }

  // 2. Titik pin tempat: ...!3d-6.2088!4d106.8456
  const pin = dekode.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (pin) return ambil(pin[1], pin[2]);

  // 3. Pusat peta: ...@-6.2088,106.8456,17z
  const pusat = dekode.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (pusat) return ambil(pusat[1], pusat[2]);

  // 4. Parameter: ?q=-6.2088,106.8456 (juga query, ll, center, destination)
  const param = dekode.match(/[?&](?:q|query|ll|center|destination)=(-?\d+(?:\.\d+)?)[,\s+]+(-?\d+(?:\.\d+)?)/);
  if (param) return ambil(param[1], param[2]);

  return {
    ok: false,
    pesan: 'Koordinat tidak ditemukan di tautan ini. Pakai tautan panjang dari Google Maps (yang berisi angka seperti @-6.2,106.8), atau tempel angka koordinatnya.'
  };
}

// ---------------------------------------------------------------------
// GPS perangkat
// ---------------------------------------------------------------------
export interface LokasiSaatIni extends Koordinat {
  akurasiM: number;
}

export function ambilLokasiSaatIni(): Promise<LokasiSaatIni> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Browser ini tidak mendukung GPS.'));
      return;
    }
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      reject(new Error('GPS hanya berfungsi di alamat HTTPS (link Vercel) atau localhost. Alamat Wi-Fi (http://192...) diblokir browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, akurasiM: Math.round(pos.coords.accuracy) }),
      err => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Izin lokasi ditolak. Aktifkan izin lokasi untuk situs ini di pengaturan browser, lalu coba lagi.'));
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new Error('Lokasi tidak tersedia. Pastikan GPS/lokasi HP menyala.'));
        } else {
          reject(new Error('Terlalu lama mencari lokasi. Coba lagi di tempat terbuka.'));
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });
}

// ---------------------------------------------------------------------
// Zona ongkir dan jarak
// ---------------------------------------------------------------------
// Batas jarak bawaan untuk zona bawaan aplikasi. Zona buatan sendiri tanpa batas diisi = tanpa batas.
const JARAK_ZONA_BAWAAN: Record<string, number> = { 'zn-1': 1, 'zn-2': 3, 'zn-3': 5 };

// Batas jarak zona (km). null = tanpa batas (zona terjauh).
export function jarakZonaKm(zona: ZoneOngkir): number | null {
  if (zona.jarak_maks_km !== undefined) return zona.jarak_maks_km;
  return JARAK_ZONA_BAWAAN[zona.id] ?? null;
}

// Zona yang seharusnya untuk jarak tertentu: zona berurutan pertama yang batasnya menjangkau jarak itu
export function zonaUntukJarak(km: number, zonaList: ZoneOngkir[]): ZoneOngkir | null {
  const urut = zonaList.filter(z => z.aktif).sort((a, b) => a.urutan - b.urutan);
  for (const z of urut) {
    const batas = jarakZonaKm(z);
    if (batas === null || km <= batas) return z;
  }
  return urut.length > 0 ? urut[urut.length - 1] : null;
}
