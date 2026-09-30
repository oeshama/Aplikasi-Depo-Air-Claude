'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { AppStore } from '@/lib/store';
import { Kontak, ZoneOngkir } from '@/lib/types';
import { jarakKm, jarakZonaKm, koordinatValid, urlGoogleMaps, urlNavigasiGoogleMaps } from '@/lib/geo';
import { hitungFrekuensiSemua, INFO_KATEGORI, KategoriBeli, URUTAN_KATEGORI, AMBANG_BELI } from '@/lib/sebaran';
import { hitungSaranZona, SaranZona } from '@/lib/validasiZona';
import { MapPin, Navigation, ExternalLink, Phone, MapPinOff, Check } from 'lucide-react';
import type { CincinZona, TitikPeta } from '@/components/PetaSebaran';

const PetaSebaran = dynamic(() => import('@/components/PetaSebaran'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Memuat peta...</div>
  )
});

const EVENTS = ['depo_kontak_updated', 'depo_pesanan_updated', 'depo_zona_updated', 'depo_pengaturan_updated', 'depo_produk_updated'];
const WARNA_CINCIN = ['#0369a1', '#7c3aed', '#b45309', '#be123c'];

export default function PetaPelangganPage() {
  const [versi, setVersi] = useState(0);
  const [kategoriAktif, setKategoriAktif] = useState<KategoriBeli[]>(URUTAN_KATEGORI);
  const [zonaFilter, setZonaFilter] = useState<string>('semua');
  const [tipeFilter, setTipeFilter] = useState<'semua' | 'pelanggan' | 'reseller'>('semua');
  const [pilihId, setPilihId] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setVersi(v => v + 1);
    EVENTS.forEach(e => window.addEventListener(e, refresh));
    return () => EVENTS.forEach(e => window.removeEventListener(e, refresh));
  }, []);

  const data = useMemo(() => {
    const kontak = AppStore.getKontak().filter(k => k.aktif);
    const zona = AppStore.getZona().filter(z => z.aktif).sort((a, b) => a.urutan - b.urutan);
    const pengaturan = AppStore.getPengaturan();
    const frekuensi = hitungFrekuensiSemua(kontak, AppStore.getPesanan(), AppStore.getProduk());
    return { kontak, zona, pengaturan, frekuensi };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versi]);

  const { kontak, zona, pengaturan, frekuensi } = data;
  const peran = AppStore.getCurrentUser().role;
  const depoAda = koordinatValid(pengaturan.lokasi_depo_lat, pengaturan.lokasi_depo_lng);
  const depo = depoAda ? { lat: pengaturan.lokasi_depo_lat as number, lng: pengaturan.lokasi_depo_lng as number } : null;
  const fmtTgl = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

  const lolosFilter = (k: Kontak) =>
    (tipeFilter === 'semua' || k.tipe === tipeFilter) &&
    (zonaFilter === 'semua' || (zonaFilter === 'kosong' ? !k.zona_id : k.zona_id === zonaFilter));

  const difilter = kontak.filter(lolosFilter);
  const denganLokasi = difilter.filter(k => koordinatValid(k.lat, k.lng));
  const tanpaLokasi = difilter.filter(k => !koordinatValid(k.lat, k.lng));

  const hitungPerKategori = useMemo(() => {
    const h: Record<KategoriBeli, number> = { sering: 0, sedang: 0, jarang: 0, lama: 0, belum: 0 };
    denganLokasi.forEach(k => { h[frekuensi.get(k.id)?.kategori || 'belum'] += 1; });
    return h;
  }, [denganLokasi, frekuensi]);

  const titik: TitikPeta[] = useMemo(() => denganLokasi
    .filter(k => kategoriAktif.includes(frekuensi.get(k.id)?.kategori || 'belum'))
    .map(k => ({ id: k.id, lat: k.lat as number, lng: k.lng as number, nama: k.nama, warna: INFO_KATEGORI[frekuensi.get(k.id)?.kategori || 'belum'].warna })),
  [denganLokasi, kategoriAktif, frekuensi]);

  const cincin: CincinZona[] = useMemo(() => {
    const hasil: CincinZona[] = [];
    zona.forEach((z: ZoneOngkir, i: number) => {
      const km = jarakZonaKm(z);
      if (km !== null && km > 0) hasil.push({ nama: z.nama_zona, km, warna: WARNA_CINCIN[i % WARNA_CINCIN.length] });
    });
    return hasil;
  }, [zona]);

  const terpilih = pilihId ? kontak.find(k => k.id === pilihId) : undefined;
  const fTerpilih = terpilih ? frekuensi.get(terpilih.id) : undefined;
  const zonaTerpilih = terpilih?.zona_id ? zona.find(z => z.id === terpilih.zona_id) : undefined;
  const jarakTerpilih = terpilih && depo && koordinatValid(terpilih.lat, terpilih.lng)
    ? jarakKm(depo, { lat: terpilih.lat as number, lng: terpilih.lng as number })
    : null;

  // Validasi zona: hanya owner dan admin yang boleh mengubah zona pelanggan
  const bolehUbahZona = peran === 'owner' || peran === 'admin';
  const saranZona = useMemo(() => (depo ? hitungSaranZona(difilter, zona, depo) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [difilter, zona, depoAda, pengaturan.lokasi_depo_lat, pengaturan.lokasi_depo_lng]);
  const jelasSaran = saranZona.filter(s => !s.dekatBatas);

  const terapkanZona = (daftar: SaranZona[]) => {
    const peta = new Map(daftar.map(s => [s.kontak.id, s.zonaSaran.id]));
    const list = AppStore.getKontak().map(k => (peta.has(k.id) ? { ...k, zona_id: peta.get(k.id) } : k));
    AppStore.saveKontak(list);
    alert(`Zona ${daftar.length} pelanggan diperbarui.`);
  };

  const terapkanSemuaJelas = () => {
    if (!confirm(`Ubah zona ${jelasSaran.length} pelanggan sesuai jarak ke depo? Ongkir default mereka ikut berubah.`)) return;
    terapkanZona(jelasSaran);
  };

  const toggleKategori = (k: KategoriBeli) =>
    setKategoriAktif(list => (list.includes(k) ? list.filter(x => x !== k) : [...list, k]));

  return (
    <div style={{ padding: '16px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 className="page-title" style={{ margin: '4px 0 4px' }}>Peta Pelanggan</h1>
      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '0 0 12px' }}>
        {denganLokasi.length} pelanggan punya lokasi, {tanpaLokasi.length} belum. Warna titik menunjukkan seberapa sering membeli.
      </p>

      {!depoAda && (
        <div role="status" style={{ padding: '10px 12px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.14)', border: '1px solid rgba(180, 83, 9, 0.45)', fontSize: '0.85rem', marginBottom: '12px' }}>
          Lokasi depo belum diisi, jadi lingkaran zona dan jarak belum tampil. Isi di Pengaturan Toko (Owner).
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <label className="form-label" htmlFor="filter-zona" style={{ display: 'none' }}>Zona</label>
        <select id="filter-zona" className="form-input" value={zonaFilter} onChange={(e) => setZonaFilter(e.target.value)} style={{ flex: '1 1 160px' }}>
          <option value="semua">Semua zona</option>
          {zona.map(z => <option key={z.id} value={z.id}>{z.nama_zona}</option>)}
          <option value="kosong">Belum ada zona</option>
        </select>
        <label className="form-label" htmlFor="filter-tipe" style={{ display: 'none' }}>Tipe</label>
        <select id="filter-tipe" className="form-input" value={tipeFilter} onChange={(e) => setTipeFilter(e.target.value as 'semua' | 'pelanggan' | 'reseller')} style={{ flex: '1 1 140px' }}>
          <option value="semua">Pelanggan dan reseller</option>
          <option value="pelanggan">Pelanggan saja</option>
          <option value="reseller">Reseller saja</option>
        </select>
      </div>

      <div role="group" aria-label="Filter seberapa sering membeli" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {URUTAN_KATEGORI.map(k => {
          const aktif = kategoriAktif.includes(k);
          return (
            <button
              key={k}
              type="button"
              aria-pressed={aktif}
              title={INFO_KATEGORI[k].ket}
              onClick={() => toggleKategori(k)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '40px', padding: '6px 12px', borderRadius: '20px',
                border: `2px solid ${aktif ? INFO_KATEGORI[k].warna : 'var(--glass-border)'}`,
                background: aktif ? 'var(--w-5)' : 'transparent', color: 'inherit', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                opacity: aktif ? 1 : 0.55
              }}
            >
              <span aria-hidden="true" style={{ width: '12px', height: '12px', borderRadius: '50%', background: INFO_KATEGORI[k].warna }} />
              {INFO_KATEGORI[k].label} ({hitungPerKategori[k]})
            </button>
          );
        })}
      </div>

      <PetaSebaran
        titik={titik}
        depoLat={depo?.lat}
        depoLng={depo?.lng}
        cincin={cincin}
        pilihId={pilihId}
        onPilih={setPilihId}
      />
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '6px 0 12px' }}>
        Hitungan sering/jarang memakai {AMBANG_BELI.jendelaHari} hari terakhir. Lingkaran putus-putus = batas zona ongkir dari depo (garis lurus), titik biru = depo.
      </p>

      {terpilih && (
        <section aria-label={`Detail ${terpilih.nama}`} className="glass-card" style={{ padding: '14px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
            <div>
              <strong style={{ fontSize: '1.05rem' }}>{terpilih.nama}</strong>
              <span className="badge badge-primary" style={{ marginLeft: '8px' }}>{terpilih.tipe}</span>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700 }}>
              <span aria-hidden="true" style={{ width: '12px', height: '12px', borderRadius: '50%', background: INFO_KATEGORI[fTerpilih?.kategori || 'belum'].warna }} />
              {INFO_KATEGORI[fTerpilih?.kategori || 'belum'].label}
            </span>
          </div>
          {terpilih.alamat && <div style={{ fontSize: '0.88rem', marginTop: '4px' }}>{terpilih.alamat}</div>}
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
            <span>Zona: <strong style={{ color: 'var(--text-main)' }}>{zonaTerpilih?.nama_zona || 'Belum ada'}</strong></span>
            <span>Jarak: <strong style={{ color: 'var(--text-main)' }}>{jarakTerpilih !== null ? `${jarakTerpilih.toFixed(1)} km` : '-'}</strong></span>
            <span>Pesanan {AMBANG_BELI.jendelaHari} hari: <strong style={{ color: 'var(--text-main)' }}>{fTerpilih?.pesananJendela ?? 0}</strong></span>
            <span>Galon {AMBANG_BELI.jendelaHari} hari: <strong style={{ color: 'var(--text-main)' }}>{fTerpilih?.galonJendela ?? 0}</strong></span>
            <span>Total pesanan: <strong style={{ color: 'var(--text-main)' }}>{fTerpilih?.totalPesanan ?? 0}</strong></span>
            <span>Terakhir beli: <strong style={{ color: 'var(--text-main)' }}>{fmtTgl(fTerpilih?.terakhir)}</strong></span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
            <a className="btn btn-primary btn-sm" href={urlNavigasiGoogleMaps(terpilih.lat as number, terpilih.lng as number)} target="_blank" rel="noopener noreferrer">
              <Navigation size={14} aria-hidden="true" /> Navigasi
            </a>
            <a className="btn btn-secondary btn-sm" href={urlGoogleMaps(terpilih.lat as number, terpilih.lng as number)} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} aria-hidden="true" /> Buka di Google Maps
            </a>
            {terpilih.no_hp && (
              <a className="btn btn-secondary btn-sm" href={`tel:${terpilih.no_hp}`}>
                <Phone size={14} aria-hidden="true" /> {terpilih.no_hp}
              </a>
            )}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPilihId(null)}>Tutup</button>
          </div>
        </section>
      )}

      {depo && (
        <section aria-labelledby="judul-validasi-zona" style={{ marginBottom: '20px' }}>
          <h2 id="judul-validasi-zona" style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px' }}>
            Validasi zona ongkir ({saranZona.length})
          </h2>
          {saranZona.length === 0 ? (
            <p style={{ color: 'var(--c-green)', fontSize: '0.9rem', fontWeight: 600 }}>
              Semua zona pelanggan yang punya lokasi sudah sesuai jarak ke depo.
            </p>
          ) : (
            <>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 8px' }}>
                Zona tersimpan berbeda dari zona menurut jarak ke depo (garis lurus, perkiraan). Yang dekat batas zona ditandai dan tidak ikut &quot;Terapkan semua&quot;.
              </p>
              {bolehUbahZona && jelasSaran.length > 0 && (
                <button type="button" className="btn btn-primary btn-sm" onClick={terapkanSemuaJelas} style={{ marginBottom: '8px' }}>
                  <Check size={14} aria-hidden="true" /> Terapkan semua yang jelas ({jelasSaran.length})
                </button>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {saranZona.slice(0, 50).map(s => (
                  <div key={s.kontak.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '8px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '0.9rem' }}>{s.kontak.nama}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {s.jarak.toFixed(1)} km dari depo - {s.zonaSekarang ? s.zonaSekarang.nama_zona : 'belum ada zona'} menjadi <strong style={{ color: 'var(--text-main)' }}>{s.zonaSaran.nama_zona}</strong>
                          {s.dekatBatas ? ' (dekat batas zona)' : ''}
                        </div>
                      </div>
                      <span style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPilihId(s.kontak.id)}>Lihat</button>
                        {bolehUbahZona && (
                          <button type="button" className="btn btn-success btn-sm" onClick={() => terapkanZona([s])}>Terapkan</button>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
                {saranZona.length > 50 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Menampilkan 50 pertama.</p>}
              </div>
            </>
          )}
        </section>
      )}

      <section aria-labelledby="judul-tanpa-lokasi">
        <h2 id="judul-tanpa-lokasi" style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPinOff size={18} aria-hidden="true" /> Belum ada lokasi ({tanpaLokasi.length})
        </h2>
        {tanpaLokasi.length === 0 ? (
          <p style={{ color: 'var(--c-green)', fontSize: '0.9rem', fontWeight: 600 }}>Semua pelanggan pada filter ini sudah punya lokasi.</p>
        ) : (
          <details>
            <summary style={{ cursor: 'pointer', color: 'var(--c-sky)', fontWeight: 600, fontSize: '0.9rem', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
              Lihat daftar
            </summary>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 8px' }}>
              Lokasi bisa diisi lewat menu Pelanggan & Reseller, atau kurir menekan Simpan lokasi pelanggan saat mengantar.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {tanpaLokasi.slice(0, 100).map(k => {
                const f = frekuensi.get(k.id);
                return (
                  <div key={k.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.9rem' }}>{k.nama}</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{k.alamat || 'Alamat kosong'}</div>
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: INFO_KATEGORI[f?.kategori || 'belum'].warna, whiteSpace: 'nowrap' }}>
                      {INFO_KATEGORI[f?.kategori || 'belum'].label}
                    </span>
                  </div>
                );
              })}
              {tanpaLokasi.length > 100 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Menampilkan 100 pertama.</p>}
            </div>
          </details>
        )}
      </section>

      <div style={{ height: '16px' }} aria-hidden="true"><MapPin size={1} style={{ display: 'none' }} /></div>
    </div>
  );
}
