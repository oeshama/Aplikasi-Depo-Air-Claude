'use client';

import React from 'react';

interface KartuTargetProps {
  judul: string;
  capaianTeks: string;      // mis. "Rp 120.000" atau "38 Galon"
  targetTeks: string;       // mis. "Rp 500.000"
  persen: number;           // boleh lebih dari 100
  adaTarget: boolean;
  warna: string;            // warna batang progres (css value)
  keterangan?: string;
}

// Kartu progres target: nilai tercapai, target, batang progres, dan persen apa adanya.
export default function KartuTarget({ judul, capaianTeks, targetTeks, persen, adaTarget, warna, keterangan }: KartuTargetProps) {
  const tercapai = adaTarget && persen >= 100;
  return (
    <div style={{ background: 'var(--inset-70)', padding: '18px', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>{judul}</span>
        {adaTarget && (
          <span className={`badge ${tercapai ? 'badge-success' : 'badge-primary'}`}>{tercapai ? 'TERCAPAI' : 'BERJALAN'}</span>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <h4 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>{capaianTeks}</h4>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{adaTarget ? `Target: ${targetTeks}` : 'Target belum diisi'}</span>
      </div>
      <div
        role="progressbar"
        aria-label={judul}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, persen)}
        style={{ width: '100%', height: '10px', background: 'var(--w-10)', borderRadius: '5px', overflow: 'hidden' }}
      >
        <div style={{ width: `${Math.min(100, persen)}%`, height: '100%', background: warna, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
        {adaTarget ? `Capaian ${persen}% dari target${persen > 100 ? ' (melebihi target)' : ''}` : 'Isi target di Pengaturan Toko atau tombol Edit Target.'}
        {keterangan ? ` - ${keterangan}` : ''}
      </span>
    </div>
  );
}
