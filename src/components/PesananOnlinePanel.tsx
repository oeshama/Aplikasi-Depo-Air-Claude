'use client';

import React, { useEffect, useState } from 'react';
import { AppStore } from '@/lib/store';
import { PesananMasuk } from '@/lib/types';
import { jamLokal } from '@/lib/pesananMasuk';
import { Globe, MapPin, Phone, Clock, MessageCircle, ChevronRight } from 'lucide-react';

const EVENTS = ['depo_pesanan_masuk_updated', 'depo_pesanan_updated'];

// Pesanan online di halaman kerja:
// - mode 'kasir': pesanan baru yang menunggu konfirmasi, lengkap dengan detailnya
// - mode 'pengantar': pesanan online yang sudah dikonfirmasi dan sedang harus diantar, plus hitungan yang masih menunggu kasir
export default function PesananOnlinePanel({ mode }: { mode: 'kasir' | 'pengantar' }) {
  const [, setTick] = useState(0);
  const [semua, setSemua] = useState(false);

  useEffect(() => {
    const f = () => setTick(t => t + 1);
    EVENTS.forEach(e => window.addEventListener(e, f));
    return () => EVENTS.forEach(e => window.removeEventListener(e, f));
  }, []);

  const baru = AppStore.getPesananMasuk().filter(p => p.status === 'baru').slice().reverse();
  const antaran = AppStore.pesananMasukDalamAntaran().slice().reverse();
  const daftar = mode === 'kasir' ? baru : antaran;
  if (daftar.length === 0 && (mode === 'kasir' || baru.length === 0)) return null;

  const tampil = semua ? daftar : daftar.slice(0, 3);
  const fmt = (n: number) => AppStore.formatRupiah(n);
  const pesananDari = (pm: PesananMasuk) => AppStore.getPesanan().find(p => p.id === pm.pesanan_id);

  const detail = (pm: PesananMasuk) => {
    const psn = pesananDari(pm);
    return (
      <div key={pm.id} style={{ borderTop: '1px solid var(--glass-border)', padding: '10px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <strong>{pm.nama} <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>({pm.no})</span></strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {mode === 'pengantar' && pm.estimasi_tiba ? `Estimasi ${jamLokal(pm.estimasi_tiba)}` : `Masuk ${jamLokal(pm.waktu)}`}
          </span>
        </div>
        <ul style={{ margin: '4px 0 4px 18px', fontSize: '0.92rem' }}>{pm.items.map(i => <li key={i.produk_id}>{i.jumlah} {i.nama_produk}</li>)}</ul>
        <div style={{ display: 'grid', gap: '3px', fontSize: '0.86rem' }}>
          <span style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
            <MapPin size={14} aria-hidden="true" style={{ marginTop: 3, flexShrink: 0 }} /> {pm.alamat}
            {pm.lat != null && <a href={`https://www.google.com/maps?q=${pm.lat},${pm.lng}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c-sky)', marginLeft: 4, fontWeight: 600 }}>Peta</a>}
          </span>
          <span style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Phone size={14} aria-hidden="true" />
            <a href={`tel:+${pm.no_hp}`} style={{ color: 'var(--c-sky)', fontWeight: 600 }}>+{pm.no_hp}</a>
            <a href={`https://wa.me/${pm.no_hp}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c-green)', fontWeight: 600, display: 'inline-flex', gap: 3, alignItems: 'center' }}><MessageCircle size={13} aria-hidden="true" /> WhatsApp</a>
          </span>
          <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Clock size={14} aria-hidden="true" /> Antar: {pm.waktu_antar}. Pelanggan memilih bayar {pm.bayar}.</span>
          {pm.catatan && <span>Catatan: {pm.catatan}</span>}
          {mode === 'pengantar' && psn && (
            <strong style={{ color: psn.bayar_ke_kurir ? 'var(--c-amber)' : 'var(--text-main)' }}>
              {psn.bayar_ke_kurir ? 'Tagih ke pelanggan: ' : 'Total: '}{fmt(psn.total_akhir)}
            </strong>
          )}
        </div>
      </div>
    );
  };

  return (
    <section aria-labelledby={`judul-online-${mode}`} className="glass-card" style={{ padding: '12px 14px', border: '1px solid var(--c-amber)', background: 'rgba(245, 158, 11, 0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <h2 id={`judul-online-${mode}`} style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Globe size={18} aria-hidden="true" />
          {mode === 'kasir' ? 'Pesanan online menunggu konfirmasi' : 'Pesanan online untuk diantar'}
          <span aria-label={`${daftar.length} pesanan`} style={{ minWidth: '22px', height: '22px', padding: '0 7px', borderRadius: '11px', background: '#dc2626', color: '#ffffff', fontSize: '0.78rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{daftar.length}</span>
        </h2>
        {mode === 'kasir' && (
          <a href="/kasir/pesanan-masuk" className="btn btn-primary btn-sm">Proses pesanan <ChevronRight size={14} aria-hidden="true" /></a>
        )}
      </div>

      {mode === 'pengantar' && baru.length > 0 && (
        <p role="status" style={{ fontSize: '0.85rem', margin: '6px 0 0', color: 'var(--text-muted)' }}>
          {baru.length} pesanan online lagi sedang menunggu konfirmasi kasir. Setelah dikonfirmasi, muncul di sini.
        </p>
      )}

      {tampil.map(detail)}

      {daftar.length > 3 && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSemua(v => !v)} style={{ marginTop: '6px' }}>
          {semua ? 'Tampilkan lebih sedikit' : `Lihat semua (${daftar.length})`}
        </button>
      )}
    </section>
  );
}
