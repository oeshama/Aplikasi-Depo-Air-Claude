'use client';

import React, { useEffect, useState } from 'react';
import { AppStore } from '@/lib/store';
import { hitungRekap, selisihPersen, PeriodeRekap } from '@/lib/rekapPenjualan';
import { BarChart3, TrendingUp, TrendingDown, Minus, Package, Users, CreditCard } from 'lucide-react';

const PILIHAN: { id: PeriodeRekap; nama: string }[] = [
  { id: 'harian', nama: 'Hari ini' },
  { id: 'mingguan', nama: 'Minggu ini' },
  { id: 'bulanan', nama: 'Bulan ini' },
];
const EVENTS = ['depo_pesanan_updated', 'depo_produk_updated', 'depo_kontak_updated'];

// Rekap penjualan semua depo untuk kasir, admin, dan pengantar. Hanya penjualan, tanpa laba atau biaya.
export default function RekapPenjualanPage() {
  const [periode, setPeriode] = useState<PeriodeRekap>('harian');
  const [, setTick] = useState(0);

  useEffect(() => {
    const f = () => setTick(t => t + 1);
    EVENTS.forEach(e => window.addEventListener(e, f));
    return () => EVENTS.forEach(e => window.removeEventListener(e, f));
  }, []);

  const fmt = (n: number) => AppStore.formatRupiah(n);
  const d = hitungRekap(periode);
  const maksDeret = Math.max(1, ...d.deret.map(x => x.omzet));
  const maksProduk = Math.max(1, ...d.produk.map(x => x.jumlah));
  const maksPelanggan = Math.max(1, ...d.pelanggan.map(x => x.omzet));
  const totalBayar = d.caraBayar.reduce((a, x) => a + x.nominal, 0);

  const kartu = (judul: string, nilai: string, sebelum: number, sekarang: number) => {
    const p = selisihPersen(sekarang, sebelum);
    const naik = p !== null && p > 0;
    const turun = p !== null && p < 0;
    return (
      <div className="glass-card" style={{ padding: '14px' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{judul}</div>
        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{nilai}</div>
        <div style={{ fontSize: '0.75rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', color: naik ? 'var(--c-green)' : turun ? 'var(--c-red)' : 'var(--text-muted)' }}>
          {naik ? <TrendingUp size={14} aria-hidden="true" /> : turun ? <TrendingDown size={14} aria-hidden="true" /> : <Minus size={14} aria-hidden="true" />}
          {p === null ? `${d.labelSebelumnya}: belum ada data` : `${p > 0 ? '+' : ''}${p}% dari ${d.labelSebelumnya.toLowerCase()}`}
        </div>
      </div>
    );
  };

  const judul = (id: string, ikon: React.ReactNode, teks: string) => (
    <h2 id={id} style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>{ikon} {teks}</h2>
  );

  const kosong = d.ini.transaksi === 0;

  return (
    <div style={{ padding: '16px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 className="page-title" style={{ margin: '4px 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BarChart3 size={24} aria-hidden="true" /> Rekap Penjualan
      </h1>
      <p style={{ margin: '0 0 12px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
        Semua penjualan depo. Pesanan yang dibatalkan dan pelunasan hutang tidak dihitung.
      </p>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }} role="radiogroup" aria-label="Periode rekap">
        {PILIHAN.map(p => (
          <button key={p.id} type="button" className="seg-btn" role="radio" aria-checked={periode === p.id} onClick={() => setPeriode(p.id)} style={{ flex: 1 }}>{p.nama}</button>
        ))}
      </div>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '14px' }}>{d.label}</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '22px' }}>
        {kartu('Omzet penjualan', fmt(d.ini.omzet), d.sebelumnya.omzet, d.ini.omzet)}
        {kartu('Jumlah transaksi', String(d.ini.transaksi), d.sebelumnya.transaksi, d.ini.transaksi)}
        {kartu('Unit terjual', String(d.ini.unit), d.sebelumnya.unit, d.ini.unit)}
      </div>

      {kosong ? (
        <p role="status" style={{ background: 'var(--inset-50)', borderRadius: '12px', padding: '14px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Belum ada penjualan pada periode ini.
        </p>
      ) : (
        <>
          <section aria-labelledby="judul-deret" style={{ marginBottom: '22px' }}>
            {judul('judul-deret', <BarChart3 size={18} aria-hidden="true" />, periode === 'harian' ? 'Penjualan per jam' : 'Penjualan per hari')}
            <div className="glass-card" style={{ padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: periode === 'bulanan' ? '2px' : '4px', height: '120px' }} role="img"
                aria-label={`Grafik batang omzet. Tertinggi ${fmt(maksDeret)}.`}>
                {d.deret.map((x, i) => (
                  <div key={i} title={`${x.label}: ${fmt(x.omzet)} (${x.transaksi} transaksi)`} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                    <div style={{ height: `${Math.max(x.omzet > 0 ? 4 : 0, Math.round((x.omzet / maksDeret) * 100))}%`, background: 'var(--c-sky)', borderRadius: '3px 3px 0 0', minHeight: x.omzet > 0 ? '3px' : 0 }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: periode === 'bulanan' ? '2px' : '4px', marginTop: '4px' }} aria-hidden="true">
                {d.deret.map((x, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: periode === 'bulanan' || periode === 'harian' ? '0.55rem' : '0.7rem', color: 'var(--text-muted)', overflow: 'hidden' }}>
                    {periode === 'harian' ? (i % 3 === 0 ? x.label : '') : periode === 'bulanan' ? (i % 5 === 0 || i === d.deret.length - 1 ? x.label : '') : x.label}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section aria-labelledby="judul-produk" style={{ marginBottom: '22px' }}>
            {judul('judul-produk', <Package size={18} aria-hidden="true" />, 'Produk terlaris')}
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {d.produk.map((x, i) => (
                <li key={x.nama} className="glass-card" style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <strong>{i + 1}. {x.nama}</strong>
                    <span><strong>{x.jumlah}</strong> unit - {fmt(x.omzet)}</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--inset-50)', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }} aria-hidden="true">
                    <div style={{ width: `${Math.round((x.jumlah / maksProduk) * 100)}%`, height: '100%', background: 'var(--c-green)' }} />
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="judul-pelanggan" style={{ marginBottom: '22px' }}>
            {judul('judul-pelanggan', <Users size={18} aria-hidden="true" />, 'Pelanggan dengan pembelian terbanyak')}
            {d.pelanggan.length === 0 ? (
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Belum ada pelanggan terdaftar yang membeli pada periode ini.</p>
            ) : (
              <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {d.pelanggan.map((x, i) => (
                  <li key={x.nama + i} className="glass-card" style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                      <strong>{i + 1}. {x.nama}</strong>
                      <strong style={{ color: 'var(--c-green)' }}>{fmt(x.omzet)}</strong>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{x.pesanan} pesanan - {x.unit} unit</div>
                    <div style={{ height: '6px', background: 'var(--inset-50)', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }} aria-hidden="true">
                      <div style={{ width: `${Math.round((x.omzet / maksPelanggan) * 100)}%`, height: '100%', background: 'var(--c-sky)' }} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {d.walkIn.pesanan > 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0 0' }}>
                Pembeli umum (walk-in, tidak masuk peringkat): {d.walkIn.pesanan} pesanan, {fmt(d.walkIn.omzet)}.
              </p>
            )}
          </section>

          <section aria-labelledby="judul-bayar" style={{ marginBottom: '22px' }}>
            {judul('judul-bayar', <CreditCard size={18} aria-hidden="true" />, 'Cara bayar')}
            <div className="glass-card" style={{ padding: '12px' }}>
              {d.caraBayar.length === 0 ? (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Belum ada data pembayaran.</span>
              ) : d.caraBayar.map(x => (
                <div key={x.metode} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.9rem' }}>
                  <span>{x.label}</span>
                  <span><strong>{fmt(x.nominal)}</strong> <span style={{ color: 'var(--text-muted)' }}>({totalBayar > 0 ? Math.round((x.nominal / totalBayar) * 100) : 0}%)</span></span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
