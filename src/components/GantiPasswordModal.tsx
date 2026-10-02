'use client';

import React, { useEffect, useState } from 'react';
import { gantiPasswordSaya } from '@/lib/auth';
import { X, KeyRound } from 'lucide-react';

// Setiap pengguna mengganti password akunnya sendiri (mode login akun). Butuh internet.
export default function GantiPasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [baru, setBaru] = useState('');
  const [ulang, setUlang] = useState('');
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setBaru(''); setUlang(''); setPesan(null); setSibuk(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (baru !== ulang) { setPesan({ ok: false, teks: 'Kedua isian password belum sama.' }); return; }
    setSibuk(true);
    const hasil = await gantiPasswordSaya(baru);
    setPesan({ ok: hasil.ok, teks: hasil.pesan });
    setSibuk(false);
    if (hasil.ok) { setBaru(''); setUlang(''); }
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="judul-ganti-pw" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2 id="judul-ganti-pw" className="sheet-title">Ganti password</h2>
          <button type="button" className="icon-btn" aria-label="Tutup" onClick={onClose}><X size={20} aria-hidden="true" /></button>
        </div>
        <form onSubmit={simpan}>
          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label className="form-label" htmlFor="pw-baru"><KeyRound size={14} aria-hidden="true" style={{ display: 'inline', marginRight: 4 }} /> Password baru (minimal 8 karakter)</label>
            <input id="pw-baru" type="password" className="form-input" autoComplete="new-password" value={baru} onChange={(e) => setBaru(e.target.value)} required minLength={8} />
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label" htmlFor="pw-ulang">Ulangi password baru</label>
            <input id="pw-ulang" type="password" className="form-input" autoComplete="new-password" value={ulang} onChange={(e) => setUlang(e.target.value)} required minLength={8} />
          </div>
          {pesan && <p role={pesan.ok ? 'status' : 'alert'} style={{ fontWeight: 600, margin: '0 0 10px', color: pesan.ok ? 'var(--c-green)' : 'var(--c-red)' }}>{pesan.teks}</p>}
          <button type="submit" className="btn btn-primary btn-lg" disabled={sibuk} style={{ width: '100%' }}>{sibuk ? 'Menyimpan...' : 'Simpan password baru'}</button>
        </form>
      </div>
    </div>
  );
}
