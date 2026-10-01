'use client';

import React from 'react';
import { Pengeluaran, UserApp } from '@/lib/types';
import { AppStore } from '@/lib/store';
import { cetakStrukBaris, susunBuktiKas } from '@/lib/cetak';
import { Printer, Share2, X, CheckCircle2 } from 'lucide-react';

interface ExpenseReceiptModalProps {
  pengeluaran: Pengeluaran | null;
  onClose: () => void;
}

export default function ExpenseReceiptModal({ pengeluaran, onClose }: ExpenseReceiptModalProps) {
  if (!pengeluaran) return null;

  const pengaturan = AppStore.getPengaturan();

  // Find owner WhatsApp number
  const users = AppStore.getUsers();
  const ownerUser = users.find((u: UserApp) => u.role === 'owner');
  const rawPhone = ownerUser?.no_hp || pengaturan.no_wa || '';
  
  // Format phone number for WhatsApp wa.me
  let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  }

  const handlePrint = () => {
    cetakStrukBaris(susunBuktiKas(pengeluaran, pengaturan, rawPhone));
  };

  const handleSendWAOwner = () => {
    const isMasuk = pengeluaran.tipe_arus_kas === 'masuk';
    let msg = `*📢 LAPORAN KAS ${isMasuk ? 'MASUK' : 'KELUAR'} DEPO*\n`;
    msg += `--------------------------------\n`;
    msg += `*Depo:* ${pengaturan.nama_depo}\n`;
    msg += `*No. Transaksi:* ${pengeluaran.id}\n`;
    msg += `*Tanggal:* ${new Date(pengeluaran.tanggal).toLocaleString('id-ID')}\n`;
    msg += `*Jenis:* Kas ${isMasuk ? 'Masuk (Pengembalian)' : 'Keluar (Pengeluaran)'}\n`;
    msg += `*Kategori:* ${pengeluaran.kategori ? pengeluaran.kategori.toUpperCase().replace(/_/g, ' ') : '-'}\n`;
    msg += `*Penerima/Staf:* ${pengeluaran.karyawan_nama || '-'}\n`;
    msg += `*Peruntukan:* ${pengeluaran.peruntukan}\n`;
    if (pengeluaran.kategori === 'pembelian_air_baku') {
      msg += `*Vendor Air:* ${pengeluaran.nama_vendor_pengirim || '-'}\n`;
      msg += `*Volume Air:* ${pengeluaran.volume_air_masuk_liter || 0} Liter\n`;
    }
    if (pengeluaran.catatan) {
      msg += `*Catatan:* ${pengeluaran.catatan}\n`;
    }
    msg += `--------------------------------\n`;
    msg += `*NOMINAL: ${AppStore.formatRupiah(pengeluaran.nominal)}*\n`;
    msg += `*Kasir/Petugas:* ${pengeluaran.kasir_nama}\n`;
    msg += `--------------------------------\n`;
    msg += `_Laporan otomatis dari Kasir ${pengaturan.nama_depo}_`;

    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    
    window.open(url, '_blank');
  };

  const isMasuk = pengeluaran.tipe_arus_kas === 'masuk';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', overflowY: 'auto'
    }}>
      <div className="glass-card animate-fade-in" style={{ margin: 'auto',
        width: '100%', maxWidth: '440px', backgroundColor: 'var(--surface-solid)', border: '1px solid var(--glass-border)',
        borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header Action Bar */}
        <div className="no-print" style={{
          padding: '16px 20px', borderBottom: '1px solid var(--glass-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          background: isMasuk ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isMasuk ? 'var(--c-green)' : 'var(--c-red)', fontWeight: 600 }}>
            <CheckCircle2 size={20} /> Bukti Kas Transaksi Ready
          </div>
          <button aria-label="Tutup" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Printable Receipt Body */}
        <div style={{
          padding: '24px', background: '#ffffff', color: '#000000', fontFamily: 'monospace', fontSize: '0.85rem',
          lineHeight: '1.4', maxHeight: '70vh', overflowY: 'auto'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            {pengaturan.logo_url && (
              <img src={pengaturan.logo_url} alt={pengaturan.nama_depo} style={{ maxHeight: '50px', maxWidth: '120px', objectFit: 'contain', marginBottom: '8px' }} />
            )}
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>{pengaturan.nama_depo}</h3>
            <p style={{ fontSize: '0.75rem', color: '#555', margin: '2px 0' }}>{pengaturan.alamat}</p>
            <p style={{ fontSize: '0.75rem', color: '#555', margin: '2px 0' }}>Telp/WA Owner: {rawPhone || '-'}</p>
            <p style={{ marginTop: '8px', marginBottom: '4px' }}>================================</p>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold', textTransform: 'uppercase', margin: '4px 0' }}>
              BUKTI TRANSAKSI KAS {isMasuk ? 'MASUK' : 'KELUAR'}
            </h4>
            <p style={{ margin: 0 }}>================================</p>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div>No Trans : {pengeluaran.id}</div>
            <div>Tgl      : {new Date(pengeluaran.tanggal).toLocaleString('id-ID')}</div>
            <div>Kategori : {pengeluaran.kategori ? pengeluaran.kategori.toUpperCase().replace(/_/g, ' ') : '-'}</div>
            <div>Penerima : {pengeluaran.karyawan_nama || '-'}</div>
            <div>Kasir    : {pengeluaran.kasir_nama}</div>
            <p style={{ margin: '8px 0 4px 0' }}>--------------------------------</p>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: 'bold' }}>Peruntukan / Keterangan:</div>
            <div style={{ paddingLeft: '8px', fontStyle: 'italic', background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', borderLeft: '3px solid var(--c-primary)', margin: '4px 0' }}>
              {pengeluaran.peruntukan}
            </div>

            {pengeluaran.kategori === 'pembelian_air_baku' && (
              <div style={{ fontSize: '0.8rem', marginTop: '6px', background: '#f0fdf4', padding: '6px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                <div>Vendor Air Baku : <b>{pengeluaran.nama_vendor_pengirim || '-'}</b></div>
                <div>Volume Air      : <b>{pengeluaran.volume_air_masuk_liter || 0} Liter</b></div>
                {pengeluaran.volume_air_masuk_liter ? (
                  <div>HPP Air Baku    : <b>Rp {((pengeluaran.nominal || 0) / (pengeluaran.volume_air_masuk_liter)).toFixed(1)} / Liter</b></div>
                ) : null}
                {pengeluaran.meteran_waktu_diisi_liter ? <div>Meteran Waktu Diisi: <b>{pengeluaran.meteran_waktu_diisi_liter.toLocaleString('id-ID')} Liter</b></div> : null}
                {pengeluaran.harga_perolehan_air ? <div>Harga Perolehan : {AppStore.formatRupiah(pengeluaran.harga_perolehan_air)}</div> : null}
                {pengeluaran.tips_sopir_pengirim ? <div>Tips Sopir      : {AppStore.formatRupiah(pengeluaran.tips_sopir_pengirim)}</div> : null}
              </div>
            )}

            {pengeluaran.catatan && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Catatan Tambahan: {pengeluaran.catatan}
              </div>
            )}
          </div>

          <div style={{ borderTop: '2px dashed #000', paddingTop: '8px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.05rem' }}>
              <span>TOTAL NOMINAL</span>
              <span>{AppStore.formatRupiah(pengeluaran.nominal)}</span>
            </div>
          </div>

          {/* Signature Box */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', textAlign: 'center', marginTop: '20px', fontSize: '0.75rem' }}>
            <div>
              <p style={{ margin: 0 }}>Yang Mengeluarkan</p>
              <div style={{ height: '40px' }}></div>
              <p style={{ fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '2px', margin: 0 }}>
                ( {pengeluaran.kasir_nama} )
              </p>
              <span style={{ fontSize: '0.65rem', color: '#666' }}>Kasir / Admin</span>
            </div>
            <div>
              <p style={{ margin: 0 }}>Yang Menerima</p>
              <div style={{ height: '40px' }}></div>
              <p style={{ fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '2px', margin: 0 }}>
                ( {pengeluaran.karyawan_nama || '                     '} )
              </p>
              <span style={{ fontSize: '0.65rem', color: '#666' }}>Penerima / Staf</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.7rem', color: '#666' }}>
            <p style={{ margin: '4px 0' }}>================================</p>
            <p style={{ margin: 0 }}>{pengaturan.footer_struk || 'Bukti Transaksi Sah Depo Air'}</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="no-print" style={{
          padding: '16px 20px', borderTop: '1px solid var(--glass-border)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--inset-90)'
        }}>
          <button onClick={handlePrint} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Printer size={16} /> Cetak Bukti Kas
          </button>
          <button onClick={handleSendWAOwner} className="btn btn-success" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Share2 size={16} /> Kirim WA ke Owner
          </button>
        </div>
      </div>
    </div>
  );
}
