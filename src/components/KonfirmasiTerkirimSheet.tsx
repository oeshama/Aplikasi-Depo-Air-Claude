'use client';

import React, { useEffect, useState } from 'react';
import { AppStore } from '@/lib/store';
import { MetodePembayaran, Pesanan } from '@/lib/types';
import { X, Check, Banknote, QrCode, Landmark, BookOpen } from 'lucide-react';

interface KurirOption {
  id: string;
  nama: string;
}

interface KonfirmasiTerkirimSheetProps {
  pesanan: Pesanan | null;
  // Diisi saat kasir yang mengonfirmasi (kasir memilih kurir yang mengantar)
  kurirOptions?: KurirOption[];
  // Diisi saat kurir yang mengonfirmasi (kurir = user yang sedang login)
  defaultKurirId?: string;
  onClose: () => void;
  onDone: (pesanan: Pesanan) => void;
}

const METODE: { value: MetodePembayaran; label: string; Icon: typeof Banknote }[] = [
  { value: 'tunai', label: 'Tunai', Icon: Banknote },
  { value: 'transfer', label: 'Transfer', Icon: Landmark },
  { value: 'qris', label: 'QRIS', Icon: QrCode },
  { value: 'hutang', label: 'Belum bayar', Icon: BookOpen },
];

// Lembar "Sudah terkirim": mencatat cara bayar dari pelanggan.
// Uang tunai dicatat sebagai saldo kurir sampai kurir menyetor ke kasir.
export default function KonfirmasiTerkirimSheet({ pesanan, kurirOptions, defaultKurirId, onClose, onDone }: KonfirmasiTerkirimSheetProps) {
  const [metode, setMetode] = useState<MetodePembayaran>('tunai');
  const [diterima, setDiterima] = useState<number>(0);
  const [kurirId, setKurirId] = useState<string>('');
  const [sedangProses, setSedangProses] = useState<boolean>(false);

  useEffect(() => {
    if (!pesanan) return;
    setMetode('tunai');
    setDiterima(pesanan.total_akhir);
    setKurirId(defaultKurirId || pesanan.pengantar_id || (kurirOptions && kurirOptions.length === 1 ? kurirOptions[0].id : ''));
    setSedangProses(false);
  }, [pesanan]);

  useEffect(() => {
    if (!pesanan) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pesanan, onClose]);

  if (!pesanan) return null;

  const total = pesanan.total_akhir;
  const uangLewatKurir = !!pesanan.bayar_ke_kurir;
  const perluPilihKurir = !!kurirOptions && (uangLewatKurir && metode === 'tunai');
  const kurang = Math.max(0, total - diterima);
  const lebih = Math.max(0, diterima - total);

  const handleKonfirmasi = () => {
    if (perluPilihKurir && !kurirId) {
      alert('Pilih kurir yang mengantar dulu.');
      return;
    }
    if (uangLewatKurir && metode === 'tunai' && diterima < 0) {
      alert('Jumlah uang diterima tidak boleh minus.');
      return;
    }
    setSedangProses(true);
    try {
      const hasil = AppStore.konfirmasiTerkirim(pesanan.id, {
        metode: uangLewatKurir ? metode : undefined,
        jumlahDiterima: metode === 'tunai' ? diterima : undefined,
        kurirId: kurirId || undefined,
      });
      onDone(hasil);
    } catch (err: any) {
      setSedangProses(false);
      alert(err.message || 'Gagal mengonfirmasi pengiriman.');
    }
  };

  return (
    <div className="sheet-overlay" style={{ zIndex: 1100 }} onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="judul-konfirmasi-kirim" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2 id="judul-konfirmasi-kirim" className="sheet-title">Konfirmasi Terkirim</h2>
          <button type="button" className="icon-btn" aria-label="Tutup" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div style={{ background: 'var(--inset-60)', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px' }}>
          <div style={{ fontWeight: 700 }}>{pesanan.nama_pelanggan}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{pesanan.no_nota}</div>
          <div style={{ marginTop: '6px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--c-green)' }}>
            {AppStore.formatRupiah(total)}
          </div>
        </div>

        {kurirOptions && (uangLewatKurir || kurirOptions.length > 0) && (
          <div className="form-group">
            <label className="form-label" htmlFor="pilih-kurir-kirim">
              Diantar oleh{perluPilihKurir ? ' *' : ' (opsional)'}
            </label>
            <select id="pilih-kurir-kirim" className="form-select" value={kurirId} onChange={(e) => setKurirId(e.target.value)}>
              <option value="">Pilih kurir</option>
              {kurirOptions.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
          </div>
        )}

        {uangLewatKurir ? (
          <>
            <div style={{ marginBottom: '14px' }}>
              <div className="form-label" id="label-metode-kirim" style={{ marginBottom: '6px' }}>Pelanggan membayar dengan</div>
              <div className="seg-grid" role="radiogroup" aria-labelledby="label-metode-kirim">
                {METODE.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={metode === value}
                    className="seg-btn"
                    onClick={() => setMetode(value)}
                  >
                    <Icon size={18} aria-hidden="true" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {metode === 'tunai' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="uang-diterima-kurir">Uang tunai yang diterima dari pelanggan (Rp)</label>
                <input
                  id="uang-diterima-kurir"
                  type="number"
                  inputMode="numeric"
                  className="form-input"
                  value={diterima || ''}
                  onChange={(e) => setDiterima(Number(e.target.value))}
                  placeholder="0"
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDiterima(total)}>Uang pas</button>
                </div>
                <p role="status" style={{ fontSize: '0.85rem', marginTop: '8px', color: kurang > 0 ? 'var(--c-amber)' : 'var(--text-muted)' }}>
                  {kurang > 0
                    ? `Kurang ${AppStore.formatRupiah(kurang)} akan dicatat sebagai hutang pelanggan.`
                    : lebih > 0
                      ? `Lebih ${AppStore.formatRupiah(lebih)}. Semua uang ini tercatat dibawa kurir sampai disetor.`
                      : 'Uang ini tercatat dibawa kurir sampai kurir menyetor ke kasir.'}
                </p>
              </div>
            )}

            {(metode === 'transfer' || metode === 'qris') && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Uang masuk ke rekening/QRIS depo, tidak lewat kurir. Kasir tinggal mengecek mutasinya.
              </p>
            )}

            {metode === 'hutang' && (
              <p style={{ fontSize: '0.85rem', color: 'var(--c-amber)' }}>
                Seluruh tagihan ({AppStore.formatRupiah(total)}) dicatat sebagai hutang pelanggan.
              </p>
            )}
          </>
        ) : (
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Pesanan ini sudah tercatat pembayarannya, jadi tidak ada uang yang perlu dicatat. Cukup tandai sudah terkirim.
          </p>
        )}

        <button type="button" className="btn btn-success btn-lg" onClick={handleKonfirmasi} disabled={sedangProses} style={{ width: '100%', marginTop: '16px' }}>
          <Check size={20} aria-hidden="true" /> Sudah terkirim
        </button>
      </div>
    </div>
  );
}
