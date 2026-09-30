'use client';

import React, { useEffect, useState } from 'react';
import { AppStore } from '@/lib/store';
import { SetoranOwner } from '@/lib/types';
import LaporanSelisihKasir from '@/components/LaporanSelisihKasir';
import { Wallet, HandCoins, Check, Truck, Store, Landmark, X, Plus, ArrowLeftRight } from 'lucide-react';

const EVENTS = [
  'depo_setoran_owner_updated', 'depo_pesanan_updated', 'depo_pengeluaran_updated', 'depo_setoran_kurir_updated',
  'depo_shift_updated', 'depo_rekening_updated', 'depo_mutasi_keuangan_updated', 'depo_pengaturan_updated'
];

type JenisAksi = 'tambah_modal' | 'prive' | 'setor_bank' | 'tarik_bank' | 'transfer' | 'modal_laci' | 'koreksi';

const AKSI: { id: JenisAksi; judul: string; desk: string }[] = [
  { id: 'modal_laci', judul: 'Modal untuk laci', desk: 'Kas besar ke laci, muncul otomatis saat buka shift' },
  { id: 'tambah_modal', judul: 'Tambah modal', desk: 'Uang pribadi owner masuk ke usaha' },
  { id: 'prive', judul: 'Prive', desk: 'Uang usaha diambil untuk pribadi' },
  { id: 'setor_bank', judul: 'Setor tunai ke bank', desk: 'Kas besar turun, rekening naik' },
  { id: 'tarik_bank', judul: 'Tarik tunai dari bank', desk: 'Rekening turun, kas besar naik' },
  { id: 'transfer', judul: 'Transfer antar rekening', desk: 'Pindah saldo antar rekening' },
  { id: 'koreksi', judul: 'Koreksi saldo', desk: 'Samakan dengan saldo sebenarnya (mutasi bank)' },
];

