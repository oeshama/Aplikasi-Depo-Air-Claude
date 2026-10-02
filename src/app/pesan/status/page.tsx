'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, MessageCircle, Droplets, Clock } from 'lucide-react';

interface Status {
  no: string; nama: string; ringkas: string;
  status: 'baru' | 'dikonfirmasi' | 'ditolak';
  tahap: 'dikonfirmasi' | 'diantar' | 'terkirim' | 'batal' | null;
  estimasi_tiba: string | null; terkirim_at: string | null; alasan_tolak: string | null;
  depo: string; wa: string;
}

const jam = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
const LANGKAH = ['Pesanan diterima', 'Dikonfirmasi', 'Sedang diantar', 'Sudah sampai'];

// Halaman lacak untuk pelanggan: kode rahasia ada di tautan (?s=...). Tidak menampilkan alamat, nomor HP, maupun harga.
export default function StatusPesananPage() {
  const [s, setS] = useState<Status | null>(null);
  const [galat, setGalat] = useState<'' | 'tidak_ada' | 'koneksi'>('');
  const [sekarang, setSekarang] = useState(Date.now());

  const muat = useCallback(async (k: string) => {
    try {
      const r = await fetch('/api/status?s=' + encodeURIComponent(k), { cache: 'no-store' });
      if (r.status === 404) { setGalat('tidak_ada'); return; }
      const d = await r.json();
      if (!d.ok) { setGalat('koneksi'); return; }
      setS(d); setGalat('');
    } catch { setGalat('koneksi'); }
  }, []);

  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get('s') || '';
    if (!k) { setGalat('tidak_ada'); return; }
    muat(k);
    const t = setInterval(() => { muat(k); setSekarang(Date.now()); }, 30000);
    return () => clearInterval(t);
  }, [muat]);

  if (galat === 'tidak_ada') {
    return <Kartu><p style={{ textAlign: 'center' }}>Pesanan tidak ditemukan. Periksa kembali tautan yang kami kirimkan.</p><a className="btn btn-secondary btn-lg" style={{ width: '100%', marginTop: 12 }} href="/pesan">Ke halaman pesan</a></Kartu>;
  }
  if (!s) {
    return <div role="status" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>{galat === 'koneksi' ? 'Belum bisa memuat. Periksa sambungan internet Anda.' : 'Memuat...'}</div>;
  }

  const ditolak = s.status === 'ditolak';
  const batal = s.tahap === 'batal';
  const indeks = s.status === 'baru' ? 0 : s.tahap === 'terkirim' ? 3 : s.tahap === 'diantar' ? 2 : 1;
  const selesai = indeks === 3;
  const terlambat = !selesai && !ditolak && !batal && !!s.estimasi_tiba && sekarang > new Date(s.estimasi_tiba).getTime() + 5 * 60000;
  const teksTanya = `Halo ${s.depo}, saya ${s.nama}. Saya mau menanyakan pesanan ${s.no}.`;

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '16px' }}>
      <header style={{ textAlign: 'center', margin: '8px 0 16px' }}>
        <Droplets size={30} aria-hidden="true" color="var(--c-sky)" />
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{s.depo}</h1>
        <p style={{ color: 'var(--text-muted)' }}>Pesanan <strong>{s.no}</strong> - {s.ringkas}</p>
      </header>

      <div className="glass-card" style={{ padding: '18px' }}>
        {ditolak || batal ? (
          <div role="status">
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--c-red)' }}>{ditolak ? 'Pesanan belum bisa kami proses' : 'Pesanan dibatalkan'}</h2>
            {s.alasan_tolak && <p style={{ margin: '6px 0 0' }}>{s.alasan_tolak}</p>}
            <p style={{ margin: '6px 0 0', color: 'var(--text-muted)' }}>Silakan hubungi kami lewat WhatsApp untuk bantuan.</p>
          </div>
        ) : (
          <>
            <ol aria-label="Langkah pesanan" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {LANGKAH.map((l, i) => {
                const tercapai = i <= indeks;
                return (
                  <li key={l} aria-current={i === indeks ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
                    <span style={{ width: 30, height: 30, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      background: tercapai ? 'var(--c-green)' : 'var(--w-5)', color: tercapai ? '#fff' : 'var(--text-muted)', border: tercapai ? 0 : '1px solid var(--glass-border)' }}>
                      {tercapai ? <Check size={16} aria-hidden="true" /> : i + 1}
                    </span>
                    <span style={{ fontWeight: i === indeks ? 800 : 500, color: tercapai ? 'inherit' : 'var(--text-muted)' }}>
                      {l}{i === indeks ? ' (sekarang)' : ''}
                    </span>
                  </li>
                );
              })}
            </ol>

            <div role="status" style={{ marginTop: '10px', paddingTop: '12px', borderTop: '1px solid var(--glass-border)' }}>
              {selesai ? (
                <p style={{ fontWeight: 700 }}>Pesanan sudah sampai{s.terkirim_at ? ` pukul ${jam(s.terkirim_at)}` : ''}. Terima kasih!</p>
              ) : s.status === 'baru' ? (
                <p>Pesanan Anda sudah kami terima dan sedang diperiksa. Kami akan mengabari lewat WhatsApp.</p>
              ) : s.estimasi_tiba ? (
                <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}><Clock size={18} aria-hidden="true" /> Perkiraan tiba sekitar pukul {jam(s.estimasi_tiba)}</p>
              ) : null}
              {terlambat && (
                <p style={{ marginTop: '8px', color: 'var(--c-amber)', fontWeight: 600 }}>
                  Mohon maaf, pesanan Anda agak terlambat. Kami sedang mengusahakan secepatnya. Anda boleh menanyakan lewat tombol di bawah.
                </p>
              )}
            </div>
          </>
        )}

        {s.wa && (
          <a className="btn btn-secondary btn-lg" style={{ width: '100%', marginTop: '14px' }} href={`https://wa.me/${s.wa}?text=${encodeURIComponent(teksTanya)}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={20} aria-hidden="true" /> Tanya pesanan lewat WhatsApp
          </a>
        )}
      </div>
      <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '10px' }}>Halaman ini diperbarui otomatis.</p>
    </div>
  );
}

function Kartu({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '24px 16px' }}>
      <div className="glass-card" style={{ padding: '22px' }}>{children}</div>
    </div>
  );
}
