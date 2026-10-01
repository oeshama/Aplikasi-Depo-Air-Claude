'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AppStore } from '@/lib/store';
import { JenisLaporan, daftarRentang, hitungLaporan, perubahanPersen } from '@/lib/laporan';
import { FileText, Download, Share2 } from 'lucide-react';

const EVENTS = ['depo_pesanan_updated', 'depo_pengeluaran_updated', 'depo_kontak_updated', 'depo_shift_updated', 'depo_pengaturan_updated', 'depo_setoran_owner_updated'];

// Laporan owner: pratinjau angka utama, lalu unduh atau bagikan sebagai PDF.
export default function LaporanPage() {
  const [tick, setTick] = useState(0);
  const [jenis, setJenis] = useState<JenisLaporan>('mingguan');
  const [pilih, setPilih] = useState(0);
  const [sibuk, setSibuk] = useState<'unduh' | 'bagikan' | null>(null);
  const [pesan, setPesan] = useState<string>('');

  useEffect(() => {
    const f = () => setTick(t => t + 1);
    EVENTS.forEach(e => window.addEventListener(e, f));
    return () => EVENTS.forEach(e => window.removeEventListener(e, f));
  }, []);

  const daftar = useMemo(() => daftarRentang(jenis, jenis === 'mingguan' ? 12 : 12), [jenis]);
  const rentang = daftar[Math.min(pilih, daftar.length - 1)];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const data = useMemo(() => hitungLaporan(rentang), [rentang, tick]);
  const bisaBagikan = typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function';

  const buat = async () => {
    const { buatPdfLaporan } = await import('@/lib/laporanPdf');
    return buatPdfLaporan(data);
  };

  const unduh = async () => {
    setSibuk('unduh'); setPesan('');
    try {
      const { blob, namaFile } = await buat();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = namaFile; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setPesan(`Laporan tersimpan: ${namaFile}`);
    } catch (e) { setPesan('Gagal membuat laporan. Coba lagi.'); }
    setSibuk(null);
  };

  const bagikan = async () => {
    setSibuk('bagikan'); setPesan('');
    try {
      const { blob, namaFile } = await buat();
      const file = new File([blob], namaFile, { type: 'application/pdf' });
      const nav = navigator as any;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: `Laporan ${data.rentang.label}` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = namaFile; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        setPesan('Perangkat ini tidak bisa membagikan berkas langsung, jadi laporan diunduh.');
      }
    } catch (e: any) { if (e?.name !== 'AbortError') setPesan('Gagal membagikan laporan. Coba unduh dulu.'); }
    setSibuk(null);
  };

  const rp = AppStore.formatRupiah;
  const banding = (a: number, b: number) => { const p = perubahanPersen(a, b); return p === null ? 'baru' : `${p > 0 ? '+' : ''}${p}%`; };
  const pembanding = jenis === 'mingguan' ? 'minggu lalu' : 'bulan lalu';
  const kartu = [
    { t: 'Omzet', v: rp(data.ini.omzet), s: `${banding(data.ini.omzet, data.sebelumnya.omzet)} vs ${pembanding}` },
    { t: 'Laba bersih', v: rp(data.ini.labaBersih), s: `margin ${data.marginPersen}%` },
    { t: 'Transaksi', v: String(data.ini.transaksi), s: `${banding(data.ini.transaksi, data.sebelumnya.transaksi)} vs ${pembanding}` },
    { t: 'Galon terjual', v: String(data.ini.galon), s: `${data.ini.liter.toLocaleString('id-ID')} liter` },
  ];

  return (
    <div style={{ padding: '16px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 className="page-title" style={{ margin: '4px 0 12px' }}>Laporan PDF</h1>

      <div className="glass-card" style={{ padding: '14px', marginBottom: '12px' }}>
        <div className="seg-grid" role="radiogroup" aria-label="Jenis laporan" style={{ marginBottom: '12px' }}>
          {(['mingguan', 'bulanan'] as JenisLaporan[]).map(j => (
            <button key={j} type="button" role="radio" aria-checked={jenis === j} className="seg-btn" onClick={() => { setJenis(j); setPilih(0); setPesan(''); }}>
              {j === 'mingguan' ? 'Mingguan' : 'Bulanan'}
            </button>
          ))}
        </div>
        <label htmlFor="periode-laporan" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
          Periode {jenis === 'mingguan' ? '(Senin sampai Minggu)' : '(tanggal 1 sampai akhir bulan)'}
        </label>
        <select id="periode-laporan" className="input-field" value={pilih} onChange={e => { setPilih(Number(e.target.value)); setPesan(''); }} style={{ width: '100%' }}>
          {daftar.map((r, i) => <option key={r.kunci} value={i}>{r.label}{r.berjalan ? ' (masih berjalan)' : ''}</option>)}
        </select>
        {rentang.berjalan && (
          <p style={{ fontSize: '0.8rem', marginTop: '8px', color: 'var(--text-muted)' }}>Periode ini belum selesai, jadi angkanya masih bisa bertambah.</p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '12px' }}>
        {kartu.map(k => (
          <div key={k.t} className="glass-card" style={{ padding: '12px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{k.t}</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, margin: '2px 0' }}>{k.v}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{k.s}</div>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ padding: '14px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '6px' }}><FileText size={18} aria-hidden="true" /> Isi laporan</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          Ringkasan dan perbandingan, grafik omzet harian, laba rugi, uang dan selisih kasir, piutang pelanggan, karyawan, pelanggan dan produk terlaris, serta air baku.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: bisaBagikan ? '1fr 1fr' : '1fr', gap: '10px' }}>
        <button type="button" className="btn btn-primary btn-lg" onClick={unduh} disabled={sibuk !== null}>
          <Download size={18} aria-hidden="true" /> {sibuk === 'unduh' ? 'Membuat...' : 'Unduh PDF'}
        </button>
        {bisaBagikan && (
          <button type="button" className="btn btn-secondary btn-lg" onClick={bagikan} disabled={sibuk !== null}>
            <Share2 size={18} aria-hidden="true" /> {sibuk === 'bagikan' ? 'Membuat...' : 'Bagikan'}
          </button>
        )}
      </div>
      {pesan && <p role="status" style={{ fontSize: '0.85rem', marginTop: '10px' }}>{pesan}</p>}
    </div>
  );
}
