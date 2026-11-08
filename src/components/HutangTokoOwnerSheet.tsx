'use client';

import React, { useEffect, useState } from 'react';
import { AppStore } from '@/lib/store';
import { HutangToko, TipePihakHutang } from '@/lib/types';
import { X } from 'lucide-react';

// Owner mencatat hutang toko, terutama hutang lama (mis. ke karyawan) yang sudah ada sebelum aplikasi dipakai.
// Tanggalnya boleh diisi mundur. Mencatat hutang tidak menggerakkan uang; uang baru keluar saat hutang dibayar.
export default function HutangTokoOwnerSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [tipe, setTipe] = useState<TipePihakHutang>('karyawan');
  const [karyawanId, setKaryawanId] = useState<string>('');
  const [namaLain, setNamaLain] = useState<string>('');
  const [peruntukan, setPeruntukan] = useState<string>('');
  const [nominal, setNominal] = useState<number>(0);
  const [tanggal, setTanggal] = useState<string>(AppStore.tanggalHariIni());
  const [catatan, setCatatan] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setTipe('karyawan'); setKaryawanId(''); setNamaLain(''); setPeruntukan('Hutang lama sebelum memakai aplikasi');
    setNominal(0); setTanggal(AppStore.tanggalHariIni()); setCatatan('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const karyawan = (AppStore.getPengaturan().karyawan_list || []).filter(k => k.aktif);
  const hariIni = AppStore.tanggalHariIni();

  const simpan = (e: React.FormEvent) => {
    e.preventDefault();
    const jumlah = Math.round(nominal);
    if (!(jumlah > 0)) { alert('Nominal hutang harus lebih besar dari Rp 0!'); return; }
    if (!peruntukan.trim()) { alert('Isi keperluan hutang ini.'); return; }
    if (!tanggal || tanggal > hariIni) { alert('Tanggal tidak boleh di masa depan.'); return; }
    let nama = '';
    let kid: string | undefined;
    if (tipe === 'karyawan') {
      const k = karyawan.find(x => x.id === karyawanId);
      if (!k) { alert('Pilih nama karyawan dulu.'); return; }
      nama = `${k.nama} (${k.jabatan})`;
      kid = k.id;
    } else {
      if (!namaLain.trim()) { alert('Isi nama pihak yang dihutangi.'); return; }
      nama = namaLain.trim();
    }
    const user = AppStore.getCurrentUser();
    const item: HutangToko = {
      id: `htg-toko-${Date.now()}`,
      tanggal: new Date(`${tanggal}T12:00:00`).toISOString(),
      tipe_pihak: tipe,
      karyawan_id: kid,
      nama_pihak: nama,
      peruntukan: peruntukan.trim(),
      nominal_hutang: jumlah,
      total_dibayar: 0,
      sisa_hutang: jumlah,
      status: 'belum_lunas',
      kasir_id: user.id,
      kasir_nama: user.nama,
      catatan: catatan.trim() || undefined,
    };
    AppStore.addHutangToko(item);
    alert(`Hutang ${AppStore.formatRupiah(jumlah)} ke ${nama} dicatat. Uang kas tidak berubah sampai hutang ini dibayar.`);
    onClose();
  };

  return (
    <div className="sheet-overlay" onClick={onClose} style={{ zIndex: 1300 }}>
      <form className="sheet" role="dialog" aria-modal="true" aria-labelledby="judul-hutang-owner" onClick={(e) => e.stopPropagation()} onSubmit={simpan}>
        <div className="sheet-header">
          <h2 id="judul-hutang-owner" className="sheet-title">Catat hutang toko</h2>
          <button type="button" className="icon-btn" aria-label="Tutup" onClick={onClose}><X size={20} aria-hidden="true" /></button>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>
          Untuk uang yang dipinjam depo dari karyawan atau pihak lain, termasuk hutang lama. Isi hanya sisa yang belum dibayar. Mencatat hutang tidak mengubah uang kas.
        </p>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }} role="radiogroup" aria-label="Pihak yang dihutangi">
          <button type="button" className="seg-btn" role="radio" aria-checked={tipe === 'karyawan'} onClick={() => setTipe('karyawan')} style={{ flex: 1 }}>Karyawan</button>
          <button type="button" className="seg-btn" role="radio" aria-checked={tipe === 'orang_ketiga'} onClick={() => setTipe('orang_ketiga')} style={{ flex: 1 }}>Pihak lain</button>
        </div>
        {tipe === 'karyawan' ? (
          <div className="form-group">
            <label className="form-label" htmlFor="ht-karyawan">Karyawan</label>
            <select id="ht-karyawan" className="form-select" value={karyawanId} onChange={(e) => setKaryawanId(e.target.value)}>
              <option value="">Pilih karyawan</option>
              {karyawan.map(k => <option key={k.id} value={k.id}>{k.nama} ({k.jabatan})</option>)}
            </select>
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label" htmlFor="ht-nama">Nama pihak (vendor, supplier, dll)</label>
            <input id="ht-nama" type="text" className="form-input" value={namaLain} onChange={(e) => setNamaLain(e.target.value)} />
          </div>
        )}
        <div className="form-group" style={{ marginTop: '10px' }}>
          <label className="form-label" htmlFor="ht-nominal">Sisa hutang (Rp)</label>
          <input id="ht-nominal" type="number" inputMode="numeric" className="form-input" value={nominal || ''} onChange={(e) => setNominal(Number(e.target.value))} />
        </div>
        <div className="form-group" style={{ marginTop: '10px' }}>
          <label className="form-label" htmlFor="ht-tanggal">Tanggal hutang (boleh mundur)</label>
          <input id="ht-tanggal" type="date" className="form-input" value={tanggal} max={hariIni} onChange={(e) => setTanggal(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginTop: '10px' }}>
          <label className="form-label" htmlFor="ht-untuk">Keperluan</label>
          <input id="ht-untuk" type="text" className="form-input" value={peruntukan} onChange={(e) => setPeruntukan(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginTop: '10px' }}>
          <label className="form-label" htmlFor="ht-catatan">Catatan (boleh kosong)</label>
          <input id="ht-catatan" type="text" className="form-input" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Batal</button>
          <button type="submit" className="btn btn-success" style={{ flex: 2 }}>Simpan hutang</button>
        </div>
      </form>
    </div>
  );
}
