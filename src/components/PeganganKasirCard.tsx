'use client';

import React, { useEffect, useState } from 'react';
import { AppStore } from '@/lib/store';
import { Check, Undo2, Wallet } from 'lucide-react';

// Kasir menerima uang pegangan dari owner (boleh sebelum buka shift), melihat sisanya, dan mengembalikan sisa ke owner.
// Uang pegangan terpisah dari laci, jadi tidak memengaruhi hitungan laci maupun selisih shift.
export default function PeganganKasirCard() {
  const [, setTick] = useState(0);
  const [kembali, setKembali] = useState<number>(0);
  const [bukaKembali, setBukaKembali] = useState<boolean>(false);

  useEffect(() => {
    const refresh = () => setTick(t => t + 1);
    const events = ['depo_uang_pegangan_updated', 'depo_pengeluaran_updated'];
    events.forEach(e => window.addEventListener(e, refresh));
    return () => events.forEach(e => window.removeEventListener(e, refresh));
  }, []);

  const fmt = (n: number) => AppStore.formatRupiah(n);
  const user = AppStore.getCurrentUser();
  const semua = AppStore.getUangPegangan().filter(x => x.kasir_id === user.id);
  const menunggu = semua.filter(x => x.jenis === 'beri' && x.status === 'menunggu');
  const kembaliMenunggu = semua.filter(x => x.jenis === 'kembali' && x.status === 'menunggu');
  const saldo = AppStore.getSaldoPegangan(user.id);

  if (menunggu.length === 0 && kembaliMenunggu.length === 0 && saldo <= 0) return null;

  const jalankan = (fn: () => void, sukses: string): boolean => {
    try { fn(); alert(sukses); return true; } catch (err: any) { alert(err.message || 'Gagal menyimpan.'); return false; }
  };

  return (
    <section aria-label="Uang pegangan dari owner" className="glass-card" style={{ padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '6px' }}>
        <Wallet size={18} aria-hidden="true" /> Uang pegangan dari owner
      </div>

      {menunggu.map(x => (
        <div key={x.id} style={{ padding: '10px', borderRadius: '12px', border: '1px solid var(--c-amber)', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <strong>Owner memberi {fmt(x.nominal)}</strong>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{x.tujuan ? `Untuk: ${x.tujuan}. ` : ''}Pastikan uangnya sudah Anda terima, lalu tekan Terima.</div>
          <button type="button" className="btn btn-success btn-lg" style={{ width: '100%', marginTop: '8px' }}
            onClick={() => jalankan(() => { AppStore.terimaUangPegangan(x.id); }, `${fmt(x.nominal)} uang pegangan diterima.`)}>
            <Check size={20} aria-hidden="true" /> Terima uang
          </button>
        </div>
      ))}

      {saldo > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem' }}>Sisa uang pegangan: <strong>{fmt(saldo)}</strong></span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setKembali(saldo); setBukaKembali(v => !v); }}>
              <Undo2 size={14} aria-hidden="true" /> Kembalikan sisa
            </button>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>Dipakai lewat Entry Pengeluaran dengan pilihan uang pegangan. Tidak masuk hitungan laci.</div>
          {bukaKembali && (
            <div style={{ marginTop: '8px' }}>
              <label className="form-label" htmlFor="pgg-kembali">Uang yang dikembalikan ke owner (Rp)</label>
              <input id="pgg-kembali" type="number" inputMode="numeric" className="form-input" value={kembali || ''} onChange={(e) => setKembali(Number(e.target.value))} />
              <button type="button" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '8px' }}
                onClick={() => { if (jalankan(() => { AppStore.kembalikanUangPegangan(kembali); }, `${fmt(kembali)} dicatat dikembalikan. Serahkan uangnya ke owner, lalu owner menerimanya di aplikasi.`)) setBukaKembali(false); }}>
                Kembalikan ke owner
              </button>
            </div>
          )}
        </>
      )}

      {kembaliMenunggu.map(x => (
        <div key={x.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '0.85rem' }}>
          <span>Menunggu owner menerima {fmt(x.nominal)}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => jalankan(() => { AppStore.batalkanUangPegangan(x.id); }, 'Pengembalian dibatalkan.')}>Batalkan</button>
        </div>
      ))}
    </section>
  );
}
