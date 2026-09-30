'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Crosshair, Link2, Trash2, ExternalLink } from 'lucide-react';
import {
  ambilLokasiSaatIni, bacaTautanGoogleMaps, formatKoordinat, jarakKm, koordinatValid, urlGoogleMaps
} from '@/lib/geo';

// Peta dimuat hanya di browser dan hanya saat dibutuhkan
const LokasiPicker = dynamic(() => import('./LokasiPicker'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      Memuat peta...
    </div>
  )
});

interface LokasiFieldProps {
  lat?: number;
  lng?: number;
  onChange: (lat: number | undefined, lng: number | undefined) => void;
  // Diisi saat tautan Google Maps berhasil dibaca (untuk disimpan sebagai catatan)
  onTautan?: (tautan: string) => void;
  depoLat?: number;
  depoLng?: number;
  idDasar?: string;
}

// Isian lokasi: tombol GPS, tempel tautan Google Maps, dan geser pin di peta.
export default function LokasiField({ lat, lng, onChange, onTautan, depoLat, depoLng, idDasar = 'lokasi' }: LokasiFieldProps) {
  const [tautan, setTautan] = useState('');
  const [mencari, setMencari] = useState(false);

  const adaTitik = koordinatValid(lat, lng);
  const adaDepo = koordinatValid(depoLat, depoLng);

  const handleGps = async () => {
    setMencari(true);
    try {
      const pos = await ambilLokasiSaatIni();
      onChange(pos.lat, pos.lng);
      alert(`Lokasi terdeteksi (akurasi sekitar ${pos.akurasiM} meter). Cek pinnya di peta.${pos.akurasiM > 100 ? ' Akurasi kurang baik: coba di tempat terbuka.' : ''}`);
    } catch (err: any) {
      alert(err.message || 'Gagal mengambil lokasi.');
    } finally {
      setMencari(false);
    }
  };

  const handleBaca = () => {
    const hasil = bacaTautanGoogleMaps(tautan);
    if (hasil.ok) {
      onChange(hasil.lat, hasil.lng);
      if (onTautan && /^https?:\/\//i.test(tautan.trim())) onTautan(tautan.trim());
      alert('Lokasi dari tautan berhasil dibaca. Cek pinnya di peta.');
    } else {
      alert(hasil.pesan);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <button type="button" className="btn btn-secondary" onClick={handleGps} disabled={mencari} style={{ alignSelf: 'flex-start' }}>
        <Crosshair size={18} aria-hidden="true" /> {mencari ? 'Mencari lokasi...' : 'Gunakan lokasi saya saat ini'}
      </button>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor={`${idDasar}-tautan`}>Atau tempel tautan Google Maps (tautan panjang) / angka koordinat</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            id={`${idDasar}-tautan`}
            type="text"
            className="form-input"
            value={tautan}
            onChange={(e) => setTautan(e.target.value)}
            placeholder="https://www.google.com/maps/place/...@-6.2,106.8,17z"
          />
          <button type="button" className="btn btn-secondary" onClick={handleBaca} style={{ flexShrink: 0 }}>
            <Link2 size={18} aria-hidden="true" /> Baca
          </button>
        </div>
      </div>

      <div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
          Atau ketuk peta / geser pin merah ke lokasi yang tepat.
        </div>
        <LokasiPicker
          lat={lat}
          lng={lng}
          depoLat={depoLat}
          depoLng={depoLng}
          onChange={(la, ln) => onChange(la, ln)}
        />
      </div>

      {adaTitik ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
          <span role="status">
            <strong>{formatKoordinat(lat as number, lng as number)}</strong>
            {adaDepo && (
              <span style={{ color: 'var(--text-muted)' }}>
                {' '}- sekitar {jarakKm({ lat: lat as number, lng: lng as number }, { lat: depoLat as number, lng: depoLng as number }).toFixed(1)} km dari depo (garis lurus)
              </span>
            )}
          </span>
          <span style={{ display: 'flex', gap: '8px' }}>
            <a className="btn btn-secondary btn-sm" href={urlGoogleMaps(lat as number, lng as number)} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} aria-hidden="true" /> Buka di Google Maps
            </a>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange(undefined, undefined)}>
              <Trash2 size={14} aria-hidden="true" /> Hapus lokasi
            </button>
          </span>
        </div>
      ) : (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Lokasi belum ditentukan.</div>
      )}
    </div>
  );
}
