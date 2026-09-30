'use client';

import React, { useEffect, useState } from 'react';
import { AppStore } from '@/lib/store';
import { SetoranOwner } from '@/lib/types';
import { Wallet, HandCoins, Check, Truck, Store } from 'lucide-react';

const EVENTS = [
  'depo_setoran_owner_updated', 'depo_pesanan_updated', 'depo_pengeluaran_updated',
  'depo_setoran_kurir_updated', 'depo_shift_updated'
];

// Keuangan Owner (khusus owner). Tahap ini: menerima uang dari kasir dan mengambil uang langsung dari laci.
export default function KeuanganOwnerPage() {
  const [, setTick] = useState(0);
  const [diterimaInput, setDiterimaInput] = useState<Record<string, number>>({});
  const [ambil, setAmbil] = useState<number>(0);
  const [catatanAmbil, setCatatanAmbil] = useState<string>('');

  useEffect(() => {
    const refresh = () => setTick(t => t + 1);
    EVENTS.forEach(e => window.addEventListener(e, refresh));
    return () => EVENTS.forEach(e => window.removeEventListener(e, refresh));
  }, []);

  const shift = AppStore.getShiftAktif();
  const laci = AppStore.getKasLaciAktif();
  const saldoLaci = laci ? Math.max(0, laci.ekspektasi) : 0;
  const uangDiKurir = AppStore.getTotalUangDiKurir();
  const semua = AppStore.getSetoranOwner();
  const menunggu = semua.filter(s => s.status === 'menunggu');
  const totalMenunggu = menunggu.reduce((acc, s) => acc + s.nominal, 0);
  const riwayat = semua.filter(s => s.status !== 'menunggu').slice(0, 15);

  const fmt = (n: number) => AppStore.formatRupiah(n);
  const waktu = (iso: string) => new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const handleTerima = (s: SetoranOwner) => {
    const diterima = diterimaInput[s.id] ?? s.nominal;
    try {
      const hasil = AppStore.terimaSetoranOwner(s.id, diterima);
      const selisih = hasil.selisih || 0;
      alert(selisih === 0
        ? `Setoran ${fmt(hasil.nominal)} dari ${hasil.kasir_nama} diterima, jumlahnya pas.`
        : `Setoran diterima ${fmt(diterima)} dari ${fmt(hasil.nominal)}. Selisih ${fmt(selisih)} dicatat atas nama ${hasil.kasir_nama}.`);
    } catch (err: any) {
      alert(err.message || 'Gagal menerima setoran.');
    }
  };

  const handleAmbil = () => {
    try {
      const hasil = AppStore.ambilDariLaciOlehOwner(ambil, catatanAmbil);
      alert(`${fmt(hasil.nominal)} diambil dari laci dan dicatat.`);
      setAmbil(0);
      setCatatanAmbil('');
    } catch (err: any) {
      alert(err.message || 'Gagal mencatat pengambilan.');
    }
  };

  const kartu = (Icon: typeof Wallet, judul: string, nilai: string, ket: string, warna: string) => (
    <div className="glass-card" style={{ padding: '16px', background: 'var(--inset-60)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        <Icon size={15} aria-hidden="true" /> {judul}
      </div>
      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: warna, marginTop: '4px' }}>{nilai}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ket}</div>
    </div>
  );

  return (
    <div style={{ padding: '16px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 className="page-title" style={{ margin: '4px 0 12px' }}>Keuangan Owner</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {kartu(Store, 'Uang di laci kasir', shift ? fmt(saldoLaci) : 'Tidak ada shift', shift ? `Shift ${shift.kasir_nama || ''} berjalan` : 'Laci dihitung per shift', 'var(--c-green)')}
        {kartu(Truck, 'Uang di kurir', fmt(uangDiKurir), 'Belum disetor ke kasir', uangDiKurir > 0 ? 'var(--c-amber)' : 'var(--c-green)')}
        {kartu(HandCoins, 'Menunggu diterima', fmt(totalMenunggu), `${menunggu.length} penyerahan dari kasir`, totalMenunggu > 0 ? 'var(--c-amber)' : 'var(--text-main)')}
      </div>

      <section aria-labelledby="judul-menunggu" style={{ marginBottom: '24px' }}>
        <h2 id="judul-menunggu" style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px' }}>Setoran dari kasir</h2>
        {menunggu.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tidak ada setoran yang menunggu diterima.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {menunggu.map(s => {
              const nilai = diterimaInput[s.id] ?? s.nominal;
              const selisih = nilai - s.nominal;
              return (
                <div key={s.id} className="glass-card" style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <strong>{s.kasir_nama}</strong>
                    <strong style={{ color: 'var(--c-amber)' }}>{fmt(s.nominal)}</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {waktu(s.waktu)}{s.saat_tutup ? ' - saat tutup shift' : ''}{s.catatan && !s.saat_tutup ? ` - ${s.catatan}` : ''}
                  </div>
                  <label className="form-label" htmlFor={`terima-${s.id}`} style={{ marginTop: '10px', display: 'block' }}>Uang yang benar-benar diterima (Rp)</label>
                  <input
                    id={`terima-${s.id}`}
                    type="number"
                    inputMode="numeric"
                    className="form-input"
                    value={nilai === 0 ? '0' : nilai || ''}
                    onChange={(e) => setDiterimaInput(prev => ({ ...prev, [s.id]: Number(e.target.value) }))}
                  />
                  {selisih !== 0 && (
                    <p role="status" style={{ fontSize: '0.85rem', marginTop: '6px', color: selisih < 0 ? 'var(--c-red)' : 'var(--c-sky)' }}>
                      Selisih {fmt(selisih)} akan dicatat atas nama {s.kasir_nama}.
                    </p>
                  )}
                  <button type="button" className="btn btn-success btn-lg" onClick={() => handleTerima(s)} style={{ width: '100%', marginTop: '10px' }}>
                    <Check size={20} aria-hidden="true" /> Terima setoran
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="judul-ambil" style={{ marginBottom: '24px' }}>
        <h2 id="judul-ambil" style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px' }}>Ambil uang dari laci</h2>
        {!shift ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Belum ada shift yang dibuka, jadi belum ada laci yang bisa diambil.</p>
        ) : (
          <div className="glass-card" style={{ padding: '14px' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 8px' }}>
              Langsung sah tanpa menunggu kasir. Uang laci saat ini sekitar <strong style={{ color: 'var(--text-main)' }}>{fmt(saldoLaci)}</strong>.
            </p>
            <label className="form-label" htmlFor="ambil-nominal">Uang yang diambil (Rp)</label>
            <input id="ambil-nominal" type="number" inputMode="numeric" className="form-input" value={ambil || ''} onChange={(e) => setAmbil(Number(e.target.value))} placeholder="0" />
            <label className="form-label" htmlFor="ambil-catatan" style={{ marginTop: '10px', display: 'block' }}>Catatan (opsional)</label>
            <input id="ambil-catatan" type="text" className="form-input" value={catatanAmbil} onChange={(e) => setCatatanAmbil(e.target.value)} placeholder="Contoh: diambil siang" />
            <button type="button" className="btn btn-primary btn-lg" onClick={handleAmbil} style={{ width: '100%', marginTop: '12px' }}>
              <HandCoins size={20} aria-hidden="true" /> Catat pengambilan
            </button>
          </div>
        )}
      </section>

      <section aria-labelledby="judul-riwayat">
        <h2 id="judul-riwayat" style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px' }}>Riwayat</h2>
        {riwayat.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Belum ada riwayat.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {riwayat.map(s => {
              const batal = s.status === 'dibatalkan';
              return (
                <div key={s.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '10px 12px', opacity: batal ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <strong>{s.jenis === 'ambil_owner' ? 'Diambil owner dari laci' : `Dari ${s.kasir_nama}`}</strong>
                    <strong style={{ textDecoration: batal ? 'line-through' : 'none' }}>{fmt(s.status === 'diterima' ? (s.nominal_diterima ?? s.nominal) : s.nominal)}</strong>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {waktu(s.waktu)}
                    {batal ? ' - dibatalkan kasir' : s.diterima_oleh ? ` - diterima ${s.diterima_oleh}` : ''}
                    {s.catatan ? ` - ${s.catatan}` : ''}
                  </div>
                  {!!s.selisih && (
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: s.selisih < 0 ? 'var(--c-red)' : 'var(--c-sky)', marginTop: '2px' }}>
                      Selisih {fmt(s.selisih)} (diserahkan {fmt(s.nominal)})
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
