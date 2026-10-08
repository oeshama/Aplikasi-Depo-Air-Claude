'use client';

import React, { useEffect } from 'react';
import { AppStore } from '@/lib/store';
import { NotifikasiOwner } from '@/lib/types';
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

  if (!isOpen) return null;
  const belumDibaca = daftar.filter(n => !n.dibaca).length;
  const waktu = (iso: string) => new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="sheet-overlay" onClick={onClose} style={{ zIndex: 1300 }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="judul-notif" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2 id="judul-notif" className="sheet-title">Pemberitahuan {belumDibaca > 0 ? `(${belumDibaca} baru)` : ''}</h2>
          <button type="button" className="icon-btn" aria-label="Tutup" onClick={onClose}><X size={20} aria-hidden="true" /></button>
        </div>

        {daftar.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 16px' }}>Belum ada pemberitahuan.</p>
        ) : (
          <>
            {belumDibaca > 0 && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => AppStore.tandaiNotifikasiDibaca()} style={{ marginBottom: '10px' }}>
                <CheckCheck size={16} aria-hidden="true" /> Tandai semua dibaca
              </button>
            )}
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {daftar.slice(0, 15).map(n => {
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
      </div>
    </div>
  );
}
