'use client';

import React, { useState } from 'react';
import { AppStore } from '@/lib/store';

type Periode = 'hari' | 'minggu' | 'bulan' | 'semua';

const PERIODE: { id: Periode; label: string }[] = [
  { id: 'hari', label: 'Hari ini' },
  { id: 'minggu', label: '7 hari' },
  { id: 'bulan', label: 'Bulan ini' },
  { id: 'semua', label: 'Semua' },
];

function awalPeriode(p: Periode): number {
  const d = new Date();
  if (p === 'semua') return 0;
  if (p === 'hari') { d.setHours(0, 0, 0, 0); return d.getTime(); }
  if (p === 'minggu') { d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d.getTime(); }
  d.setDate(1); d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Laporan selisih per kasir: hitung laci saat tutup shift dan jumlah setoran yang diterima owner.
export default function LaporanSelisihKasir() {
  const [periode, setPeriode] = useState<Periode>('bulan');
  const fmt = (n: number) => AppStore.formatRupiah(n);
  const warna = (n: number) => (n === 0 ? 'var(--c-green)' : n < 0 ? 'var(--c-red)' : 'var(--c-sky)');
  const teks = (n: number) => (n === 0 ? 'Pas' : `${n > 0 ? '+' : '-'}${fmt(Math.abs(n))}`);

  const { baris, rincian } = AppStore.laporanSelisihKasir(awalPeriode(periode));
  const totalSelisih = baris.reduce((acc, b) => acc + b.selisih_shift + b.selisih_setoran, 0);

  return (
    <div>
      <div className="seg-grid" role="radiogroup" aria-label="Periode laporan" style={{ marginBottom: '10px' }}>
        {PERIODE.map(p => (
          <button key={p.id} type="button" role="radio" aria-checked={periode === p.id} className="seg-btn" onClick={() => setPeriode(p.id)}>
            {p.label}
          </button>
        ))}
      </div>

      {baris.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Belum ada shift ditutup atau setoran diterima pada periode ini.</p>
      ) : (
        <>
          <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
            Total selisih semua kasir: <strong style={{ color: warna(totalSelisih) }}>{teks(totalSelisih)}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {baris.map(b => {
              const total = b.selisih_shift + b.selisih_setoran;
              return (
                <div key={b.kasir_id || b.kasir_nama} className="glass-card" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <strong>{b.kasir_nama}</strong>
                    <strong style={{ color: warna(total) }}>{teks(total)}</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginTop: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <span>Shift ditutup: <strong style={{ color: 'var(--text-main)' }}>{b.jumlah_shift}</strong></span>
                    <span>Selisih hitung laci: <strong style={{ color: warna(b.selisih_shift) }}>{teks(b.selisih_shift)}</strong></span>
                    <span>Diserahkan ke owner: <strong style={{ color: 'var(--text-main)' }}>{fmt(b.total_diserahkan)}</strong></span>
                    <span>Selisih setoran: <strong style={{ color: warna(b.selisih_setoran) }}>{teks(b.selisih_setoran)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          {rincian.length > 0 && (
            <details style={{ marginTop: '10px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--c-sky)', fontSize: '0.9rem' }}>
                Lihat {rincian.length} kejadian yang tidak pas
              </summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                {rincian.map((r, i) => (
                  <div key={i} style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '8px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '0.88rem' }}>{r.kasir_nama} - {r.jenis === 'shift' ? 'tutup shift' : 'setoran'}</span>
                      <strong style={{ color: warna(r.selisih), whiteSpace: 'nowrap' }}>{teks(r.selisih)}</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(r.waktu).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} - {r.keterangan}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
