'use client';

import React, { useEffect, useState } from 'react';
import { AppStore } from '@/lib/store';
import { Pesanan } from '@/lib/types';
import { X } from 'lucide-react';

// Koreksi kas manual untuk pesanan yang dibatalkan saat "Koreksi manual" aktif di Pengaturan Toko.
// Uang pesanan itu tidak berubah otomatis, jadi owner mencatat sendiri berapa dan dari mana uangnya dikoreksi.
export default function KoreksiBatalSheet({ pesanan, onClose }: { pesanan: Pesanan | null; onClose: () => void }) {
  const [nominal, setNominal] = useState<number>(0);
  const [sumber, setSumber] = useState<string>('laci');
  const [alasan, setAlasan] = useState<string>('');

  useEffect(() => {
    if (!pesanan) return;
    const info = pesanan.batal_info;
    const sisa = Math.max(0, (info?.perlu_kembalikan || info?.total_asli || 0) - (info?.koreksi_dicatat || 0));
    setNominal(sisa);
    setSumber('laci');
    setAlasan('');
  }, [pesanan]);

  useEffect(() => {
    if (!pesanan) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pesanan, onClose]);

  if (!pesanan || !pesanan.batal_info) return null;
  const info = pesanan.batal_info;
  const rekening = AppStore.getRekening().filter(r => r.aktif);
  const mulaiKeuangan = AppStore.keuanganSudahMulai();

  const simpan = () => {
    try {
      const rekId = sumber !== 'laci' && sumber !== 'kas_besar' ? sumber : undefined;
      AppStore.catatKoreksiBatal(pesanan.id, nominal, sumber === 'laci' ? 'laci' : sumber === 'kas_besar' ? 'kas_besar' : 'rekening', rekId, alasan);
      alert('Koreksi dicatat sebagai uang keluar.');
      onClose();
    } catch (e: any) {
      alert(e?.message || 'Gagal mencatat koreksi.');
    }
  };

  return (
    <div className="sheet-overlay" onClick={onClose} style={{ zIndex: 1300 }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="judul-koreksi-batal" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2 id="judul-koreksi-batal" className="sheet-title">Koreksi manual {pesanan.no_nota}</h2>
          <button type="button" className="icon-btn" aria-label="Tutup" onClick={onClose}><X size={20} aria-hidden="true" /></button>
        </div>
        <p style={{ fontSize: '0.88rem', margin: '0 0 10px' }}>
          Pesanan {pesanan.nama_pelanggan} ({AppStore.formatRupiah(info.total_asli)}, {info.metode_asli}) dibatalkan oleh {info.oleh}: {info.alasan}.
          Uangnya belum dikoreksi otomatis. Catat berapa uang yang keluar karena pembatalan ini, misalnya uang dikembalikan ke pelanggan.
        </p>
        {(info.koreksi_dicatat || 0) > 0 && (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>Sudah dikoreksi sebelumnya: {AppStore.formatRupiah(info.koreksi_dicatat || 0)}.</p>
        )}
        <div className="form-group">
          <label className="form-label" htmlFor="kb-nominal">Nominal koreksi (Rp)</label>
          <input id="kb-nominal" type="number" inputMode="numeric" className="form-input" value={nominal || ''} onChange={(e) => setNominal(Number(e.target.value))} />
        </div>
        <div className="form-group" style={{ marginTop: '10px' }}>
          <label className="form-label" htmlFor="kb-sumber">Uang keluar dari</label>
          <select id="kb-sumber" className="form-select" value={sumber} onChange={(e) => setSumber(e.target.value)}>
            <option value="laci">Laci kasir</option>
            {mulaiKeuangan && <option value="kas_besar">Kas besar owner</option>}
            {mulaiKeuangan && rekening.map(r => <option key={r.id} value={r.id}>Rekening {r.nama}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginTop: '10px' }}>
          <label className="form-label" htmlFor="kb-alasan">Catatan (boleh kosong)</label>
          <input id="kb-alasan" type="text" className="form-input" value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Mis. uang dikembalikan ke pelanggan" />
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Batal</button>
          <button type="button" className="btn btn-success" style={{ flex: 2 }} onClick={simpan}>Catat koreksi</button>
        </div>
      </div>
    </div>
  );
}