// Keuangan Owner (khusus owner): setoran kasir, kas besar, rekening bank, buku kas.
export default function KeuanganOwnerPage() {
  const [, setTick] = useState(0);
  const [diterimaInput, setDiterimaInput] = useState<Record<string, number>>({});
  const [ambil, setAmbil] = useState<number>(0);
  const [catatanAmbil, setCatatanAmbil] = useState<string>('');

  // Pengaturan awal pencatatan
  const [awalKasBesar, setAwalKasBesar] = useState<number>(0);
  const [awalRekening, setAwalRekening] = useState<{ nama: string; saldo: number }[]>([{ nama: 'Rekening Utama', saldo: 0 }]);

  // Lembar transaksi
  const [aksi, setAksi] = useState<JenisAksi | null>(null);
  const [akun, setAkun] = useState<string>('kas_besar');
  const [dari, setDari] = useState<string>('');
  const [ke, setKe] = useState<string>('');
  const [nominal, setNominal] = useState<number>(0);
  const [ket, setKet] = useState<string>('');
  const [showMenuAksi, setShowMenuAksi] = useState<boolean>(false);

  const [bukuAkun, setBukuAkun] = useState<string>('kas_besar');
  const [namaRekBaru, setNamaRekBaru] = useState<string>('');
  const [saldoRekBaru, setSaldoRekBaru] = useState<number>(0);

  useEffect(() => {
    const refresh = () => setTick(t => t + 1);
    EVENTS.forEach(e => window.addEventListener(e, refresh));
    return () => EVENTS.forEach(e => window.removeEventListener(e, refresh));
  }, []);

  const fmt = (n: number) => AppStore.formatRupiah(n);
  const waktu = (iso: string) => new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const mulai = AppStore.keuanganSudahMulai();
  const rekening = AppStore.getRekening().filter(r => r.aktif);
  const shift = AppStore.getShiftAktif();
  const laci = AppStore.getKasLaciAktif();
  const saldoLaci = laci ? Math.max(0, laci.ekspektasi) : 0;
  const uangDiKurir = AppStore.getTotalUangDiKurir();
  const semua = AppStore.getSetoranOwner();
  const menunggu = semua.filter(s => s.status === 'menunggu');
  const totalMenunggu = menunggu.reduce((acc, s) => acc + s.nominal, 0);
  const riwayat = semua.filter(s => s.status !== 'menunggu').slice(0, 10);
  const saldoKasBesar = mulai ? AppStore.getSaldoAkun('kas_besar') : 0;
  const totalUangOwner = mulai ? AppStore.getTotalUangOwner() : 0;
  const pengaturan = AppStore.getPengaturan();
  const akunList = [{ id: 'kas_besar', nama: 'Kas besar (tunai)' }, ...rekening.map(r => ({ id: r.id, nama: r.nama }))];
  const buku = mulai ? AppStore.getBukuKas(bukuAkun).slice().reverse().slice(0, 40) : [];
  const saldoBuku = mulai ? AppStore.getSaldoAkun(bukuAkun) : 0;

  const jalankan = (fn: () => void, pesanSukses: string): boolean => {
    try {
      fn();
      alert(pesanSukses);
      return true;
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan.');
      return false;
    }
  };

  const handleTerima = (s: SetoranOwner) => {
    const diterima = diterimaInput[s.id] ?? s.nominal;
    try {
      const hasil = AppStore.terimaSetoranOwner(s.id, diterima);
      const selisih = hasil.selisih || 0;
      alert(selisih === 0
        ? `Setoran ${fmt(hasil.nominal)} dari ${hasil.kasir_nama} diterima, jumlahnya pas.`
        : `Setoran diterima ${fmt(diterima)} dari ${fmt(hasil.nominal)}. Selisih ${fmt(selisih)} dicatat atas nama ${hasil.kasir_nama}.`);
    } catch (err: any) {
      alert(err.message || 'Gagal menerima setoran.');
    }
  };

  const handleAmbil = () => {
    try {
      const hasil = AppStore.ambilDariLaciOlehOwner(ambil, catatanAmbil);
      alert(`${fmt(hasil.nominal)} diambil dari laci dan dicatat.`);
      setAmbil(0);
      setCatatanAmbil('');
    } catch (err: any) {
      alert(err.message || 'Gagal mencatat pengambilan.');
    }
  };

  const handleMulai = () => {
    jalankan(() => AppStore.mulaiKeuangan(awalKasBesar, awalRekening), 'Pencatatan keuangan dimulai. Saldo awal sudah tersimpan.');
  };

  const bukaAksi = (id: JenisAksi) => {
    setAksi(id);
    setShowMenuAksi(false);
    setNominal(0);
    setKet('');
    setAkun('kas_besar');
    const rek = rekening[0]?.id || '';
    setDari(id === 'setor_bank' ? 'kas_besar' : rek);
    setKe(id === 'tarik_bank' ? 'kas_besar' : id === 'transfer' ? (rekening[1]?.id || '') : rek);
  };

  const simpanAksi = () => {
    if (!aksi) return;
    let ok = false;
    if (aksi === 'tambah_modal') ok = jalankan(() => AppStore.tambahModal(akun, nominal, ket), 'Tambah modal tercatat.');
    else if (aksi === 'prive') ok = jalankan(() => AppStore.catatPrive(akun, nominal, ket), 'Prive tercatat.');
    else if (aksi === 'setor_bank') ok = jalankan(() => AppStore.pindahDana('kas_besar', ke, nominal, ket), 'Setor tunai ke bank tercatat.');
    else if (aksi === 'tarik_bank') ok = jalankan(() => AppStore.pindahDana(dari, 'kas_besar', nominal, ket), 'Tarik tunai tercatat.');
    else if (aksi === 'transfer') ok = jalankan(() => AppStore.pindahDana(dari, ke, nominal, ket), 'Transfer antar rekening tercatat.');
    else if (aksi === 'modal_laci') ok = jalankan(() => AppStore.modalUntukLaci(nominal, ket), 'Modal untuk laci tercatat. Angkanya muncul otomatis saat buka shift berikutnya.');
    else if (aksi === 'koreksi') ok = jalankan(() => AppStore.koreksiSaldo(akun, nominal, ket), 'Koreksi saldo tercatat.');
    if (ok) setAksi(null);
  };

  const pilihAkun = (id: string, nilai: string, set: (v: string) => void, daftar = akunList, label = 'Akun') => (
    <div className="form-group" style={{ marginBottom: '10px' }}>
      <label className="form-label" htmlFor={id}>{label}</label>
      <select id={id} className="form-input" value={nilai} onChange={(e) => set(e.target.value)}>
        {daftar.map(a => <option key={a.id} value={a.id}>{a.nama} - {fmt(AppStore.getSaldoAkun(a.id))}</option>)}
      </select>
    </div>
  );

  const kartu = (Icon: typeof Wallet, judul: string, nilai: string, ket: string, warna: string) => (
    <div className="glass-card" style={{ padding: '16px', background: 'var(--inset-60)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        <Icon size={15} aria-hidden="true" /> {judul}
      </div>
      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: warna, marginTop: '4px' }}>{nilai}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ket}</div>
    </div>
  );

  const judulBagian = (id: string, teks: string) => (
    <h2 id={id} style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px' }}>{teks}</h2>
  );

  const aksiInfo = AKSI.find(a => a.id === aksi);
  const perluRekening = aksi && ['setor_bank', 'tarik_bank', 'transfer'].includes(aksi) && rekening.length === 0;

  return (
    <div style={{ padding: '16px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 className="page-title" style={{ margin: '4px 0 12px' }}>Keuangan Owner</h1>

      {!mulai && (
        <section className="glass-card" aria-labelledby="judul-mulai" style={{ padding: '16px', marginBottom: '20px', border: '1px solid var(--c-primary)' }}>
          {judulBagian('judul-mulai', 'Mulai catat kas besar dan rekening')}
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>
            Isi saldo awal sekarang. Pencatatan berjalan mulai saat ini, riwayat sebelumnya tidak dihitung ulang.
          </p>
          <label className="form-label" htmlFor="awal-kas-besar">Uang tunai di kas besar (Rp)</label>
          <input id="awal-kas-besar" type="number" inputMode="numeric" className="form-input" value={awalKasBesar || ''} onChange={(e) => setAwalKasBesar(Number(e.target.value))} placeholder="0" />
          <div className="form-label" style={{ marginTop: '12px' }}>Rekening bank / dompet digital</div>
          {awalRekening.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input aria-label={`Nama rekening ${i + 1}`} className="form-input" value={r.nama} onChange={(e) => setAwalRekening(list => list.map((x, j) => (j === i ? { ...x, nama: e.target.value } : x)))} placeholder="Nama rekening" />
              <input aria-label={`Saldo awal rekening ${i + 1}`} type="number" inputMode="numeric" className="form-input" value={r.saldo || ''} onChange={(e) => setAwalRekening(list => list.map((x, j) => (j === i ? { ...x, saldo: Number(e.target.value) } : x)))} placeholder="Saldo" />
            </div>
          ))}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAwalRekening(list => [...list, { nama: '', saldo: 0 }])}>
            <Plus size={14} aria-hidden="true" /> Tambah rekening
          </button>
          <button type="button" className="btn btn-primary btn-lg" onClick={handleMulai} style={{ width: '100%', marginTop: '14px' }}>
            Mulai pencatatan
          </button>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {mulai && kartu(Wallet, 'Total uang usaha', fmt(totalUangOwner), 'Kas besar + semua rekening', 'var(--c-primary)')}
        {mulai && kartu(Wallet, 'Kas besar (tunai)', fmt(saldoKasBesar), 'Uang tunai milik owner', 'var(--c-green)')}
        {mulai && rekening.map(r => kartu(Landmark, r.nama, fmt(AppStore.getSaldoAkun(r.id)), 'Saldo rekening', 'var(--c-sky)'))}
        {kartu(Store, 'Uang di laci kasir', shift ? fmt(saldoLaci) : 'Tidak ada shift', shift ? `Shift ${shift.kasir_nama || ''} berjalan` : 'Laci dihitung per shift', 'var(--c-green)')}
        {kartu(Truck, 'Uang di kurir', fmt(uangDiKurir), 'Belum disetor ke kasir', uangDiKurir > 0 ? 'var(--c-amber)' : 'var(--c-green)')}
        {kartu(HandCoins, 'Menunggu diterima', fmt(totalMenunggu), `${menunggu.length} penyerahan dari kasir`, totalMenunggu > 0 ? 'var(--c-amber)' : 'var(--text-main)')}
      </div>

      <section aria-labelledby="judul-menunggu" style={{ marginBottom: '24px' }}>
        {judulBagian('judul-menunggu', 'Setoran dari kasir')}
        {menunggu.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tidak ada setoran yang menunggu diterima.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {menunggu.map(s => {
              const nilai = diterimaInput[s.id] ?? s.nominal;
              const selisih = nilai - s.nominal;
              return (
                <div key={s.id} className="glass-card" style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <strong>{s.kasir_nama}</strong>
                    <strong style={{ color: 'var(--c-amber)' }}>{fmt(s.nominal)}</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {waktu(s.waktu)}{s.saat_tutup ? ' - saat tutup shift' : ''}{s.catatan && !s.saat_tutup ? ` - ${s.catatan}` : ''}
                  </div>
                  <label className="form-label" htmlFor={`terima-${s.id}`} style={{ marginTop: '10px', display: 'block' }}>Uang yang benar-benar diterima (Rp)</label>
                  <input
                    id={`terima-${s.id}`}
                    type="number"
                    inputMode="numeric"
                    className="form-input"
                    value={nilai === 0 ? '0' : nilai || ''}
                    onChange={(e) => setDiterimaInput(prev => ({ ...prev, [s.id]: Number(e.target.value) }))}
                  />
                  {selisih !== 0 && (
                    <p role="status" style={{ fontSize: '0.85rem', marginTop: '6px', color: selisih < 0 ? 'var(--c-red)' : 'var(--c-sky)' }}>
                      Selisih {fmt(selisih)} akan dicatat atas nama {s.kasir_nama}.
                    </p>
                  )}
                  <button type="button" className="btn btn-success btn-lg" onClick={() => handleTerima(s)} style={{ width: '100%', marginTop: '10px' }}>
                    <Check size={20} aria-hidden="true" /> Terima setoran
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="judul-ambil" style={{ marginBottom: '24px' }}>
        {judulBagian('judul-ambil', 'Ambil uang dari laci')}
        {!shift ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Belum ada shift yang dibuka, jadi belum ada laci yang bisa diambil.</p>
        ) : (
          <div className="glass-card" style={{ padding: '14px' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 8px' }}>
              Langsung sah tanpa menunggu kasir. Uang laci saat ini sekitar <strong style={{ color: 'var(--text-main)' }}>{fmt(saldoLaci)}</strong>.
            </p>
            <label className="form-label" htmlFor="ambil-nominal">Uang yang diambil (Rp)</label>
            <input id="ambil-nominal" type="number" inputMode="numeric" className="form-input" value={ambil || ''} onChange={(e) => setAmbil(Number(e.target.value))} placeholder="0" />
            <label className="form-label" htmlFor="ambil-catatan" style={{ marginTop: '10px', display: 'block' }}>Catatan (opsional)</label>
            <input id="ambil-catatan" type="text" className="form-input" value={catatanAmbil} onChange={(e) => setCatatanAmbil(e.target.value)} placeholder="Contoh: diambil siang" />
            <button type="button" className="btn btn-primary btn-lg" onClick={handleAmbil} style={{ width: '100%', marginTop: '12px' }}>
              <HandCoins size={20} aria-hidden="true" /> Catat pengambilan
            </button>
          </div>
        )}
      </section>

      {mulai && (
        <>
          <section aria-labelledby="judul-transaksi" style={{ marginBottom: '24px' }}>
            {judulBagian('judul-transaksi', 'Catat transaksi')}
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setShowMenuAksi(true)} aria-haspopup="dialog" style={{ width: '100%' }}>
              <ArrowLeftRight size={20} aria-hidden="true" /> Modal, prive, setor bank, koreksi
            </button>
          </section>

          <section aria-labelledby="judul-rekening" style={{ marginBottom: '24px' }}>
            {judulBagian('judul-rekening', 'Rekening dan penjualan non-tunai')}
            <div className="glass-card" style={{ padding: '14px' }}>
              {rekening.length === 0 ? (
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>Belum ada rekening. Tambahkan dulu supaya penjualan non-tunai tercatat.</p>
              ) : (
                <>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 8px' }}>Uang dari penjualan non-tunai masuk otomatis ke rekening pilihan ini:</p>
                  {(['transfer', 'qris', 'edc'] as const).map(m => (
                    <div key={m} className="form-group" style={{ marginBottom: '8px' }}>
                      <label className="form-label" htmlFor={`rek-${m}`}>{m === 'transfer' ? 'Transfer' : m.toUpperCase()}</label>
                      <select
                        id={`rek-${m}`}
                        className="form-input"
                        value={AppStore.getRekeningUntukMetode(m) || ''}
                        onChange={(e) => AppStore.setRekeningMetode(m, e.target.value)}
                      >
                        {rekening.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                      </select>
                    </div>
                  ))}
                </>
              )}
              <div className="form-label" style={{ marginTop: '10px' }}>Tambah rekening baru</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input aria-label="Nama rekening baru" className="form-input" value={namaRekBaru} onChange={(e) => setNamaRekBaru(e.target.value)} placeholder="Nama rekening" />
                <input aria-label="Saldo awal rekening baru" type="number" inputMode="numeric" className="form-input" value={saldoRekBaru || ''} onChange={(e) => setSaldoRekBaru(Number(e.target.value))} placeholder="Saldo awal" />
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => { if (jalankan(() => { AppStore.tambahRekening(namaRekBaru, saldoRekBaru); }, 'Rekening ditambahkan.')) { setNamaRekBaru(''); setSaldoRekBaru(0); } }}
              >
                <Plus size={14} aria-hidden="true" /> Tambah rekening
              </button>
            </div>
          </section>

          <section aria-labelledby="judul-buku" style={{ marginBottom: '24px' }}>
            {judulBagian('judul-buku', 'Buku kas')}
            <div className="seg-grid" role="radiogroup" aria-label="Pilih akun buku kas" style={{ marginBottom: '10px' }}>
              {akunList.map(a => (
                <button key={a.id} type="button" role="radio" aria-checked={bukuAkun === a.id} className="seg-btn" onClick={() => setBukuAkun(a.id)}>
                  {a.nama}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>Saldo: <strong>{fmt(saldoBuku)}</strong></div>
            {buku.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Belum ada catatan.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {buku.map(b => (
                  <div key={b.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '8px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '0.88rem' }}>{b.keterangan}</span>
                      <strong style={{ color: b.masuk > 0 ? 'var(--c-green)' : 'var(--c-red)', whiteSpace: 'nowrap' }}>
                        {b.masuk > 0 ? '+' : '-'}{fmt(b.masuk > 0 ? b.masuk : b.keluar)}
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{waktu(b.waktu)}</span>
                      <span>Saldo {fmt(b.saldo)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <section aria-labelledby="judul-laporan" style={{ marginBottom: '24px' }}>
        {judulBagian('judul-laporan', 'Laporan selisih kasir')}
        <LaporanSelisihKasir />
      </section>

      <section aria-labelledby="judul-riwayat">
        {judulBagian('judul-riwayat', 'Riwayat setoran kasir')}
        {riwayat.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Belum ada riwayat.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {riwayat.map(s => {
              const batal = s.status === 'dibatalkan';
              return (
                <div key={s.id} style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '10px 12px', opacity: batal ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <strong>{s.jenis === 'ambil_owner' ? 'Diambil owner dari laci' : `Dari ${s.kasir_nama}`}</strong>
                    <strong style={{ textDecoration: batal ? 'line-through' : 'none' }}>{fmt(s.status === 'diterima' ? (s.nominal_diterima ?? s.nominal) : s.nominal)}</strong>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {waktu(s.waktu)}
                    {batal ? ' - dibatalkan kasir' : s.diterima_oleh ? ` - diterima ${s.diterima_oleh}` : ''}
                    {s.catatan ? ` - ${s.catatan}` : ''}
                  </div>
                  {!!s.selisih && (
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: s.selisih < 0 ? 'var(--c-red)' : 'var(--c-sky)', marginTop: '2px' }}>
                      Selisih {fmt(s.selisih)} (diserahkan {fmt(s.nominal)})
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showMenuAksi && (
        <div className="sheet-overlay" onClick={() => setShowMenuAksi(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="judul-menu-aksi" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <h2 id="judul-menu-aksi" className="sheet-title">Catat transaksi</h2>
              <button type="button" className="icon-btn" aria-label="Tutup" onClick={() => setShowMenuAksi(false)}><X size={20} aria-hidden="true" /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {AKSI.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => bukaAksi(a.id)}
                  style={{ textAlign: 'left', minHeight: '56px', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--w-5)', color: 'inherit', cursor: 'pointer' }}
                >
                  <span style={{ display: 'block', fontWeight: 700 }}>{a.judul}</span>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.desk}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {aksi && aksiInfo && (
        <div className="sheet-overlay" onClick={() => setAksi(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="judul-aksi" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <h2 id="judul-aksi" className="sheet-title">{aksiInfo.judul}</h2>
              <button type="button" className="icon-btn" aria-label="Tutup" onClick={() => setAksi(null)}><X size={20} aria-hidden="true" /></button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 12px' }}>{aksiInfo.desk}</p>

            {perluRekening ? (
              <p style={{ color: 'var(--c-amber)' }}>Belum ada rekening. Tambahkan rekening dulu di bagian Rekening.</p>
            ) : (
              <>
                {['tambah_modal', 'prive', 'koreksi'].includes(aksi) && pilihAkun('aksi-akun', akun, setAkun)}
                {aksi === 'setor_bank' && pilihAkun('aksi-ke', ke, setKe, rekening.map(r => ({ id: r.id, nama: r.nama })), 'Setor ke rekening')}
                {aksi === 'tarik_bank' && pilihAkun('aksi-dari', dari, setDari, rekening.map(r => ({ id: r.id, nama: r.nama })), 'Tarik dari rekening')}
                {aksi === 'transfer' && (
                  <>
                    {pilihAkun('aksi-dari', dari, setDari, rekening.map(r => ({ id: r.id, nama: r.nama })), 'Dari rekening')}
                    {pilihAkun('aksi-ke', ke, setKe, rekening.map(r => ({ id: r.id, nama: r.nama })), 'Ke rekening')}
                  </>
                )}
                {aksi === 'modal_laci' && (
                  <p style={{ fontSize: '0.85rem', margin: '0 0 10px' }}>Saldo kas besar: <strong>{fmt(saldoKasBesar)}</strong></p>
                )}

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label" htmlFor="aksi-nominal">{aksi === 'koreksi' ? 'Saldo sebenarnya (Rp)' : 'Nominal (Rp)'}</label>
                  <input id="aksi-nominal" type="number" inputMode="numeric" className="form-input" value={nominal || ''} onChange={(e) => setNominal(Number(e.target.value))} placeholder="0" />
                </div>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" htmlFor="aksi-ket">{aksi === 'koreksi' ? 'Alasan koreksi (wajib)' : 'Keterangan (opsional)'}</label>
                  <input id="aksi-ket" type="text" className="form-input" value={ket} onChange={(e) => setKet(e.target.value)} placeholder={aksi === 'koreksi' ? 'Contoh: cocokkan dengan mutasi bank' : ''} />
                </div>
                <button type="button" className="btn btn-primary btn-lg" onClick={simpanAksi} style={{ width: '100%' }}>
                  Simpan
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
