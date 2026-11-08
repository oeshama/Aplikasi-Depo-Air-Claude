'use client';

import React, { useEffect, useState } from 'react';
import { AppStore } from '@/lib/store';
import { NotifikasiOwner, PermintaanPengeluaran } from '@/lib/types';
import { X, CheckCheck, ChevronRight } from 'lucide-react';

// Panel pemberitahuan (dibuka dari lonceng): daftar pemberitahuan untuk owner/admin, bisa ditandai dibaca,
// dan setiap jenis punya tombol langsung ke halaman yang perlu ditindaklanjuti.
const TUJUAN: Record<string, { href: string; label: string }> = {
  setoran_owner: { href: '/owner/keuangan', label: 'Buka Keuangan Owner' },
  selisih_setoran_owner: { href: '/owner/keuangan', label: 'Buka Keuangan Owner' },
  koreksi_setoran: { href: '/owner/dashboard', label: 'Buka Dashboard' },
  pembatalan_setoran: { href: '/owner/dashboard', label: 'Buka Dashboard' },
};

export default function NotifikasiPanel({ isOpen, onClose, daftar }: { isOpen: boolean; onClose: () => void; daftar: NotifikasiOwner[] }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const [permintaan, setPermintaan] = useState<PermintaanPengeluaran[]>([]);
  const [lihatSemua, setLihatSemua] = useState<boolean>(false);
  useEffect(() => {
    if (!isOpen) return;
    const muat = () => setPermintaan(AppStore.getPermintaanPengeluaran().filter(x => x.status === 'menunggu'));
    muat();
    window.addEventListener('depo_permintaan_pengeluaran_updated', muat);
    return () => window.removeEventListener('depo_permintaan_pengeluaran_updated', muat);
  }, [isOpen]);

  const putuskan = (x: PermintaanPengeluaran, setuju: boolean) => {
    let alasan: string | undefined;
    if (!setuju) {
      const a = window.prompt(`Tolak pengeluaran ${AppStore.formatRupiah(x.nominal)} dari ${x.kasir_nama}? Alasan (boleh kosong):`, '');
      if (a === null) return;
      alasan = a;
    }
    try { AppStore.putuskanPermintaan(x.id, setuju, alasan); } catch (e: any) { alert(e?.message || 'Gagal memproses.'); }
  };

  if (!isOpen) return null;
  const belumDibaca = daftar.filter(n => !n.dibaca).length;
  const sudahDibaca = daftar.length - belumDibaca;
  const tampil = lihatSemua ? daftar : daftar.filter(n => !n.dibaca);
  const waktu = (iso: string) => new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="sheet-overlay" onClick={onClose} style={{ zIndex: 1300 }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="judul-notif" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2 id="judul-notif" className="sheet-title">Pemberitahuan {belumDibaca > 0 ? `(${belumDibaca} baru)` : ''}</h2>
          <button type="button" className="icon-btn" aria-label="Tutup" onClick={onClose}><X size={20} aria-hidden="true" /></button>
        </div>

        {permintaan.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <strong style={{ display: 'block', marginBottom: '6px' }}>Menunggu persetujuan ({permintaan.length})</strong>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {permintaan.map(x => (
                <li key={x.id} style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <strong>{x.kasir_nama}</strong>
                    <strong style={{ color: 'var(--c-red)' }}>{AppStore.formatRupiah(x.nominal)}</strong>
                  </div>
                  <div style={{ fontSize: '0.88rem', marginTop: '2px' }}>{x.peruntukan}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{waktu(x.waktu)} - melewati batas per shift{x.pengeluaran.sumber_kas === 'pegangan' ? ' - dari uang pegangan' : ''}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <button type="button" className="btn btn-success btn-sm" onClick={() => putuskan(x, true)}>Setujui</button>
                    <button type="button" className="btn btn-secondary btn-sm" style={{ color: 'var(--c-red)' }} onClick={() => putuskan(x, false)}>Tolak</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tampil.length === 0 && permintaan.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 16px' }}>{daftar.length === 0 ? 'Belum ada pemberitahuan.' : 'Tidak ada pemberitahuan baru.'}</p>
        ) : tampil.length === 0 ? null : (
          <>
            {belumDibaca > 0 && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => AppStore.tandaiNotifikasiDibaca()} style={{ marginBottom: '10px' }}>
                <CheckCheck size={16} aria-hidden="true" /> Tandai semua dibaca
              </button>
            )}
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tampil.slice(0, 15).map(n => {
                const tujuan = TUJUAN[n.jenis];
                return (
                  <li key={n.id} style={{ padding: '10px 12px', borderRadius: '10px', background: n.dibaca ? 'var(--inset-50)' : 'rgba(245, 158, 11, 0.14)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ color: n.dibaca ? 'var(--text-main)' : 'var(--c-amber)' }}>{n.judul}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{waktu(n.waktu)}</span>
                    </div>
                    <div style={{ fontSize: '0.88rem', marginTop: '2px' }}>{n.pesan}</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {tujuan && (
                        <a className="btn btn-primary btn-sm" href={tujuan.href} onClick={() => AppStore.tandaiNotifikasiDibaca(n.id)}>{tujuan.label} <ChevronRight size={14} aria-hidden="true" /></a>
                      )}
                      {!n.dibaca && (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => AppStore.tandaiNotifikasiDibaca(n.id)}>Tandai dibaca</button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {sudahDibaca > 0 && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLihatSemua(v => !v)} style={{ marginTop: '12px' }}>
            {lihatSemua ? 'Sembunyikan yang sudah dibaca' : `Lihat yang sudah dibaca (${sudahDibaca})`}
          </button>
        )}
      </div>
    </div>
  );
}
