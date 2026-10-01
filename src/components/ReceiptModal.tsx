'use client';

import React from 'react';
import { Pesanan } from '@/lib/types';
import { AppStore } from '@/lib/store';
import { cetakStrukPenjualan } from '@/lib/cetak';
import { Printer, Share2, X, CheckCircle2 } from 'lucide-react';

interface ReceiptModalProps {
  pesanan: Pesanan | null;
  onClose: () => void;
}

export default function ReceiptModal({ pesanan, onClose }: ReceiptModalProps) {
  if (!pesanan) return null;

  const pengaturan = AppStore.getPengaturan();

  const handlePrint = () => {
    cetakStrukPenjualan(pesanan);
  };

  const handleSendWA = () => {
    let msg = `*${pengaturan.nama_depo}*\n`;
    msg += `No. Struk: ${pesanan.no_nota}\n`;
    msg += `Tanggal: ${new Date(pesanan.created_at).toLocaleString('id-ID')}\n`;
    msg += `Pelanggan: ${pesanan.nama_pelanggan}\n`;
    msg += `--------------------------------\n`;
    pesanan.items.forEach(item => {
      msg += `${item.nama_produk} x${item.jumlah} = ${AppStore.formatRupiah(item.subtotal)}\n`;
    });
    if (pesanan.total_ongkir > 0) {
      msg += `Ongkir: ${AppStore.formatRupiah(pesanan.total_ongkir)}\n`;
    }
    msg += `--------------------------------\n`;
    msg += `*TOTAL: ${AppStore.formatRupiah(pesanan.total_akhir)}*\n`;
    const menungguKurir = !!pesanan.bayar_ke_kurir && !pesanan.kurir_diterima_at;
    msg += `Status Bayar: ${menungguKurir ? 'BAYAR TUNAI KE KURIR' : pesanan.status_pembayaran.toUpperCase()}\n`;
    msg += `Catatan: ${pesanan.catatan || '-'}\n\n`;
    msg += `${pengaturan.footer_struk}`;

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', overflowY: 'auto'
    }}>
      <div className="glass-card animate-fade-in" style={{ margin: 'auto',
        width: '100%', maxWidth: '420px', backgroundColor: 'var(--surface-solid)', border: '1px solid var(--glass-border)',
        borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header Action Bar */}
        <div className="no-print" style={{
          padding: '16px 20px', borderBottom: '1px solid var(--glass-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(2, 132, 199, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--c-sky)', fontWeight: 600 }}>
            <CheckCircle2 size={20} /> Struk Transaksi Ready
          </div>
          <button aria-label="Tutup" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Thermal Printable Receipt Body */}
        <div style={{
          padding: '24px', background: '#ffffff', color: '#000000', fontFamily: 'monospace', fontSize: '0.85rem',
          lineHeight: '1.4', maxHeight: '70vh', overflowY: 'auto'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            {pengaturan.logo_url && (
              <img src={pengaturan.logo_url} alt={pengaturan.nama_depo} style={{ maxHeight: '50px', maxWidth: '120px', objectFit: 'contain', marginBottom: '8px' }} />
            )}
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{pengaturan.nama_depo}</h3>
            <p style={{ fontSize: '0.75rem', color: '#555' }}>{pengaturan.alamat}</p>
            <p style={{ fontSize: '0.75rem', color: '#555' }}>WA: {pengaturan.no_wa}</p>
            <p style={{ marginTop: '8px' }}>================================</p>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div>No Nota : {pesanan.no_nota}</div>
            <div>Tgl     : {new Date(pesanan.created_at).toLocaleString('id-ID')}</div>
            <div>Pelanggan: {pesanan.nama_pelanggan}</div>
            <div>Tipe     : {pesanan.tipe_transaksi.toUpperCase().replace('_', ' ')}</div>
            <p>================================</p>
          </div>

          <table style={{ width: '100%', marginBottom: '12px', borderCollapse: 'collapse' }}>
            <tbody>
              {pesanan.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '2px 0' }}>{item.nama_produk} x{item.jumlah}</td>
                  <td style={{ textAlign: 'right', padding: '2px 0' }}>{AppStore.formatRupiah(item.subtotal)}</td>
                </tr>
              ))}
              {pesanan.total_ongkir > 0 && (
                <tr>
                  <td style={{ padding: '2px 0' }}>Ongkir Delivery</td>
                  <td style={{ textAlign: 'right', padding: '2px 0' }}>{AppStore.formatRupiah(pesanan.total_ongkir)}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem' }}>
              <span>TOTAL</span>
              <span>{AppStore.formatRupiah(pesanan.total_akhir)}</span>
            </div>

            {pesanan.bayar_ke_kurir && !pesanan.kurir_diterima_at ? (
              <div style={{ fontSize: '0.8rem', marginTop: '4px', fontWeight: 'bold' }}>
                Bayar tunai ke kurir saat barang tiba
              </div>
            ) : pesanan.pembayaran_details.map((pay, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '2px' }}>
                <span>Bayar ({pay.metode.toUpperCase()})</span>
                <span>{AppStore.formatRupiah(pay.jumlah)}</span>
              </div>
            ))}

            {pesanan.sisa_hutang > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#c53030', marginTop: '4px' }}>
                <span>SISA HUTANG</span>
                <span>{AppStore.formatRupiah(pesanan.sisa_hutang)}</span>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.75rem', whiteSpace: 'pre-line' }}>
            <p>================================</p>
            <p>{pengaturan.footer_struk}</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="no-print" style={{
          padding: '16px 20px', borderTop: '1px solid var(--glass-border)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--inset-90)'
        }}>
          <button onClick={handlePrint} className="btn btn-secondary">
            <Printer size={16} /> Cetak Thermal
          </button>
          <button onClick={handleSendWA} className="btn btn-success">
            <Share2 size={16} /> Kirim Struk WA
          </button>
        </div>
      </div>
    </div>
  );
}
