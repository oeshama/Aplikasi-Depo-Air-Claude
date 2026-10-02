'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AppStore } from '@/lib/store';
import { UserRole } from '@/lib/types';
import { TOPIK, URUTAN_KELOMPOK, URUTAN_BELAJAR, Topik } from '@/lib/panduan';
import { BookOpen, Search, ChevronRight, ExternalLink, Lightbulb, AlertTriangle, Download, Printer } from 'lucide-react';

const NAMA_PERAN: Record<UserRole, string> = { owner: 'Owner', admin: 'Admin', kasir: 'Kasir', pengantar: 'Pengantar' };

// Panduan pemakaian: owner melihat semua topik (dan boleh melihat panduan peran lain untuk melatih karyawan);
// peran lain hanya melihat topik yang memang tersedia untuk perannya.
export default function PanduanPage() {
  const [peranAsli, setPeranAsli] = useState<UserRole | null>(null);
  const [lihatSebagai, setLihatSebagai] = useState<UserRole | null>(null);
  const [cari, setCari] = useState('');
  const [terbuka, setTerbuka] = useState<string>('');
  const [sibuk, setSibuk] = useState<'unduh' | 'cetak' | null>(null);
  const [pesan, setPesan] = useState('');

  useEffect(() => {
    const p = AppStore.getCurrentUser().role;
    setPeranAsli(p);
    setLihatSebagai(p);
    // Buka topik dari tautan, mis. /panduan#buka-shift
    const id = window.location.hash.replace('#', '');
    if (id) setTerbuka(id);
  }, []);

  const peran = lihatSebagai || 'kasir';
  const semuaUntukPeran: Topik[] = useMemo(() => {
    // Owner yang memilih "Owner" melihat semuanya; pilihan peran lain menampilkan topik peran itu saja
    return TOPIK.filter(t => t.peran.includes(peran));
  }, [peran]);

  const q = cari.trim().toLowerCase();
  const tampil = useMemo(() => {
    if (!q) return semuaUntukPeran;
    return semuaUntukPeran.filter(t => [t.judul, t.ringkas, ...t.langkah, ...(t.tips || []), ...(t.hati || [])].join(' ').toLowerCase().includes(q));
  }, [semuaUntukPeran, q]);

  const kelompokTampil = URUTAN_KELOMPOK.filter(k => tampil.some(t => t.kelompok === k));
  const belajar = (URUTAN_BELAJAR[peran] || []).map(id => semuaUntukPeran.find(t => t.id === id)).filter(Boolean) as Topik[];

  // PDF mengikuti peran yang sedang dipilih (owner boleh membuat PDF untuk peran lain, mis. untuk dibagikan ke karyawan)
  const buatPdf = async (mode: 'unduh' | 'cetak') => {
    setSibuk(mode); setPesan('');
    // Jendela cetak dibuka lebih dulu (saat ketukan), supaya tidak diblokir peramban
    const jendela = mode === 'cetak' ? window.open('', '_blank') : null;
    try {
      const { buatPdfPanduan } = await import('@/lib/panduanPdf');
      const { blob, namaFile } = await buatPdfPanduan(peran);
      const url = URL.createObjectURL(blob);
      if (mode === 'cetak' && jendela) {
        jendela.location.href = url;
        setPesan('PDF dibuka di tab baru. Tekan tombol cetak di sana (atau Ctrl+P).');
      } else {
        const a = document.createElement('a'); a.href = url; a.download = namaFile; document.body.appendChild(a); a.click(); a.remove();
        setPesan(mode === 'cetak' ? 'Tab baru diblokir peramban, jadi PDF diunduh. Buka file-nya lalu cetak.' : `Tersimpan: ${namaFile}`);
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      if (jendela) jendela.close();
      setPesan('Gagal membuat PDF. Coba lagi.');
    }
    setSibuk(null);
  };

  const bukaTopik = (id: string) => {
    setTerbuka(id);
    setCari('');
    setTimeout(() => document.getElementById('topik-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  if (!peranAsli) return null;

  return (
    <div style={{ padding: '16px', maxWidth: '820px', margin: '0 auto' }}>
      <h1 className="page-title" style={{ margin: '4px 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BookOpen size={24} aria-hidden="true" /> Panduan Pemakaian
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: '0 0 12px' }}>
        {peranAsli === 'owner'
          ? 'Panduan lengkap untuk owner. Pilih peran di bawah untuk melihat apa yang dipelajari karyawan, berguna saat melatih mereka.'
          : `Panduan untuk peran ${NAMA_PERAN[peranAsli]}. Hanya fitur yang tersedia untuk Anda yang ditampilkan.`}
      </p>

      {peranAsli === 'owner' && (
        <div className="seg-grid" role="radiogroup" aria-label="Panduan untuk peran" style={{ marginBottom: '12px' }}>
          {(['owner', 'kasir', 'pengantar', 'admin'] as UserRole[]).map(p => (
            <button key={p} type="button" role="radio" aria-checked={peran === p} className="seg-btn" onClick={() => { setLihatSebagai(p); setTerbuka(''); }}>
              {p === 'owner' ? 'Owner (lengkap)' : NAMA_PERAN[p]}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <button type="button" className="btn btn-primary" onClick={() => buatPdf('unduh')} disabled={sibuk !== null} style={{ flex: '1 1 160px' }}>
          <Download size={18} aria-hidden="true" /> {sibuk === 'unduh' ? 'Membuat PDF...' : `Unduh PDF (${NAMA_PERAN[peran]})`}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => buatPdf('cetak')} disabled={sibuk !== null} style={{ flex: '1 1 120px' }}>
          <Printer size={18} aria-hidden="true" /> {sibuk === 'cetak' ? 'Membuat PDF...' : 'Cetak'}
        </button>
        {pesan && <p role="status" style={{ flexBasis: '100%', margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{pesan}</p>}
      </div>

      <div style={{ position: 'relative', marginBottom: '14px' }}>
        <label htmlFor="cari-panduan" className="form-label">Cari di panduan</label>
        <Search size={16} aria-hidden="true" style={{ position: 'absolute', left: '12px', bottom: '14px', color: 'var(--text-muted)' }} />
        <input id="cari-panduan" className="form-input" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Contoh: tutup shift, printer, hutang" style={{ paddingLeft: '36px' }} />
      </div>

      {!q && belajar.length > 0 && (
        <section aria-labelledby="judul-mulai" className="glass-card" style={{ padding: '14px', marginBottom: '16px' }}>
          <h2 id="judul-mulai" style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '4px' }}>Mulai dari sini</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 8px' }}>Pelajari berurutan, setiap topik hanya beberapa menit.</p>
          <ol style={{ margin: 0, paddingLeft: '20px', display: 'grid', gap: '4px' }}>
            {belajar.map(t => (
              <li key={t.id}>
                <button type="button" onClick={() => bukaTopik(t.id)} style={{ background: 'none', border: 0, color: 'var(--c-sky)', fontWeight: 600, cursor: 'pointer', font: 'inherit', textAlign: 'left', padding: '4px 0', minHeight: '32px' }}>
                  {t.judul}
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      {tampil.length === 0 && <p role="status" style={{ color: 'var(--text-muted)' }}>Tidak ada topik yang cocok dengan "{cari}".</p>}

      {kelompokTampil.map(k => (
        <section key={k} aria-label={k} style={{ marginBottom: '18px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 8px' }}>{k}</h2>
          <div style={{ display: 'grid', gap: '8px' }}>
            {tampil.filter(t => t.kelompok === k).map(t => {
              const buka = terbuka === t.id || (!!q && true);
              return (
                <details key={t.id} id={'topik-' + t.id} open={buka} className="glass-card"
                  onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) setTerbuka(t.id); else if (terbuka === t.id) setTerbuka(''); }}
                  style={{ padding: 0, overflow: 'hidden' }}>
                  <summary style={{ cursor: 'pointer', padding: '12px 14px', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '8px', minHeight: '48px' }}>
                    <ChevronRight size={18} aria-hidden="true" style={{ flexShrink: 0, transform: buka ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                    <span>
                      <span style={{ display: 'block', fontWeight: 700 }}>{t.judul}</span>
                      <span style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{t.ringkas}</span>
                    </span>
                  </summary>
                  <div style={{ padding: '0 14px 14px 14px' }}>
                    <ol style={{ margin: '0 0 8px', paddingLeft: '22px', display: 'grid', gap: '6px', lineHeight: 1.5 }}>
                      {t.langkah.map((l, i) => <li key={i}>{l}</li>)}
                    </ol>
                    {t.tips && t.tips.map((x, i) => (
                      <p key={'t' + i} style={{ display: 'flex', gap: '8px', margin: '6px 0', fontSize: '0.9rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', padding: '8px 10px' }}>
                        <Lightbulb size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} /> <span><strong>Tips:</strong> {x}</span>
                      </p>
                    ))}
                    {t.hati && t.hati.map((x, i) => (
                      <p key={'h' + i} style={{ display: 'flex', gap: '8px', margin: '6px 0', fontSize: '0.9rem', background: 'rgba(245, 158, 11, 0.14)', borderRadius: '10px', padding: '8px 10px' }}>
                        <AlertTriangle size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} /> <span><strong>Perhatian:</strong> {x}</span>
                      </p>
                    ))}
                    {t.buka ? (
                      <a className="btn btn-secondary btn-sm" href={t.buka!.href} style={{ marginTop: '8px' }}>
                        <ExternalLink size={14} aria-hidden="true" /> {t.buka!.label}
                      </a>
                    ) : null}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ))}

      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>
        Masih bingung? Tanyakan ke owner atau catat langkah yang membuat Anda bingung supaya panduan ini bisa diperbaiki.
      </p>
    </div>
  );
}
