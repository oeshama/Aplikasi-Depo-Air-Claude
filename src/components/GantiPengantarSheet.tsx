'use client';

import React, { useEffect, useState } from 'react';
import { AppStore } from '@/lib/store';
import { Pesanan } from '@/lib/types';
import { picuPushTugas } from '@/lib/push';
import { X } from 'lucide-react';

// Kasir/owner/admin mengganti pengantar untuk pesanan yang belum terkirim.
// Pengantar lama diberi tahu tugasnya dipindah, pengantar baru diberi tahu ada tugas.
export default function GantiPengantarSheet({ pesanan, onClose }: { pesanan: Pesanan | null; onClose: () => void }) {
  const [pilih, setPilih] = useState<string>('');

  useEffect(() => { if (pesanan) setPilih(pesanan.pengantar_id || ''); }, [pesanan]);

  useEffect(() => {
    if (!pesanan) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pesanan, onClose]);

  if (!pesanan) return null;
  const pengantar = AppStore.pengantarAktif();

  const simpan = () => {
    try {
      const hasil = AppStore.gantiPengantar(pesanan.id, pilih);
      const kontak = AppStore.getKontak().find(k => k.id === hasil.pesanan.kontak_id);
      const ringkas = (hasil.pesanan.items || []).map(i => `${i.jumlah} ${i.nama_produk}`).join(', ');
      const alamat = kontak?.alamat || '';
      if (hasil.lama) picuPushTugas({ no: hasil.pesanan.no_nota, ringkas, alamat, pengantarId: hasil.lama, aksi: 'dipindah' });
      picuPushTugas({ no: hasil.pesanan.no_nota, ringkas, alamat, pengantarId: hasil.baru, aksi: 'baru' });
      onClose();
    } catch (e: any) {
      alert(e?.message || 'Gagal mengganti pengantar.');
    }
  };

  return (
    <div className="sheet-overlay" onClick={onClose} style={{ zIndex: 1300 }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="judul-ganti-pengantar" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2 id="judul-ganti-pengantar" className="sheet-title">Ganti pengantar {pesanan.no_nota}</h2>
          <button type="button" className="icon-btn" aria-label="Tutup" onClick={onClose}><X size={20} aria-hidden="true" /></button>
        </div>
        <p style={{ fontSize: '0.88rem', margin: '0 0 10px' }}>
          {pesanan.nama_pelanggan}. Sekarang: <strong>{AppStore.namaPengantar(pesanan.pengantar_id)}</strong>.
        </p>
        <div className="form-group">
          <label className="form-label" htmlFor="gp-pilih">Pengantar</label>
          <select id="gp-pilih" className="form-select" value={pilih} onChange={(e) => setPilih(e.target.value)}>
            <option value="">Belum ditugaskan (semua pengantar melihatnya)</option>
            {pengantar.map(u => <option key={u.id} value={u.id}>{u.nama}</option>)}
          </select>
        </div>
        {(pesanan.riwayat_pengantar || []).length > 0 && (
          <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {(pesanan.riwayat_pengantar || []).slice(-4).map((r, i) => (
              <li key={i}>
                {new Date(r.waktu).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}: {AppStore.namaPengantar(r.dari)} ke {AppStore.namaPengantar(r.ke)} oleh {r.oleh}
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Batal</button>
          <button type="button" className="btn btn-success" style={{ flex: 2 }} onClick={simpan}>Simpan</button>
        </div>
      </div>
    </div>
  );
}
