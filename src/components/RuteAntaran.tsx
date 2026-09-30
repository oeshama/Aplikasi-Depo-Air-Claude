'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Route, MapPinOff } from 'lucide-react';
import { Kontak, Pesanan } from '@/lib/types';
import { jarakKm, koordinatValid } from '@/lib/geo';
import { urutkanRute, urlRuteGoogleMaps } from '@/lib/validasiZona';
import type { PerhentianPeta } from './PetaRute';

const PetaRute = dynamic(() => import('./PetaRute'), {
  ssr: false,
  loading: () => <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Memuat peta...</div>
});

interface RuteAntaranProps {
  antaran: Pesanan[];
  kontakList: Kontak[];
  depoLat?: number;
  depoLng?: number;
}

// Rute antaran: urutan perhentian terdekat dulu dari depo, peta bernomor, dan tombol buka rute di Google Maps.
export default function RuteAntaran({ antaran, kontakList, depoLat, depoLng }: RuteAntaranProps) {
  const depo = koordinatValid(depoLat, depoLng) ? { lat: depoLat as number, lng: depoLng as number } : null;

  // Satu pelanggan dengan beberapa pesanan hanya jadi satu perhentian
  const perKontak = new Map<string, { kontak: Kontak; notaList: string[] }>();
  const tanpaLokasi: { nama: string; nota: string }[] = [];
  antaran.forEach(p => {
    const k = kontakList.find(x => x.id === p.kontak_id);
    if (!k || !koordinatValid(k.lat, k.lng)) {
      tanpaLokasi.push({ nama: p.nama_pelanggan, nota: p.no_nota });
      return;
    }
    const ada = perKontak.get(k.id);
    if (ada) ada.notaList.push(p.no_nota);
    else perKontak.set(k.id, { kontak: k, notaList: [p.no_nota] });
  });

  const titik = Array.from(perKontak.values()).map(v => ({ lat: v.kontak.lat as number, lng: v.kontak.lng as number, ...v }));
  const urut = urutkanRute(titik, depo || (titik.length > 0 ? { lat: titik[0].lat, lng: titik[0].lng } : { lat: 0, lng: 0 }));

  const perhentian: PerhentianPeta[] = urut.map((t, i) => ({ nomor: i + 1, id: t.kontak.id, lat: t.lat, lng: t.lng, nama: t.kontak.nama }));

  let posisi = depo;
  const jarakAntar = urut.map(t => {
    const d = posisi ? jarakKm(posisi, t) : 0;
    posisi = { lat: t.lat, lng: t.lng };
    return d;
  });
  const totalKm = jarakAntar.reduce((a, b) => a + b, 0);
  const url = urlRuteGoogleMaps(depo, urut);

  if (antaran.length === 0) return null;

  return (
    <section aria-labelledby="judul-rute" className="glass-card" style={{ padding: '16px' }}>
      <h3 id="judul-rute" style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Route size={20} aria-hidden="true" /> Rute Antaran
      </h3>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>
        Urutan dari titik terdekat dulu (perkiraan garis lurus dari depo). Sesuaikan dengan kondisi jalan dan permintaan pelanggan.
      </p>

      {perhentian.length === 0 ? (
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Belum ada antaran yang lokasinya tersimpan. Simpan lokasi pelanggan saat tiba di rumahnya supaya rute berikutnya tersusun.
        </p>
      ) : (
        <>
          <PetaRute perhentian={perhentian} depoLat={depo?.lat} depoLng={depo?.lng} />
          <ol style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {urut.map((t, i) => (
              <li key={t.kontak.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '8px 12px' }}>
                <span aria-hidden="true" style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%', background: '#dc2626', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>{i + 1}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: 'block' }}>{t.kontak.nama}</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.notaList.join(', ')}{t.kontak.alamat ? ` - ${t.kontak.alamat}` : ''}</span>
                </span>
                {depo && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>+{jarakAntar[i].toFixed(1)} km</span>}
              </li>
            ))}
          </ol>
          {depo && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '8px' }}>Total sekitar {totalKm.toFixed(1)} km (garis lurus, sekali jalan).</div>}
          <a className="btn btn-primary btn-lg" href={url} target="_blank" rel="noopener noreferrer" style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }}>
            <Route size={20} aria-hidden="true" /> Buka rute di Google Maps
          </a>
          {perhentian.length > 10 && <div style={{ fontSize: '0.78rem', color: 'var(--c-amber)', marginTop: '6px' }}>Google Maps hanya menerima 10 perhentian, jadi 10 pertama yang dibuka.</div>}
        </>
      )}

      {tanpaLokasi.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.9rem' }}>
            <MapPinOff size={16} aria-hidden="true" /> Belum ada lokasi ({tanpaLokasi.length})
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {tanpaLokasi.map(t => `${t.nama} (${t.nota})`).join(', ')}
          </div>
        </div>
      )}
    </section>
  );
}
