'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Minus, Plus, MapPin, MessageCircle, Check, Droplets } from 'lucide-react';

interface ProdukEtalase { id: string; nama: string; volume_liter: number; harga: number }
type Muat = { status: 'memuat' } | { status: 'galat' } | { status: 'tutup'; nama: string; wa: string } | { status: 'buka'; nama: string; wa: string; produk: ProdukEtalase[] };

const KUNCI = 'depo_pesan_pelanggan';
const rp = (n: number) => 'Rp ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Halaman pesan untuk pelanggan: tanpa login. Tidak memakai data toko selain "etalase" yang boleh dilihat publik.
export default function PesanPage() {
  const [muat, setMuat] = useState<Muat>({ status: 'memuat' });
  const [keranjang, setKeranjang] = useState<Record<string, number>>({});
  const [nama, setNama] = useState('');
  const [hp, setHp] = useState('');
  const [alamat, setAlamat] = useState('');
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [infoLokasi, setInfoLokasi] = useState('');
  const [waktu, setWaktu] = useState<'secepatnya' | 'jam'>('secepatnya');
  const [jam, setJam] = useState('');
  const [bayar, setBayar] = useState<'tunai' | 'transfer'>('tunai');
  const [catatan, setCatatan] = useState('');
  const [website, setWebsite] = useState(''); // jebakan bot, harus tetap kosong
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState('');
  const [hasil, setHasil] = useState<{ no: string; wa: string; ringkas: string } | null>(null);
  const mulai = useRef<number>(Date.now());

  useEffect(() => {
    let batal = false;
    fetch('/api/etalase', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (batal) return;
        if (d && d.aktif) {
          setMuat({ status: 'buka', nama: d.nama, wa: d.wa, produk: d.produk });
          let simpan: any = null;
          try { simpan = JSON.parse(localStorage.getItem(KUNCI) || 'null'); } catch { /* abaikan */ }
          if (simpan) {
            setNama(simpan.nama || ''); setHp(simpan.hp || ''); setAlamat(simpan.alamat || '');
            if (typeof simpan.lat === 'number') { setLat(simpan.lat); setLng(simpan.lng); setInfoLokasi('Lokasi tersimpan dari pesanan sebelumnya'); }
          }
          const ada = (id: string) => (d.produk as ProdukEtalase[]).some(p => p.id === id);
          const terakhir: Record<string, number> = {};
          if (simpan?.keranjang) Object.entries(simpan.keranjang as Record<string, number>).forEach(([id, n]) => { if (ada(id) && n > 0) terakhir[id] = n; });
          if (Object.keys(terakhir).length === 0) {
            const daftar = d.produk as ProdukEtalase[];
            const galon = daftar.find(p => /galon/i.test(p.nama) && p.volume_liter === 19) || daftar.find(p => /galon/i.test(p.nama)) || daftar[0];
            if (galon) terakhir[galon.id] = 1;
          }
          setKeranjang(terakhir);
          mulai.current = Date.now();
        } else {
          setMuat({ status: 'tutup', nama: d?.nama || '', wa: d?.wa || '' });
        }
      })
      .catch(() => { if (!batal) setMuat({ status: 'galat' }); });
    return () => { batal = true; };
  }, []);

  const ubah = (id: string, d: number) => setKeranjang(k => {
    const n = Math.max(0, Math.min(50, (k[id] || 0) + d));
    const baru = { ...k };
    if (n === 0) delete baru[id]; else baru[id] = n;
    return baru;
  });

  const pakaiLokasi = () => {
    if (!navigator.geolocation) { setInfoLokasi('Peramban ini tidak mendukung lokasi. Cukup tulis alamat lengkap.'); return; }
    setInfoLokasi('Mencari lokasi...');
    navigator.geolocation.getCurrentPosition(
      pos => { setLat(Number(pos.coords.latitude.toFixed(6))); setLng(Number(pos.coords.longitude.toFixed(6))); setInfoLokasi('Lokasi tersimpan. Pastikan Anda sedang berada di alamat pengantaran.'); },
      () => setInfoLokasi('Lokasi tidak bisa diambil. Tidak apa-apa, cukup tulis alamat lengkap.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (muat.status === 'memuat') {
    return <div role="status" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Memuat...</div>;
  }
  if (muat.status === 'galat') {
    return <Kartu><p style={{ textAlign: 'center' }}>Halaman belum bisa dimuat. Periksa sambungan internet Anda, lalu muat ulang.</p></Kartu>;
  }
  if (muat.status === 'tutup') {
    return (
      <Kartu>
        <div style={{ textAlign: 'center' }}>
          <Droplets size={36} aria-hidden="true" />
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '8px 0' }}>{muat.nama || 'Depo Air'}</h1>
          <p>Pemesanan online sedang tidak tersedia.</p>
          {muat.wa && <a className="btn btn-primary btn-lg" style={{ marginTop: '14px', width: '100%' }} href={`https://wa.me/${muat.wa}`}><MessageCircle size={20} aria-hidden="true" /> Hubungi kami lewat WhatsApp</a>}
        </div>
      </Kartu>
    );
  }

  const produk = muat.produk;
  const baris = produk.filter(p => keranjang[p.id]);
  const subtotal = baris.reduce((a, p) => a + p.harga * keranjang[p.id], 0);

  const kirimPesanan = async () => {
    setGalat('');
    if (baris.length === 0) { setGalat('Pilih minimal satu produk.'); return; }
    if (nama.trim().length < 2) { setGalat('Isi nama Anda.'); return; }
    if (hp.replace(/\D/g, '').length < 9) { setGalat('Isi nomor WhatsApp Anda.'); return; }
    if (alamat.trim().length < 5) { setGalat('Isi alamat pengantaran.'); return; }
    if (waktu === 'jam' && !jam) { setGalat('Pilih jam antar, atau pilih Secepatnya.'); return; }
    setKirim(true);
    try {
      const r = await fetch('/api/pesan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama, hp, alamat, lat, lng, bayar, catatan, website, lama: Date.now() - mulai.current,
          waktu_antar: waktu === 'jam' ? `jam ${jam}` : 'secepatnya',
          items: baris.map(p => ({ produk_id: p.id, jumlah: keranjang[p.id] }))
        })
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) { setGalat(d?.pesan || 'Pesanan belum berhasil dikirim. Coba lagi.'); setKirim(false); return; }
      try { localStorage.setItem(KUNCI, JSON.stringify({ nama, hp, alamat, lat, lng, keranjang })); } catch { /* abaikan */ }
      setHasil({ no: d.no, wa: d.wa || muat.wa, ringkas: baris.map(p => `${keranjang[p.id]} ${p.nama}`).join(', ') });
    } catch {
      setGalat('Tidak ada sambungan internet. Coba lagi.');
    }
    setKirim(false);
  };

  if (hasil) {
    const teks = `Halo ${muat.nama}, saya ${nama.trim()} sudah memesan lewat tautan.\nKode pesanan: ${hasil.no}\nPesanan: ${hasil.ringkas}\nAlamat: ${alamat.trim()}`;
    return (
      <Kartu>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: 'var(--c-green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}><Check size={30} aria-hidden="true" /></div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Pesanan diterima</h1>
          <p style={{ margin: '6px 0' }}>Kode pesanan Anda</p>
          <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '0.2em' }} aria-label={`Kode pesanan ${hasil.no.split('').join(' ')}`}>{hasil.no}</div>
          <p style={{ margin: '10px 0', fontSize: '0.92rem' }}>{hasil.ringkas}</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Pesanan menunggu konfirmasi dari kami. Kami akan membalas lewat WhatsApp berisi total harga dan perkiraan jam tiba.</p>
          <a className="btn btn-primary btn-lg" style={{ marginTop: '14px', width: '100%' }} href={`https://wa.me/${hasil.wa}?text=${encodeURIComponent(teks)}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={20} aria-hidden="true" /> Kabari lewat WhatsApp
          </a>
          <button type="button" className="btn btn-secondary" style={{ marginTop: '10px', width: '100%' }} onClick={() => { setHasil(null); mulai.current = Date.now(); }}>Buat pesanan lagi</button>
        </div>
      </Kartu>
    );
  }

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '16px 16px 120px' }}>
      <header style={{ textAlign: 'center', margin: '8px 0 16px' }}>
        <Droplets size={30} aria-hidden="true" color="var(--c-sky)" />
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{muat.nama}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>Pesan air antar ke rumah</p>
      </header>

      <section aria-labelledby="judul-produk" className="glass-card" style={{ padding: '14px', marginBottom: '12px' }}>
        <h2 id="judul-produk" style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px' }}>1. Mau pesan apa?</h2>
        {produk.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 0', borderTop: '1px solid var(--glass-border)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{p.nama}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{rp(p.harga)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button type="button" aria-label={`Kurangi ${p.nama}`} onClick={() => ubah(p.id, -1)} disabled={!keranjang[p.id]}
                style={{ width: 44, height: 44, borderRadius: 22, border: '1px solid var(--glass-border)', background: 'var(--w-5)', color: 'inherit', cursor: 'pointer' }}><Minus size={18} aria-hidden="true" /></button>
              <span aria-live="polite" style={{ minWidth: 24, textAlign: 'center', fontWeight: 800, fontSize: '1.1rem' }}>{keranjang[p.id] || 0}</span>
              <button type="button" aria-label={`Tambah ${p.nama}`} onClick={() => ubah(p.id, 1)}
                style={{ width: 44, height: 44, borderRadius: 22, border: 0, background: 'var(--c-sky)', color: '#fff', cursor: 'pointer' }}><Plus size={18} aria-hidden="true" /></button>
            </div>
          </div>
        ))}
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0 0' }}>
          Harga di atas harga umum. Total pasti (termasuk ongkir dan harga langganan) kami kabari saat pesanan dikonfirmasi.
        </p>
      </section>

      <section aria-labelledby="judul-data" className="glass-card" style={{ padding: '14px', marginBottom: '12px' }}>
        <h2 id="judul-data" style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px' }}>2. Diantar ke mana?</h2>
        <div className="form-group" style={{ marginBottom: '10px' }}>
          <label className="form-label" htmlFor="ps-nama">Nama</label>
          <input id="ps-nama" className="form-input" autoComplete="name" value={nama} onChange={e => setNama(e.target.value)} maxLength={60} />
        </div>
        <div className="form-group" style={{ marginBottom: '10px' }}>
          <label className="form-label" htmlFor="ps-hp">Nomor WhatsApp</label>
          <input id="ps-hp" className="form-input" type="tel" inputMode="tel" autoComplete="tel" value={hp} onChange={e => setHp(e.target.value)} placeholder="0812 3456 7890" maxLength={20} />
        </div>
        <div className="form-group" style={{ marginBottom: '10px' }}>
          <label className="form-label" htmlFor="ps-alamat">Alamat lengkap</label>
          <textarea id="ps-alamat" className="form-textarea" rows={3} autoComplete="street-address" value={alamat} onChange={e => setAlamat(e.target.value)} placeholder="Jalan, nomor rumah, patokan" maxLength={300} />
        </div>
        <button type="button" className="btn btn-secondary" onClick={pakaiLokasi} style={{ width: '100%' }}>
          <MapPin size={18} aria-hidden="true" /> {lat != null ? 'Perbarui lokasi saya' : 'Pakai lokasi saya (opsional)'}
        </button>
        {infoLokasi && <p role="status" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '6px 0 0' }}>{infoLokasi}</p>}
        {/* Jebakan bot: manusia tidak melihat kolom ini */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
          <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
        </div>
      </section>

      <section aria-labelledby="judul-opsi" className="glass-card" style={{ padding: '14px', marginBottom: '12px' }}>
        <h2 id="judul-opsi" style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px' }}>3. Kapan dan bayar apa?</h2>
        <div className="seg-grid" role="radiogroup" aria-label="Waktu antar" style={{ marginBottom: '10px' }}>
          <button type="button" role="radio" aria-checked={waktu === 'secepatnya'} className="seg-btn" onClick={() => setWaktu('secepatnya')}>Secepatnya</button>
          <button type="button" role="radio" aria-checked={waktu === 'jam'} className="seg-btn" onClick={() => setWaktu('jam')}>Jam tertentu</button>
        </div>
        {waktu === 'jam' && (
          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label className="form-label" htmlFor="ps-jam">Jam antar</label>
            <input id="ps-jam" className="form-input" type="time" value={jam} onChange={e => setJam(e.target.value)} />
          </div>
        )}
        <div className="seg-grid" role="radiogroup" aria-label="Cara bayar" style={{ marginBottom: '10px' }}>
          <button type="button" role="radio" aria-checked={bayar === 'tunai'} className="seg-btn" onClick={() => setBayar('tunai')}>Tunai saat diantar</button>
          <button type="button" role="radio" aria-checked={bayar === 'transfer'} className="seg-btn" onClick={() => setBayar('transfer')}>Transfer</button>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="ps-catatan">Catatan (opsional)</label>
          <input id="ps-catatan" className="form-input" value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Contoh: pagar hijau, taruh di teras" maxLength={200} />
        </div>
      </section>

      {galat && <p role="alert" style={{ color: 'var(--c-red)', fontWeight: 600, margin: '0 0 10px' }}>{galat}</p>}

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '10px 16px calc(10px + env(safe-area-inset-bottom, 0px))', background: 'var(--surface-solid)', borderTop: '1px solid var(--glass-border)' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px' }}>
            <span>{baris.reduce((a, p) => a + keranjang[p.id], 0)} barang</span>
            <span>Perkiraan produk <strong>{rp(subtotal)}</strong></span>
          </div>
          <button type="button" className="btn btn-primary btn-lg" onClick={kirimPesanan} disabled={kirim} style={{ width: '100%' }}>
            {kirim ? 'Mengirim...' : 'Kirim pesanan'}
          </button>
        </div>
      </div>
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
