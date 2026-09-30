'use client';

import React, { useEffect, useState } from 'react';
import { AppStore } from '@/lib/store';
import { SetoranKurir } from '@/lib/types';
import { X, Check, Pencil, Truck } from 'lucide-react';

interface SetoranKurirSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

// Kasir menerima setoran uang dari kurir. Boleh kapan saja dan berapa saja:
// kalau kurang dari saldo, sisanya tetap tercatat di kurir.
export default function SetoranKurirSheet({ isOpen, onClose }: SetoranKurirSheetProps) {
  const [, setTick] = useState(0);
  const [kurirId, setKurirId] = useState<string>('');
  const [nominal, setNominal] = useState<number>(0);
  const [catatan, setCatatan] = useState<string>('');
  const [koreksiId, setKoreksiId] = useState<string | null>(null);
  const [nominalBaru, setNominalBaru] = useState<number>(0);
  const [alasan, setAlasan] = useState<string>('');

  // Muat ulang tampilan saat data berubah (mis. kurir baru mengonfirmasi antaran)
  useEffect(() => {
    if (!isOpen) return;
    const refresh = () => setTick(t => t + 1);
    window.addEventListener('depo_setoran_kurir_updated', refresh);
    window.addEventListener('depo_pesanan_updated', refresh);
    window.addEventListener('depo_pengaturan_updated', refresh);
    return () => {
      window.removeEventListener('depo_setoran_kurir_updated', refresh);
      window.removeEventListener('depo_pesanan_updated', refresh);
      window.removeEventListener('depo_pengaturan_updated', refresh);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const kurirList = isOpen ? AppStore.getSaldoKurirList() : [];

  // Pilih kurir pertama yang membawa uang saat dibuka
  useEffect(() => {
    if (!isOpen) return;
    const list = AppStore.getSaldoKurirList();
    const first = list.find(k => k.saldo > 0) || list[0];
    setKurirId(first ? first.kurir_id : '');
    setKoreksiId(null);
    setCatatan('');
  }, [isOpen]);

  const kurir = kurirList.find(k => k.kurir_id === kurirId);

  // Isi nominal otomatis dengan seluruh saldo kurir yang dipilih
  useEffect(() => {
    if (isOpen && kurir) setNominal(Math.max(0, kurir.saldo));
  }, [isOpen, kurirId, kurir?.saldo]);

  if (!isOpen) return null;

  const rincian = kurirId ? AppStore.getPesananTunaiKurir(kurirId).slice(0, 6) : [];
  const riwayat: SetoranKurir[] = AppStore.getSetoranKurir().slice(0, 8);
  const sisaSetelah = kurir ? Math.max(0, kurir.saldo - nominal) : 0;

  const handleTerima = () => {
    try {
      const s = AppStore.tambahSetoran(kurirId, nominal, catatan);
      alert(`Setoran ${AppStore.formatRupiah(s.nominal)} dari ${s.kurir_nama} berhasil dicatat dan masuk kas laci.`);
      setCatatan('');
    } catch (err: any) {
      alert(err.message || 'Gagal mencatat setoran.');
    }
  };

  const bukaKoreksi = (s: SetoranKurir) => {
    setKoreksiId(s.id);
    setNominalBaru(s.nominal);
    setAlasan('');
  };

  const handleKoreksi = () => {
    if (!koreksiId) return;
    try {
      AppStore.koreksiSetoran(koreksiId, nominalBaru, alasan);
      alert('Koreksi tersimpan. Owner sudah mendapat pemberitahuan di dashboard.');
      setKoreksiId(null);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan koreksi.');
    }
  };

  return (
    <div className="sheet-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="judul-setoran" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2 id="judul-setoran" className="sheet-title">Setoran Kurir</h2>
          <button type="button" className="icon-btn" aria-label="Tutup setoran kurir" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {kurirList.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>
            Belum ada kurir. Tambahkan karyawan dengan jabatan Pengantar/Kurir di Pengaturan Toko.
          </p>
        ) : (
          <>
            <div className="form-label" id="label-pilih-kurir" style={{ marginBottom: '6px' }}>Pilih kurir</div>
            <div className="seg-grid" role="radiogroup" aria-labelledby="label-pilih-kurir" style={{ marginBottom: '14px' }}>
              {kurirList.map(k => (
                <button
                  key={k.kurir_id}
                  type="button"
                  role="radio"
                  aria-checked={kurirId === k.kurir_id}
                  className="seg-btn"
                  onClick={() => setKurirId(k.kurir_id)}
                  style={{ flexDirection: 'column', gap: '2px', padding: '10px 8px' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Truck size={16} aria-hidden="true" /> {k.kurir_nama}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{AppStore.formatRupiah(Math.max(0, k.saldo))}</span>
                </button>
              ))}
            </div>

            {kurir && (
              <div style={{ background: 'var(--inset-60)', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Uang yang dibawa {kurir.kurir_nama}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: kurir.saldo > 0 ? 'var(--c-amber)' : 'var(--c-green)' }}>
                  {AppStore.formatRupiah(Math.max(0, kurir.saldo))}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Diterima dari pelanggan {AppStore.formatRupiah(kurir.uang_diterima)} - sudah disetor {AppStore.formatRupiah(kurir.disetor)}
                </div>

                {rincian.length > 0 && (
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--c-sky)', fontWeight: 600 }}>Lihat rincian pesanan</summary>
                    <ul style={{ margin: '8px 0 0 0', padding: 0, listStyle: 'none', fontSize: '0.83rem' }}>
                      {rincian.map(p => (
                        <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '4px 0', borderBottom: '1px solid var(--w-5)' }}>
                          <span>{p.nama_pelanggan} <span style={{ color: 'var(--text-muted)' }}>({p.no_nota})</span></span>
                          <strong>{AppStore.formatRupiah(p.kurir_uang_diterima || 0)}</strong>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            {kurir && kurir.saldo > 0 ? (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="nominal-setoran">Uang yang diterima dari kurir (Rp)</label>
                <input
                  id="nominal-setoran"
                  type="number"
                  inputMode="numeric"
                  className="form-input"
                  value={nominal || ''}
                  onChange={(e) => setNominal(Number(e.target.value))}
                  placeholder="0"
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setNominal(kurir.saldo)}>Setor semua</button>
                </div>
                <p role="status" style={{ fontSize: '0.85rem', marginTop: '8px', color: sisaSetelah > 0 ? 'var(--c-amber)' : 'var(--text-muted)' }}>
                  {sisaSetelah > 0
                    ? `Sisa ${AppStore.formatRupiah(sisaSetelah)} tetap tercatat di ${kurir.kurir_nama}.`
                    : 'Seluruh uang kurir ini akan lunas disetor.'}
                </p>

                <label className="form-label" htmlFor="catatan-setoran" style={{ marginTop: '4px' }}>Catatan (opsional)</label>
                <input id="catatan-setoran" type="text" className="form-input" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Contoh: setoran siang" />

                <button type="button" className="btn btn-success btn-lg" onClick={handleTerima} style={{ width: '100%', marginTop: '14px' }}>
                  <Check size={20} aria-hidden="true" /> Terima setoran
                </button>
              </div>
            ) : (
              kurir && <p style={{ color: 'var(--c-green)', fontWeight: 600 }}>{kurir.kurir_nama} tidak membawa uang. Tidak ada yang perlu disetor.</p>
            )}
          </>
        )}

        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '22px 0 8px' }}>Riwayat setoran</h3>
        {riwayat.length === 0 ? (
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Belum ada setoran.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {riwayat.map(s => (
              <div key={s.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '10px 12px', opacity: s.dibatalkan ? 0.6 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <strong>{s.kurir_nama}</strong>
                  <strong style={{ color: s.dibatalkan ? 'var(--text-muted)' : 'var(--c-green)', textDecoration: s.dibatalkan ? 'line-through' : 'none' }}>
                    {AppStore.formatRupiah(s.dibatalkan ? (s.riwayat_koreksi?.[0]?.dari ?? s.nominal) : s.nominal)}
                  </strong>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {new Date(s.tanggal).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} - diterima {s.kasir_nama}
                  {s.catatan ? ` - ${s.catatan}` : ''}
                </div>
                {(s.riwayat_koreksi || []).length > 0 && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--c-amber)', marginTop: '4px' }}>
                    {s.dibatalkan ? 'Dibatalkan' : 'Dikoreksi'} oleh {s.riwayat_koreksi![s.riwayat_koreksi!.length - 1].oleh}: {s.riwayat_koreksi![s.riwayat_koreksi!.length - 1].alasan}
                  </div>
                )}

                {!s.dibatalkan && koreksiId !== s.id && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => bukaKoreksi(s)} style={{ marginTop: '8px' }}>
                    <Pencil size={14} aria-hidden="true" /> Koreksi
                  </button>
                )}

                {koreksiId === s.id && (
                  <div style={{ marginTop: '10px', background: 'var(--inset-60)', borderRadius: '10px', padding: '10px' }}>
                    <label className="form-label" htmlFor="nominal-koreksi">Nominal yang benar (Rp), isi 0 untuk membatalkan</label>
                    <input id="nominal-koreksi" type="number" inputMode="numeric" className="form-input" value={nominalBaru === 0 ? '0' : nominalBaru || ''} onChange={(e) => setNominalBaru(Number(e.target.value))} />
                    <label className="form-label" htmlFor="alasan-koreksi" style={{ marginTop: '8px', display: 'block' }}>Alasan koreksi (wajib)</label>
                    <textarea id="alasan-koreksi" className="form-textarea" rows={2} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Contoh: salah hitung uang, kurang Rp 10.000" />
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '6px 0' }}>Owner akan mendapat pemberitahuan di dashboard.</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setKoreksiId(null)}>Batal</button>
                      <button type="button" className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleKoreksi}>Simpan koreksi</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
