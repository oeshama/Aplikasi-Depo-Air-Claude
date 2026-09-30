'use client';

import React, { useEffect, useState } from 'react';
import { AppStore } from '@/lib/store';
import { ZoneOngkir } from '@/lib/types';

interface ZonaSelectProps {
  value: string;                       // id zona, '' = belum dipilih
  onChange: (zonaId: string) => void;
  id?: string;
  wajib?: boolean;                     // true = harus dipilih sebelum data pelanggan disimpan
}

// Pilihan zona ongkir untuk form pelanggan. Daftar zona mengikuti menu Zona Ongkir
// (hanya zona aktif, urut sesuai nomor urutnya) dan ikut berubah bila zona diedit.
export default function ZonaSelect({ value, onChange, id = 'zona-pelanggan', wajib = false }: ZonaSelectProps) {
  const [zonaList, setZonaList] = useState<ZoneOngkir[]>([]);

  useEffect(() => {
    const load = () => setZonaList(AppStore.getZona().filter(z => z.aktif).sort((a, b) => a.urutan - b.urutan));
    load();
    window.addEventListener('depo_zona_updated', load);
    return () => window.removeEventListener('depo_zona_updated', load);
  }, []);

  // Zona yang sudah dihapus/dinonaktifkan dianggap belum dipilih
  const current = zonaList.find(z => z.id === value);

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        Zona Ongkir Antar{wajib && <span style={{ color: 'var(--c-red)' }}> *</span>}
      </label>
      <select
        id={id}
        value={current ? current.id : ''}
        onChange={(e) => onChange(e.target.value)}
        className="form-select"
        required={wajib}
      >
        <option value="">{wajib ? 'Pilih zona ongkir...' : 'Belum ditentukan'}</option>
        {zonaList.map(z => (
          <option key={z.id} value={z.id}>
            {z.nama_zona} - {AppStore.formatRupiah(z.tarif_per_galon)}/unit
          </option>
        ))}
      </select>
      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        {current
          ? `${current.keterangan}. Ongkir terisi otomatis saat pelanggan ini memesan antar.`
          : wajib
            ? 'Wajib dipilih sesuai jarak rumah/toko dari depo. Ongkir antar terisi otomatis dari zona ini.'
            : 'Boleh dikosongkan. Kalau diisi, ongkir terisi otomatis saat pelanggan ini memesan antar.'}
      </span>
    </div>
  );
}
