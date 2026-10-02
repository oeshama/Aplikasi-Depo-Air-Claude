'use client';

import React, { useEffect, useState } from 'react';
import { AppStore } from '@/lib/store';
import { Pengeluaran } from '@/lib/types';
import { X, Receipt } from 'lucide-react';

interface PengeluaranOwnerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (p: Pengeluaran) => void;
}

const KATEGORI: { id: string; nama: string }[] = [
  { id: 'pembelian_air_baku', nama: 'Pembelian air baku' },
  { id: 'hutang_toko', nama: 'Bayar hutang toko' },
  { id: 'ongkir', nama: 'Ongkir kurir' },
  { id: 'operasional', nama: 'Operasional depo' },
  { id: 'bensin', nama: 'Bensin / BBM' },
  { id: 'konsumsi', nama: 'Konsumsi' },
  { id: 'lain_lain', nama: 'Lain-lain' },
];

// Owner mencatat pengeluaran yang dibayar dari kas besar atau rekening, mis. saat kiriman air datang malam dan kasir sudah pulang.
// Gaji, kasbon, dan uang makan tetap dibayar dari Dashboard Owner (bagian karyawan).
export default function PengeluaranOwnerSheet({ isOpen, onClose, onSaved }: PengeluaranOwnerSheetProps) {
  const [kategori, setKategori] = useState<string>('pembelian_air_baku');
  const [sumber, setSumber] = useState<string>('kas_besar'); // 'kas_besar' atau id rekening
  const [nominal, setNominal] = useState<number>(0);
  const [peruntukan, setPeruntukan] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('');
  const [vendor, setVendor] = useState<string>('');
  const [volume, setVolume] = useState<number>(0);
  const [harga, setHarga] = useState<number>(0);
  const [tips, setTips] = useState<number>(0);
  const [karyawanId, setKaryawanId] = useState<string>('');
  const [hutangId, setHutangId] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setKategori('pembelian_air_baku'); setSumber('kas_besar'); setNominal(0); setPeruntukan(''); setCatatan('');
    setVendor(''); setVolume(0); setHarga(0); setTips(0); setKaryawanId(''); setHutangId('');
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const fmt = (n: number) => AppStore.formatRupiah(n);
  const rekening = AppStore.getRekening().filter(r => r.aktif);
  const akunList = [{ id: 'kas_besar', nama: 'Kas besar (tunai)' }, ...rekening.map(r => ({ id: r.id, nama: r.nama }))];
  const karyawan = (AppStore.getPengaturan().karyawan_list || []).filter(k => k.aktif);
  const hutangTerbuka = AppStore.getHutangToko().filter(h => h.status !== 'lunas' && (h.sisa_hutang || 0) > 0);
  const hutangDipilih = hutangTerbuka.find(h => h.id === hutangId);
  const totalAir = (harga || 0) + (tips || 0);
  const saldoSumber = AppStore.getSaldoAkun(sumber);

  const pilihHutang = (id: string) => {
    setHutangId(id);
    const h = hutangTerbuka.find(x => x.id === id);
    setNominal(h ? h.sisa_hutang : 0);
  };

  const simpan = () => {
    try {
      const sumberKas = sumber === 'kas_besar' ? 'kas_besar' : 'rekening';
      const rekeningId = sumber === 'kas_besar' ? undefined : sumber;
      let hasil: Pengeluaran;
      if (kategori === 'hutang_toko') {
        if (!hutangDipilih) throw new Error('Pilih hutang toko yang dibayar.');
        hasil = AppStore.bayarHutangToko(hutangDipilih.id, nominal, catatan.trim() || undefined, { sumber_kas: sumberKas, rekening_id: rekeningId });
      } else {
        const kary = karyawan.find(k => k.id === karyawanId);
        hasil = AppStore.catatPengeluaranOwner({
          sumber: sumberKas, rekening_id: rekeningId, kategori,
          peruntukan: peruntukan || (kategori === 'ongkir' && kary ? `Ongkir / Transport - ${kary.nama}` : ''),
          nominal, catatan,
          karyawan: kategori === 'ongkir' && kary ? { id: kary.id, nama: kary.nama } : undefined,
          air: kategori === 'pembelian_air_baku' ? { vendor, volume, harga, tips } : undefined
        });
      }
      onSaved(hasil);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan pengeluaran.');
    }
  };

  const baris = (id: string, label: string, nilai: number, set: (n: number) => void, placeholder = '0') => (
    <div className="form-group" style={{ marginBottom: '10px' }}>
      <label className="form-label" htmlFor={id}>{label}</label>
      <input id={id} type="number" inputMode="numeric" className="form-input" value={nilai || ''} onChange={(e) => set(Number(e.target.value))} placeholder={placeholder} />
    </div>
  );

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="judul-peng-owner" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2 id="judul-peng-owner" className="sheet-title">Pengeluaran dari kas owner</h2>
          <button type="button" className="icon-btn" aria-label="Tutup" onClick={onClose}><X size={20} aria-hidden="true" /></button>
        </div>

        <div className="form-group" style={{ marginBottom: '10px' }}>
          <label className="form-label" htmlFor="peng-owner-kategori">Jenis pengeluaran</label>
          <select id="peng-owner-kategori" className="form-input" value={kategori} onChange={(e) => { setKategori(e.target.value); setNominal(0); setHutangId(''); }}>
            {KATEGORI.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: '10px' }}>
          <label className="form-label" htmlFor="peng-owner-sumber">Dibayar dari</label>
          <select id="peng-owner-sumber" className="form-input" value={sumber} onChange={(e) => setSumber(e.target.value)}>
            {akunList.map(a => <option key={a.id} value={a.id}>{a.nama} - {fmt(AppStore.getSaldoAkun(a.id))}</option>)}
          </select>
        </div>

        {kategori === 'pembelian_air_baku' && (
          <>
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="form-label" htmlFor="peng-owner-vendor">Vendor / sopir pengirim</label>
              <input id="peng-owner-vendor" type="text" className="form-input" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Contoh: Truk Tangki Pak Joko" />
            </div>
            {baris('peng-owner-volume', 'Volume air masuk (Liter)', volume, setVolume)}
            {baris('peng-owner-harga', 'Harga air (Rp)', harga, setHarga)}
            {baris('peng-owner-tips', 'Tips sopir (Rp)', tips, setTips)}
            <p style={{ fontSize: '0.88rem', margin: '0 0 10px' }}>Total dibayar: <strong>{fmt(totalAir)}</strong>. Stok air baku bertambah {volume || 0} Liter.</p>
          </>
        )}

        {kategori === 'hutang_toko' && (
          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label className="form-label" htmlFor="peng-owner-hutang">Hutang yang dibayar</label>
            {hutangTerbuka.length === 0 ? (
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>Tidak ada hutang toko yang belum lunas.</p>
            ) : (
              <select id="peng-owner-hutang" className="form-input" value={hutangId} onChange={(e) => pilihHutang(e.target.value)}>
                <option value="">Pilih hutang</option>
                {hutangTerbuka.map(h => <option key={h.id} value={h.id}>{h.nama_pihak} - {h.peruntukan} - sisa {fmt(h.sisa_hutang)}</option>)}
              </select>
            )}
          </div>
        )}

        {kategori === 'ongkir' && (
          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label className="form-label" htmlFor="peng-owner-kurir">Kurir yang dibayar</label>
            <select id="peng-owner-kurir" className="form-input" value={karyawanId} onChange={(e) => setKaryawanId(e.target.value)}>
              <option value="">Pilih kurir</option>
              {karyawan.map(k => <option key={k.id} value={k.id}>{k.nama} - {k.jabatan}</option>)}
            </select>
          </div>
        )}

        {kategori !== 'pembelian_air_baku' && baris('peng-owner-nominal', kategori === 'hutang_toko' ? 'Nominal dibayar (Rp)' : 'Nominal (Rp)', nominal, setNominal)}

        {kategori !== 'hutang_toko' && (
          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label className="form-label" htmlFor="peng-owner-untuk">Untuk apa{kategori === 'pembelian_air_baku' ? ' (opsional)' : ''}</label>
            <input id="peng-owner-untuk" type="text" className="form-input" value={peruntukan} onChange={(e) => setPeruntukan(e.target.value)} placeholder="Contoh: servis pompa" />
          </div>
        )}
        <div className="form-group" style={{ marginBottom: '10px' }}>
          <label className="form-label" htmlFor="peng-owner-catatan">Catatan (opsional)</label>
          <input id="peng-owner-catatan" type="text" className="form-input" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        </div>

        {(kategori === 'pembelian_air_baku' ? totalAir : nominal) > saldoSumber && (
          <p role="alert" style={{ color: 'var(--c-red)', fontSize: '0.85rem', margin: '0 0 10px' }}>Saldo yang dipilih hanya {fmt(saldoSumber)}, tidak cukup.</p>
        )}
        <button type="button" className="btn btn-primary btn-lg" onClick={simpan} style={{ width: '100%' }}>
          <Receipt size={20} aria-hidden="true" /> Simpan pengeluaran
        </button>
      </div>
    </div>
  );
}
