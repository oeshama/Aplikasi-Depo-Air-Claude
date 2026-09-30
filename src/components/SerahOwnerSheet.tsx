'use client';

import React, { useEffect, useState } from 'react';
import { AppStore } from '@/lib/store';
import { X, HandCoins, Undo2 } from 'lucide-react';

interface SerahOwnerSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

// Kasir menyerahkan uang dari laci ke owner kapan saja (tidak harus saat tutup shift).
// Uangnya langsung keluar dari hitungan laci; owner menerima dan memeriksa jumlahnya belakangan.
export default function SerahOwnerSheet({ isOpen, onClose }: SerahOwnerSheetProps) {
  const [, setTick] = useState(0);
  const [nominal, setNominal] = useState<number>(0);
  const [catatan, setCatatan] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    const refresh = () => setTick(t => t + 1);
    const events = ['depo_setoran_owner_updated', 'depo_pesanan_updated', 'depo_pengeluaran_updated', 'depo_setoran_kurir_updated', 'depo_shift_updated'];
    events.forEach(e => window.addEventListener(e, refresh));
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      events.forEach(e => window.removeEventListener(e, refresh));
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) { setNominal(0); setCatatan(''); }
  }, [isOpen]);

  if (!isOpen) return null;

  const shift = AppStore.getShiftAktif();
  const laci = AppStore.getKasLaciAktif();
  const saldoLaci = laci ? Math.max(0, laci.ekspektasi) : 0;
  const riwayat = AppStore.getSetoranOwner()
    .filter(s => s.jenis === 'serah_kasir' && (!shift || s.shift_id === shift.id))
    .slice(0, 6);

  const handleSerah = () => {
    try {
      const s = AppStore.serahkanKeOwner(nominal, catatan);
      alert(`${AppStore.formatRupiah(s.nominal)} dicatat diserahkan ke owner. Uang laci berkurang, owner akan menerimanya.`);
      setNominal(0);
      setCatatan('');
    } catch (err: any) {
      alert(err.message || 'Gagal mencatat penyerahan.');
    }
  };

  const handleBatal = (id: string) => {
    try {
      AppStore.batalkanSetoranOwner(id);
      alert('Penyerahan dibatalkan. Uangnya kembali dihitung di laci.');
    } catch (err: any) {
      alert(err.message || 'Gagal membatalkan.');
    }
  };

  const statusLabel = (s: { status: string; selisih?: number }) => {
    if (s.status === 'menunggu') return { teks: 'Menunggu diterima owner', warna: 'var(--c-amber)' };
    if (s.status === 'dibatalkan') return { teks: 'Dibatalkan', warna: 'var(--text-muted)' };
    if (s.selisih) return { teks: `Diterima, selisih ${AppStore.formatRupiah(s.selisih)}`, warna: 'var(--c-red)' };
    return { teks: 'Diterima owner', warna: 'var(--c-green)' };
  };

  return (
    <div className="sheet-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="judul-serah-owner" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2 id="judul-serah-owner" className="sheet-title">Serahkan Uang ke Owner</h2>
          <button type="button" className="icon-btn" aria-label="Tutup" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {!shift ? (
          <p style={{ color: 'var(--text-muted)' }}>Buka shift dulu. Penyerahan uang diambil dari laci shift yang sedang berjalan.</p>
        ) : (
          <>
            <div style={{ background: 'var(--inset-60)', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Uang di laci sekarang (perkiraan)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--c-green)' }}>{AppStore.formatRupiah(saldoLaci)}</div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="nominal-serah">Uang yang diserahkan (Rp)</label>
              <input
                id="nominal-serah"
                type="number"
                inputMode="numeric"
                className="form-input"
                value={nominal || ''}
                onChange={(e) => setNominal(Number(e.target.value))}
                placeholder="0"
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setNominal(saldoLaci)}>Semua uang laci</button>
              </div>

              <label className="form-label" htmlFor="catatan-serah" style={{ marginTop: '10px' }}>Catatan (opsional)</label>
              <input id="catatan-serah" type="text" className="form-input" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Contoh: setoran siang" />

              <button type="button" className="btn btn-success btn-lg" onClick={handleSerah} style={{ width: '100%', marginTop: '14px' }}>
                <HandCoins size={20} aria-hidden="true" /> Serahkan ke owner
              </button>
            </div>
          </>
        )}

        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '22px 0 8px' }}>Penyerahan shift ini</h3>
        {riwayat.length === 0 ? (
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Belum ada penyerahan.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {riwayat.map(s => {
              const st = statusLabel(s);
              return (
                <div key={s.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '10px 12px', opacity: s.status === 'dibatalkan' ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <strong style={{ textDecoration: s.status === 'dibatalkan' ? 'line-through' : 'none' }}>{AppStore.formatRupiah(s.nominal)}</strong>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: st.warna }}>{st.teks}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {new Date(s.waktu).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {s.catatan ? ` - ${s.catatan}` : ''}
                  </div>
                  {s.status === 'menunggu' && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleBatal(s.id)} style={{ marginTop: '8px' }}>
                      <Undo2 size={14} aria-hidden="true" /> Batalkan
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
