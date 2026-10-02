'use client';

import React, { useEffect, useState } from 'react';
import { AppStore } from '@/lib/store';
import { PesananMasuk } from '@/lib/types';
import { namaCetak } from '@/lib/cetak';
import { linkBalas, teksKonfirmasi, teksTolak, teksTerlambat, teksTautanPribadi, jamLokal } from '@/lib/pesananMasuk';
import { normalisasiHp, linkWa } from '@/lib/telepon';
import { Inbox, Check, X, MessageCircle, MapPin, Phone, Clock, Link2, AlertTriangle } from 'lucide-react';

const EVENTS = ['depo_tautan_updated', 'depo_pesanan_masuk_updated', 'depo_kontak_updated', 'depo_zona_updated', 'depo_produk_updated', 'depo_pesanan_updated', 'depo_pengaturan_updated'];
const ALASAN = ['Di luar jangkauan antar', 'Stok sedang habis', 'Data kurang jelas, mohon hubungi kami'];
const PILIHAN_MENIT = [30, 45, 60, 90];
const PILIHAN_TERLAMBAT = [15, 30, 45];

// Pesanan dari halaman publik /pesan: kasir memeriksa, menentukan ongkir dan estimasi, lalu mengonfirmasi atau menolak.
export default function PesananMasukPage() {
  const [, setTick] = useState(0);
  const [pilih, setPilih] = useState<PesananMasuk | null>(null);
  const [tolak, setTolak] = useState<PesananMasuk | null>(null);
  const [zonaId, setZonaId] = useState('');
  const [menit, setMenit] = useState(45);
  const [alasan, setAlasan] = useState('');
  const [selesai, setSelesai] = useState<{ pm: PesananMasuk; teks: string; judul: string } | null>(null);
  const [terlambat, setTerlambat] = useState<PesananMasuk | null>(null);
  const [menitBaru, setMenitBaru] = useState(30);
  const [estBaru, setEstBaru] = useState('');
  const [cari, setCari] = useState('');
  const [disalin, setDisalin] = useState('');

  useEffect(() => {
    const f = () => setTick(t => t + 1);
    EVENTS.forEach(e => window.addEventListener(e, f));
    return () => EVENTS.forEach(e => window.removeEventListener(e, f));
  }, []);

  const fmt = (n: number) => AppStore.formatRupiah(n);
  const semua = AppStore.getPesananMasuk();
  const baru = semua.filter(p => p.status === 'baru').slice().reverse();
  const diproses = semua.filter(p => p.status !== 'baru').slice(0, 15);
  const zonaList = AppStore.getZona().filter(z => z.aktif).sort((a, b) => a.urutan - b.urutan);
  const namaDepo = namaCetak(AppStore.getPengaturan());
  const aktif = !!AppStore.getPengaturan().pesan_online_aktif;
  const berjalan = semua.filter(p => p.status === 'dikonfirmasi' && p.tahap !== 'terkirim' && p.tahap !== 'batal').slice().reverse();
  const asal = typeof window !== 'undefined' ? window.location.origin : '';
  const urlLacak = (pm: PesananMasuk) => (pm.lacak ? `${asal}/pesan/status?s=${pm.lacak}` : undefined);
  const urlPribadi = (kontakId: string) => { const t = AppStore.getKontak().find(k => k.id === kontakId)?.token_pesan; return t ? `${asal}/pesan?p=${t}` : undefined; };
  const kontakCari = cari.trim().length >= 2
    ? AppStore.getKontak().filter(k => k.id !== 'kt-1' && k.aktif && (k.nama.toLowerCase().includes(cari.trim().toLowerCase()) || (k.no_hp || '').replace(/\D/g, '').includes(cari.replace(/\D/g, '') || '@@'))).slice(0, 8)
    : [];

  const bukaKonfirmasi = (pm: PesananMasuk) => {
    const k = AppStore.cariKontakByHp(pm.no_hp);
    setPilih(pm);
    setZonaId(k?.zona_id && zonaList.some(z => z.id === k.zona_id) ? k.zona_id : '');
    setMenit(AppStore.saranEstimasiMenit());
  };

  const konfirmasi = () => {
    if (!pilih) return;
    try {
      const { pm, pesanan, kontak } = AppStore.konfirmasiPesananMasuk(pilih.id, { zonaId, estimasiMenit: menit });
      setPilih(null);
      // Pelanggan yang dikonfirmasi otomatis mendapat tautan pribadi untuk pesanan berikutnya
      let pribadi: string | undefined;
      try { AppStore.buatTokenPesan(kontak.id); pribadi = urlPribadi(kontak.id); } catch { /* abaikan */ }
      setSelesai({ pm, judul: 'Pesanan dikonfirmasi', teks: teksKonfirmasi(pm, namaDepo, pesanan.total_akhir, pesanan.total_ongkir, pm.estimasi_tiba as string, pribadi, urlLacak(pm)) });
    } catch (err: any) {
      alert(err.message || 'Gagal mengonfirmasi pesanan.');
    }
  };

  const proseTolak = () => {
    if (!tolak) return;
    try {
      const pm = AppStore.tolakPesananMasuk(tolak.id, alasan);
      setTolak(null);
      setSelesai({ pm, judul: 'Pesanan ditolak', teks: teksTolak(pm, namaDepo, alasan.trim()) });
    } catch (err: any) {
      alert(err.message || 'Gagal menolak pesanan.');
    }
  };

  const bukaTerlambat = (pm: PesananMasuk) => {
    setTerlambat(pm);
    setMenitBaru(30);
    setEstBaru(new Date(Date.now() + 30 * 60000).toISOString());
  };
  const pilihMenitBaru = (m: number) => { setMenitBaru(m); setEstBaru(new Date(Date.now() + m * 60000).toISOString()); };
  const kirimTerlambat = () => {
    if (!terlambat) return;
    try { AppStore.perbaruiEstimasiPesananMasuk(terlambat.id, menitBaru, estBaru); } catch (err: any) { alert(err.message || 'Gagal memperbarui estimasi.'); }
  };

  const tautanPribadiKirim = (kontakId: string, nama: string, hp: string) => {
    try {
      AppStore.buatTokenPesan(kontakId);
      const url = urlPribadi(kontakId);
      if (!url) return;
      window.open(linkWa(normalisasiHp(hp) || hp, teksTautanPribadi(nama, namaDepo, url)), '_blank', 'noopener');
    } catch (err: any) { alert(err.message || 'Gagal membuat tautan.'); }
  };
  const salinTautan = async (kontakId: string) => {
    try {
      AppStore.buatTokenPesan(kontakId);
      const url = urlPribadi(kontakId) || '';
      await navigator.clipboard.writeText(url);
      setDisalin(kontakId);
      setTimeout(() => setDisalin(''), 2500);
    } catch { alert('Tautan tidak bisa disalin otomatis.'); }
  };

  const kartuInfo = (pm: PesananMasuk) => {
    const k = AppStore.cariKontakByHp(pm.no_hp);
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <strong>{pm.nama} <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>({pm.no})</span></strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{jamLokal(pm.waktu)}</span>
        </div>
        <div style={{ fontSize: '0.85rem', margin: '2px 0', color: k ? 'var(--c-green)' : 'var(--c-amber)' }}>{k ? `Pelanggan terdaftar: ${k.nama}` : 'Nomor baru, akan dibuat sebagai pelanggan'}</div>
        <ul style={{ margin: '6px 0 6px 18px' }}>{pm.items.map(i => <li key={i.produk_id}>{i.jumlah} {i.nama_produk}</li>)}</ul>
        <div style={{ fontSize: '0.88rem', display: 'grid', gap: '2px' }}>
          <span style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}><MapPin size={14} aria-hidden="true" style={{ marginTop: 3, flexShrink: 0 }} /> {pm.alamat}
            {pm.lat != null && <a href={`https://www.google.com/maps?q=${pm.lat},${pm.lng}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c-sky)', marginLeft: 4 }}>Peta</a>}</span>
          <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Phone size={14} aria-hidden="true" /> {pm.no_hp}</span>
          <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Clock size={14} aria-hidden="true" /> Antar: {pm.waktu_antar}. Bayar: {pm.bayar === 'tunai' ? 'tunai' : 'transfer'}</span>
          {pm.catatan && <span>Catatan: {pm.catatan}</span>}
        </div>
      </>
    );
  };

  const kontakPilih = pilih ? AppStore.cariKontakByHp(pilih.no_hp) : undefined;
  const rincian = pilih ? AppStore.hitungPesananMasuk(pilih, kontakPilih, zonaId) : null;

  return (
    <div style={{ padding: '16px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 className="page-title" style={{ margin: '4px 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Inbox size={24} aria-hidden="true" /> Pesanan Online</h1>
      {!aktif && <p role="status" style={{ background: 'rgba(245, 158, 11, 0.14)', borderRadius: '12px', padding: '10px 14px', fontSize: '0.9rem' }}>Pesanan online sedang dimatikan, jadi pelanggan tidak bisa memesan. Owner dapat menghidupkannya di Pengaturan Toko.</p>}

      <section aria-labelledby="judul-baru" style={{ marginBottom: '24px' }}>
        <h2 id="judul-baru" style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px' }}>Menunggu konfirmasi ({baru.length})</h2>
        {baru.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Belum ada pesanan baru.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {baru.map(pm => (
              <div key={pm.id} className="glass-card" style={{ padding: '14px', border: '1px solid var(--c-amber)' }}>
                {kartuInfo(pm)}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-success btn-lg" style={{ flex: '2 1 160px' }} onClick={() => bukaKonfirmasi(pm)}><Check size={20} aria-hidden="true" /> Konfirmasi</button>
                  <button type="button" className="btn btn-secondary btn-lg" style={{ flex: '1 1 100px' }} onClick={() => { setTolak(pm); setAlasan(''); }}><X size={20} aria-hidden="true" /> Tolak</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {berjalan.length > 0 && (
        <section aria-labelledby="judul-berjalan" style={{ marginBottom: '24px' }}>
          <h2 id="judul-berjalan" style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px' }}>Sedang diantar ({berjalan.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {berjalan.map(pm => {
              const lewat = !!pm.estimasi_tiba && new Date(pm.estimasi_tiba).getTime() < Date.now();
              const menitLewat = pm.estimasi_tiba ? Math.round((Date.now() - new Date(pm.estimasi_tiba).getTime()) / 60000) : 0;
              return (
                <div key={pm.id} className="glass-card" style={{ padding: '12px 14px', border: lewat ? '1px solid var(--c-amber)' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <strong>{pm.nama} ({pm.no})</strong>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: lewat ? 'var(--c-amber)' : 'var(--c-green)' }}>
                      {pm.tahap === 'diantar' ? 'Kurir menuju' : 'Disiapkan'}{pm.estimasi_tiba ? ` - estimasi ${jamLokal(pm.estimasi_tiba)}` : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{pm.items.map(i => `${i.jumlah} ${i.nama_produk}`).join(', ')}</div>
                  {lewat && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--c-amber)', fontWeight: 700, fontSize: '0.88rem' }}><AlertTriangle size={16} aria-hidden="true" /> Lewat estimasi {menitLewat} menit</span>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => bukaTerlambat(pm)}><MessageCircle size={16} aria-hidden="true" /> Kabari terlambat</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {diproses.length > 0 && (
        <section aria-labelledby="judul-proses" style={{ marginBottom: '24px' }}>
          <h2 id="judul-proses" style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px' }}>Sudah diproses</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {diproses.map(pm => (
              <div key={pm.id} className="glass-card" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <strong>{pm.nama} ({pm.no})</strong>
                  <span style={{ color: pm.status === 'dikonfirmasi' ? 'var(--c-green)' : 'var(--c-red)', fontWeight: 700 }}>{pm.status === 'dikonfirmasi' ? 'Dikonfirmasi' : 'Ditolak'}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {pm.items.map(i => `${i.jumlah} ${i.nama_produk}`).join(', ')}{pm.estimasi_tiba ? ` - estimasi ${jamLokal(pm.estimasi_tiba)}` : ''}{pm.alasan_tolak ? ` - ${pm.alasan_tolak}` : ''}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {aktif && (
        <section aria-labelledby="judul-tautan-pribadi" style={{ marginBottom: '24px' }}>
          <h2 id="judul-tautan-pribadi" style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Link2 size={18} aria-hidden="true" /> Tautan pesan pribadi pelanggan</h2>
          <div className="glass-card" style={{ padding: '14px' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 8px' }}>
              Kirim tautan khusus ke pelanggan langganan. Mereka cukup satu ketukan untuk pesan seperti biasa. Pelanggan yang baru dikonfirmasi otomatis mendapat tautannya di balasan WhatsApp.
            </p>
            <label className="form-label" htmlFor="cari-pelanggan">Cari pelanggan (nama atau nomor)</label>
            <input id="cari-pelanggan" className="form-input" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Ketik minimal 2 huruf" />
            {kontakCari.map(k => (
              <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '8px 0', borderTop: '1px solid var(--glass-border)', marginTop: '8px' }}>
                <span><strong>{k.nama}</strong> <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{k.no_hp}</span></span>
                <span style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" className="btn btn-primary btn-sm" disabled={!normalisasiHp(k.no_hp || '')} onClick={() => tautanPribadiKirim(k.id, k.nama, k.no_hp)}><MessageCircle size={14} aria-hidden="true" /> Kirim WA</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => salinTautan(k.id)}>{disalin === k.id ? 'Tersalin' : 'Salin'}</button>
                  {k.token_pesan && <button type="button" className="btn btn-secondary btn-sm" onClick={() => { if (confirm('Matikan tautan pribadi ' + k.nama + '? Tautan lama tidak akan bisa dipakai lagi.')) AppStore.matikanTautan(k.id); }}>Matikan</button>}
                </span>
              </div>
            ))}
            {cari.trim().length >= 2 && kontakCari.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '8px 0 0' }}>Pelanggan tidak ditemukan.</p>}
          </div>
        </section>
      )}

      {terlambat && (
        <div className="sheet-overlay" onClick={() => setTerlambat(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="judul-terlambat" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <h2 id="judul-terlambat" className="sheet-title">Kabari terlambat {terlambat.no}</h2>
              <button type="button" className="icon-btn" aria-label="Tutup" onClick={() => setTerlambat(null)}><X size={20} aria-hidden="true" /></button>
            </div>
            <div className="form-label">Perkiraan tiba yang baru</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {PILIHAN_TERLAMBAT.map(m => <button key={m} type="button" className="seg-btn" role="radio" aria-checked={menitBaru === m} onClick={() => pilihMenitBaru(m)} style={{ flex: '0 0 auto' }}>{m} menit lagi</button>)}
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', background: 'var(--inset-50)', borderRadius: '12px', padding: '10px 12px', fontSize: '0.88rem', margin: '0 0 12px' }}>{teksTerlambat(terlambat, namaDepo, estBaru, urlLacak(terlambat))}</pre>
            <a className="btn btn-primary btn-lg" style={{ width: '100%' }} href={linkBalas(terlambat, teksTerlambat(terlambat, namaDepo, estBaru, urlLacak(terlambat)))} target="_blank" rel="noopener noreferrer"
              onClick={() => { kirimTerlambat(); setTimeout(() => setTerlambat(null), 300); }}>
              <MessageCircle size={20} aria-hidden="true" /> Kirim lewat WhatsApp
            </a>
          </div>
        </div>
      )}

      {pilih && rincian && (
        <div className="sheet-overlay" onClick={() => setPilih(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="judul-konfirmasi" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <h2 id="judul-konfirmasi" className="sheet-title">Konfirmasi pesanan {pilih.no}</h2>
              <button type="button" className="icon-btn" aria-label="Tutup" onClick={() => setPilih(null)}><X size={20} aria-hidden="true" /></button>
            </div>
            <p style={{ margin: '0 0 8px', fontWeight: 600 }}>{pilih.nama} - {pilih.alamat}</p>
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="form-label" htmlFor="kf-zona">Zona ongkir</label>
              <select id="kf-zona" className="form-input" value={zonaId} onChange={(e) => setZonaId(e.target.value)}>
                <option value="">Pilih zona</option>
                {zonaList.map(z => <option key={z.id} value={z.id}>{z.nama_zona} - {fmt(z.tarif_per_galon)}/galon</option>)}
              </select>
            </div>
            <div className="form-label">Estimasi tiba (menit)</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
              {Array.from(new Set([AppStore.saranEstimasiMenit(), ...PILIHAN_MENIT])).sort((a, b) => a - b).map(m => (
                <button key={m} type="button" className="seg-btn" role="radio" aria-checked={menit === m} onClick={() => setMenit(m)} style={{ flex: '0 0 auto' }}>{m} mnt{m === AppStore.saranEstimasiMenit() ? ' (saran)' : ''}</button>
              ))}
            </div>
            <input aria-label="Estimasi tiba dalam menit" type="number" inputMode="numeric" className="form-input" value={menit || ''} onChange={(e) => setMenit(Number(e.target.value))} style={{ marginBottom: '10px' }} />
            <div style={{ background: 'var(--inset-50)', borderRadius: '12px', padding: '10px 12px', fontSize: '0.9rem', marginBottom: '12px' }}>
              {rincian.items.map(i => <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{i.jumlah} x {i.nama_produk}{i.harga_khusus ? ' (harga langganan)' : ''}</span><span>{fmt(i.subtotal)}</span></div>)}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Ongkir</span><span>{zonaId ? fmt(rincian.ongkir) : 'pilih zona'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginTop: 4 }}><span>Total</span><span>{fmt(rincian.total)}</span></div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>Pesanan masuk ke daftar antar. Cara bayar (tunai, transfer, atau belum bayar) dicatat kurir saat barang sampai.</p>
            <button type="button" className="btn btn-success btn-lg" style={{ width: '100%' }} onClick={konfirmasi}><Check size={20} aria-hidden="true" /> Konfirmasi dan siapkan antar</button>
          </div>
        </div>
      )}

      {tolak && (
        <div className="sheet-overlay" onClick={() => setTolak(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="judul-tolak" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <h2 id="judul-tolak" className="sheet-title">Tolak pesanan {tolak.no}</h2>
              <button type="button" className="icon-btn" aria-label="Tutup" onClick={() => setTolak(null)}><X size={20} aria-hidden="true" /></button>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {ALASAN.map(a => <button key={a} type="button" className="btn btn-secondary btn-sm" onClick={() => setAlasan(a)}>{a}</button>)}
            </div>
            <label className="form-label" htmlFor="tk-alasan">Alasan (akan ditulis di balasan WhatsApp)</label>
            <input id="tk-alasan" className="form-input" value={alasan} onChange={(e) => setAlasan(e.target.value)} style={{ marginBottom: '12px' }} />
            <button type="button" className="btn btn-danger btn-lg" style={{ width: '100%' }} onClick={proseTolak}>Tolak pesanan</button>
          </div>
        </div>
      )}

      {selesai && (
        <div className="sheet-overlay" onClick={() => setSelesai(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="judul-selesai" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <h2 id="judul-selesai" className="sheet-title">{selesai.judul}</h2>
              <button type="button" className="icon-btn" aria-label="Tutup" onClick={() => setSelesai(null)}><X size={20} aria-hidden="true" /></button>
            </div>
            <p style={{ fontSize: '0.88rem', margin: '0 0 6px' }}>Kabari pelanggan lewat WhatsApp. Teksnya sudah siap dan bisa diubah dulu di WhatsApp.</p>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', background: 'var(--inset-50)', borderRadius: '12px', padding: '10px 12px', fontSize: '0.88rem', margin: '0 0 12px' }}>{selesai.teks}</pre>
            <a className="btn btn-primary btn-lg" style={{ width: '100%' }} href={linkBalas(selesai.pm, selesai.teks)} target="_blank" rel="noopener noreferrer"><MessageCircle size={20} aria-hidden="true" /> Balas lewat WhatsApp</a>
            <button type="button" className="btn btn-secondary" style={{ width: '100%', marginTop: '8px' }} onClick={() => setSelesai(null)}>Selesai</button>
          </div>
        </div>
      )}
    </div>
  );
}
