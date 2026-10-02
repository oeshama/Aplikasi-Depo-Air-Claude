'use client';

import React, { useState } from 'react';
import { AppStore } from '@/lib/store';
import { X, HandCoins, Check } from 'lucide-react';

// Owner memberi uang pegangan ke kasir (boleh sebelum kasir buka shift), memantau sisanya, dan menerima sisa yang dikembalikan.
export default function PeganganOwnerSection() {
  const [buka, setBuka] = useState<boolean>(false);
  const [kasirId, setKasirId] = useState<string>('');
  const [nominal, setNominal] = useState<number>(0);
  const [tujuan, setTujuan] = useState<string>('');

  const fmt = (n: number) => AppStore.formatRupiah(n);
  const waktu = (iso: string) => new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const kasirList = AppStore.getUsers().filter(u => u.role === 'kasir' && u.aktif);
  const semua = AppStore.getUangPegangan();
  const kembaliMenunggu = semua.filter(x => x.jenis === 'kembali' && x.status === 'menunggu');
  const beriMenunggu = semua.filter(x => x.jenis === 'beri' && x.status === 'menunggu');
  const riwayat = semua.filter(x => x.status !== 'menunggu').slice(0, 8);
  const pemegang = kasirList.map(k => ({ ...k, saldo: AppStore.getSaldoPegangan(k.id) })).filter(k => k.saldo > 0);

  const jalankan = (fn: () => void, sukses: string): boolean => {
    try { fn(); alert(sukses); return true; } catch (err: any) { alert(err.message || 'Gagal menyimpan.'); return false; }
  };

  const bukaForm = () => { setKasirId(kasirList[0]?.id || ''); setNominal(0); setTujuan(''); setBuka(true); };
  const kirim = () => {
    const k = kasirList.find(u => u.id === kasirId);
    if (!k) { alert('Pilih kasir yang akan menerima uang.'); return; }
    if (jalankan(() => { AppStore.beriUangPegangan({ id: k.id, nama: k.nama }, nominal, tujuan); }, `${fmt(nominal)} dicatat keluar dari kas besar untuk ${k.nama}. Kasir tinggal menerimanya di aplikasi.`)) setBuka(false);
  };

  return (
    <section aria-labelledby="judul-pegangan" style={{ marginBottom: '24px' }}>
      <h2 id="judul-pegangan" style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px' }}>Uang pegangan kasir</h2>
      <div className="glass-card" style={{ padding: '14px' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>
          Uang dari kas besar yang dipegang kasir di luar laci, mis. untuk beli air baku. Boleh diberikan sebelum kasir buka shift. Tidak memengaruhi hitungan laci.
        </p>
        <button type="button" className="btn btn-primary btn-lg" onClick={bukaForm} style={{ width: '100%' }}>
          <HandCoins size={20} aria-hidden="true" /> Beri uang pegangan
        </button>

        {kembaliMenunggu.map(x => (
          <div key={x.id} style={{ marginTop: '12px', padding: '10px', borderRadius: '12px', border: '1px solid var(--c-amber)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <strong>{x.kasir_nama} mengembalikan sisa</strong><strong style={{ color: 'var(--c-amber)' }}>{fmt(x.nominal)}</strong>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{waktu(x.waktu)}</div>
            <button type="button" className="btn btn-success btn-lg" style={{ width: '100%', marginTop: '8px' }}
              onClick={() => jalankan(() => { AppStore.terimaPengembalianPegangan(x.id); }, `Sisa ${fmt(x.nominal)} dari ${x.kasir_nama} masuk kembali ke kas besar.`)}>
              <Check size={20} aria-hidden="true" /> Terima sisa uang
            </button>
          </div>
        ))}

        {beriMenunggu.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div className="form-label">Menunggu diterima kasir</div>
            {beriMenunggu.map(x => (
              <div key={x.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '0.88rem' }}>
                <span>{x.kasir_nama} - {fmt(x.nominal)}{x.tujuan ? ` (${x.tujuan})` : ''}</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { if (confirm('Batalkan pemberian ini? Uangnya kembali ke kas besar.')) jalankan(() => { AppStore.batalkanUangPegangan(x.id); }, 'Pemberian dibatalkan.'); }}>Batalkan</button>
              </div>
            ))}
          </div>
        )}

        {pemegang.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div className="form-label">Sedang dipegang kasir</div>
            {pemegang.map(k => (
              <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.9rem' }}>
                <span>{k.nama}</span><strong>{fmt(k.saldo)}</strong>
              </div>
            ))}
          </div>
        )}

        {riwayat.length > 0 && (
          <details style={{ marginTop: '12px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Riwayat terakhir</summary>
            {riwayat.map(x => (
              <div key={x.id} style={{ fontSize: '0.82rem', padding: '4px 0', color: 'var(--text-muted)' }}>
                {waktu(x.waktu)} - {x.jenis === 'beri' ? `Diberi ke ${x.kasir_nama}` : `Sisa dari ${x.kasir_nama}`} {fmt(x.nominal)}{x.status === 'dibatalkan' ? ' (dibatalkan)' : ''}
              </div>
            ))}
          </details>
        )}
      </div>

      {buka && (
        <div className="sheet-overlay" onClick={() => setBuka(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="judul-beri-pegangan" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <h2 id="judul-beri-pegangan" className="sheet-title">Beri uang pegangan</h2>
              <button type="button" className="icon-btn" aria-label="Tutup" onClick={() => setBuka(false)}><X size={20} aria-hidden="true" /></button>
            </div>
            {kasirList.length === 0 ? (
              <p style={{ color: 'var(--c-amber)' }}>Belum ada akun kasir yang aktif.</p>
            ) : (
              <>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label" htmlFor="pgg-kasir">Kasir penerima</label>
                  <select id="pgg-kasir" className="form-input" value={kasirId} onChange={(e) => setKasirId(e.target.value)}>
                    {kasirList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label" htmlFor="pgg-nominal">Nominal (Rp)</label>
                  <input id="pgg-nominal" type="number" inputMode="numeric" className="form-input" value={nominal || ''} onChange={(e) => setNominal(Number(e.target.value))} placeholder="0" />
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Kas besar saat ini {fmt(AppStore.getSaldoAkun('kas_besar'))}</div>
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" htmlFor="pgg-tujuan">Untuk keperluan (opsional)</label>
                  <input id="pgg-tujuan" type="text" className="form-input" value={tujuan} onChange={(e) => setTujuan(e.target.value)} placeholder="Contoh: beli air baku" />
                </div>
                <button type="button" className="btn btn-primary btn-lg" onClick={kirim} style={{ width: '100%' }}>
                  <HandCoins size={20} aria-hidden="true" /> Beri uang
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
