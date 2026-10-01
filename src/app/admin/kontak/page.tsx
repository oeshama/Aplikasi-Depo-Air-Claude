'use client';

import React, { useState, useEffect } from 'react';
import { Kontak, TipeKontak, Pesanan, PengaturanDepo, ZoneOngkir, Produk } from '@/lib/types';
import ZonaSelect from '@/components/ZonaSelect';
import LokasiField from '@/components/LokasiField';
import { koordinatValid, urlGoogleMaps } from '@/lib/geo';
import { AppStore } from '@/lib/store';
import { Users, UserPlus, Phone, MapPin, Search, Edit3, Trash2, Shield, X, Check, ChevronDown, ChevronUp, Target } from 'lucide-react';

export default function AdminKontakPage() {
  const [kontakList, setKontakList] = useState<Kontak[]>([]);
  const [pesananList, setPesananList] = useState<Pesanan[]>([]);
  const [pengaturan, setPengaturan] = useState<PengaturanDepo>(AppStore.getPengaturan());
  const [search, setSearch] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nama, setNama] = useState('');
  const [tipe, setTipe] = useState<TipeKontak>('pelanggan');
  const [noHp, setNoHp] = useState('');
  const [alamat, setAlamat] = useState('');
  const [limitHutang, setLimitHutang] = useState<number>(100000);
  const [zonaId, setZonaId] = useState<string>('');
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [alamatMaps, setAlamatMaps] = useState<string>('');
  const [zonaList, setZonaList] = useState<ZoneOngkir[]>([]);
  const [produkList, setProdukList] = useState<Produk[]>([]);
  // Harga per produk yang diisi di form (awalnya harga umum); hanya yang berbeda dari harga umum disimpan sebagai harga khusus
  const [hargaInput, setHargaInput] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
    window.addEventListener('depo_kontak_updated', loadData);
    window.addEventListener('depo_pesanan_updated', loadData);
    window.addEventListener('depo_pengaturan_updated', loadData);
    window.addEventListener('depo_zona_updated', loadData);
    return () => {
      window.removeEventListener('depo_kontak_updated', loadData);
      window.removeEventListener('depo_pesanan_updated', loadData);
      window.removeEventListener('depo_pengaturan_updated', loadData);
      window.removeEventListener('depo_zona_updated', loadData);
    };
  }, []);

  const loadData = () => {
    setKontakList(AppStore.getKontak());
    setPesananList(AppStore.getPesanan());
    setPengaturan(AppStore.getPengaturan());
    setZonaList(AppStore.getZona());
    setProdukList(AppStore.getProduk().filter(p => p.aktif));
  };

  const siapkanHarga = (khusus?: Record<string, number>) => {
    const awal: Record<string, number> = {};
    AppStore.getProduk().filter(p => p.aktif).forEach(p => {
      const k = khusus?.[p.id];
      awal[p.id] = typeof k === 'number' && k > 0 ? k : p.harga_tempat;
    });
    setHargaInput(awal);
  };

  // Hanya harga yang beda dari harga umum yang disimpan; kosong = semua ikut harga umum
  const hitungHargaKhusus = (): Record<string, number> | undefined => {
    const hasil: Record<string, number> = {};
    produkList.forEach(p => {
      const h = hargaInput[p.id];
      if (typeof h === 'number' && h > 0 && h !== p.harga_tempat) hasil[p.id] = h;
    });
    return Object.keys(hasil).length > 0 ? hasil : undefined;
  };

  const openAddModal = () => {
    setEditingId(null);
    setNama('');
    setTipe('pelanggan');
    setNoHp('');
    setAlamat('');
    setLimitHutang(100000);
    setZonaId('');
    setLat(undefined);
    setLng(undefined);
    setAlamatMaps('');
    siapkanHarga();
    setShowModal(true);
  };

  const openEditModal = (kontak: Kontak) => {
    setEditingId(kontak.id);
    setNama(kontak.nama);
    setTipe(kontak.tipe);
    setNoHp(kontak.no_hp);
    setAlamat(kontak.alamat || '');
    setLimitHutang(kontak.limit_hutang || 100000);
    setZonaId(kontak.zona_id || '');
    setLat(kontak.lat);
    setLng(kontak.lng);
    setAlamatMaps(kontak.alamat_maps || '');
    siapkanHarga(kontak.harga_khusus);
    setShowModal(true);
  };

  const handleDelete = (id: string, namaKontak: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data kontak "${namaKontak}"?`)) {
      const updated = kontakList.filter(k => k.id !== id);
      setKontakList(updated);
      AppStore.saveKontak(updated);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!zonaId || !zonaList.some(z => z.id === zonaId && z.aktif)) {
      alert('Pilih zona ongkir pelanggan dulu.');
      return;
    }

    if (editingId) {
      // Edit Mode
      const updated = kontakList.map(k => {
        if (k.id === editingId) {
          return {
            ...k,
            nama,
            tipe,
            no_hp: noHp,
            alamat,
            limit_hutang: limitHutang,
            zona_id: zonaId || undefined,
            lat,
            lng,
            alamat_maps: alamatMaps || undefined,
            harga_khusus: hitungHargaKhusus()
          };
        }
        return k;
      });
      setKontakList(updated);
      AppStore.saveKontak(updated);
    } else {
      // Add Mode
      const newKontak: Kontak = {
        id: `kt-${Date.now()}`,
        nama,
        tipe,
        no_hp: noHp,
        alamat,
        limit_hutang: limitHutang,
        zona_id: zonaId || undefined,
        lat,
        lng,
        alamat_maps: alamatMaps || undefined,
        harga_khusus: hitungHargaKhusus(),
        hutang_saat_ini: 0,
        aktif: true
      };
      const updated = [newKontak, ...kontakList];
      setKontakList(updated);
      AppStore.saveKontak(updated);
    }

    setShowModal(false);
  };

  const filtered = kontakList.filter(k => 
    k.nama.toLowerCase().includes(search.toLowerCase()) || 
    k.no_hp.includes(search) ||
    k.alamat.toLowerCase().includes(search.toLowerCase())
  );

  // Target Penjualan Harian Calculations for Admin Widget
  const todayPesanan = pesananList.filter(p => new Date(p.created_at).toDateString() === new Date().toDateString());
  const totalOmzetHarian = todayPesanan.reduce((acc, p) => acc + p.total_akhir, 0);
  const totalGalonHarian = todayPesanan.reduce((acc, p) => {
    const galonQty = p.items
      .filter(item => item.nama_produk.includes('Galon'))
      .reduce((sum, item) => sum + item.jumlah, 0);
    return acc + galonQty;
  }, 0);

  const targetOmzetHarian = pengaturan.target_omzet_harian ?? 500000;
  const targetGalonHarian = pengaturan.target_galon_harian ?? 50;

  const persenOmzet = Math.min(100, Math.round((totalOmzetHarian / targetOmzetHarian) * 100));
  const persenGalon = Math.min(100, Math.round((totalGalonHarian / targetGalonHarian) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Bar */}
      <div className="glass-card animate-fade-in" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={24} color="#0284c7" /> Manajemen Pelanggan & Reseller
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
            Kelola data kontak, nomor WhatsApp, alamat pengiriman, dan catatan limit hutang.
          </p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary">
          <UserPlus size={18} /> Tambah Kontak Baru
        </button>
      </div>

      {/* Target Penjualan & Capaian (HARIAN) Widget */}
      <div className="glass-card animate-fade-in" style={{ padding: '20px', borderLeft: '4px solid var(--c-green-strong)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={20} color="#10b981" /> Target Penjualan & Capaian (HARIAN)
          </h3>
          <a href="/owner/dashboard" className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem', color: 'var(--c-green)', borderColor: 'rgba(16, 185, 129, 0.4)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            Edit Target & Lihat Dashboard Detail
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          
          {/* Target Omzet */}
          <div style={{ background: 'var(--inset-70)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Target Pendapatan / Omzet</span>
              <span className={`badge ${persenOmzet >= 100 ? 'badge-success' : 'badge-warning'}`}>
                {persenOmzet >= 100 ? 'TERCAPAI' : 'DALAM PROSES'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--c-green)' }}>
                {AppStore.formatRupiah(totalOmzetHarian)}
              </h4>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Target: {AppStore.formatRupiah(targetOmzetHarian)}
              </span>
            </div>

            <div style={{ width: '100%', height: '8px', background: 'var(--w-10)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${persenOmzet}%`, height: '100%',
                background: 'linear-gradient(90deg, var(--c-green-strong) 0%, var(--c-green) 100%)',
                transition: 'width 0.4s ease'
              }} />
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
              Capaian: {persenOmzet}% dari target harian
            </span>
          </div>

          {/* Target Galon */}
          <div style={{ background: 'var(--inset-70)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Target Volume Penjualan Galon</span>
              <span className={`badge ${persenGalon >= 100 ? 'badge-success' : 'badge-primary'}`}>
                {persenGalon >= 100 ? 'TERCAPAI' : 'BERJALAN'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--c-sky)' }}>
                {totalGalonHarian} Galon
              </h4>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Target: {targetGalonHarian} Galon
              </span>
            </div>

            <div style={{ width: '100%', height: '8px', background: 'var(--w-10)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${persenGalon}%`, height: '100%',
                background: 'linear-gradient(90deg, var(--c-primary) 0%, var(--c-sky) 100%)',
                transition: 'width 0.4s ease'
              }} />
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
              Capaian: {persenGalon}% dari target harian ({totalGalonHarian * 19} Liter)
            </span>
          </div>

        </div>
      </div>

      {/* Filter & Search */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Search size={18} color="#94a3b8" />
          <input 
            type="text"
            className="form-input"
            aria-label="Cari pelanggan"
            placeholder="Cari berdasarkan nama, no HP, atau alamat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 0 }}
          />
        </div>
      </div>

      {/* Modal Form Add/Edit */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px', overflowY: 'auto'
        }}>
          <div className="glass-card animate-fade-in" style={{ margin: 'auto',
            width: '100%', maxWidth: '500px', padding: '28px', background: 'var(--surface-solid)',
            border: '1px solid var(--glass-border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {editingId ? 'Edit Data Kontak Pelanggan' : 'Tambah Kontak Pelanggan / Reseller'}
              </h3>
              <button aria-label="Tutup" type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Nama Lengkap / Nama Toko</label>
                <input type="text" className="form-input" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Contoh: Pak Hendra" required />
              </div>

              <div className="form-group">
                <label className="form-label">Kategori Kontak</label>
                <select value={tipe} onChange={(e) => setTipe(e.target.value as TipeKontak)} className="form-select">
                  <option value="pelanggan">Pelanggan Rumah Tangga</option>
                  <option value="reseller">Reseller / Toko Mitra</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nomor WhatsApp / HP</label>
                <input type="text" className="form-input" value={noHp} onChange={(e) => setNoHp(e.target.value)} placeholder="08..." required />
              </div>

              <div className="form-group">
                <label className="form-label">Alamat Lengkap Pengiriman</label>
                <textarea className="form-textarea" rows={3} value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Jl. Merpati No..." required />
              </div>

              <ZonaSelect value={zonaId} onChange={setZonaId} id="zona-kontak" wajib />

              <div className="form-group">
                <div className="form-label" id="label-lokasi-kontak">Lokasi di Peta (opsional)</div>
                <LokasiField
                  idDasar="lokasi-kontak"
                  lat={lat}
                  lng={lng}
                  depoLat={pengaturan.lokasi_depo_lat}
                  depoLng={pengaturan.lokasi_depo_lng}
                  onChange={(la, ln) => { setLat(la); setLng(ln); if (la === undefined) setAlamatMaps(''); }}
                  onTautan={setAlamatMaps}
                />
              </div>

              <details className="form-group" style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0 12px' }} open={!!editingId && !!kontakList.find(k => k.id === editingId)?.harga_khusus}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, minHeight: '48px', display: 'flex', alignItems: 'center' }}>
                  Harga khusus (opsional){(() => { const n = produkList.filter(p => hargaInput[p.id] !== undefined && hargaInput[p.id] !== p.harga_tempat).length; return n > 0 ? ` - ${n} produk` : ''; })()}
                </summary>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>
                  Awalnya semua mengikuti harga umum. Ganti angka produk yang harganya khusus untuk pelanggan ini. Di kasir, harga ini dipakai otomatis saat pelanggan dipilih.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '12px' }}>
                  {produkList.map(p => {
                    const berbeda = hargaInput[p.id] !== undefined && hargaInput[p.id] !== p.harga_tempat;
                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
                        <label htmlFor={`harga-${p.id}`} style={{ flex: 1, minWidth: 0, fontSize: '0.9rem' }}>
                          <span style={{ display: 'block', fontWeight: 600 }}>{p.nama_produk}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Harga umum {AppStore.formatRupiah(p.harga_tempat)}</span>
                        </label>
                        <input
                          id={`harga-${p.id}`}
                          type="number"
                          inputMode="numeric"
                          className="form-input"
                          min="0"
                          value={hargaInput[p.id] ?? ''}
                          onChange={(e) => setHargaInput(prev => ({ ...prev, [p.id]: Number(e.target.value) }))}
                          style={{ width: '120px', flexShrink: 0, borderColor: berbeda ? 'var(--c-primary)' : undefined, fontWeight: berbeda ? 700 : undefined }}
                        />
                      </div>
                    );
                  })}
                  <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => siapkanHarga()}>
                    Kembalikan semua ke harga umum
                  </button>
                </div>
              </details>

              <div className="form-group">
                <label className="form-label">Limit Maksimum Hutang (Rp)</label>
                <input type="number" className="form-input" value={limitHutang} onChange={(e) => setLimitHutang(Number(e.target.value))} placeholder="100000" required />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-success" style={{ flex: 1 }}>
                  {editingId ? 'Simpan Perubahan' : 'Tambah Kontak'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabel Baris List Pelanggan & Reseller */}
      <div className="glass-card animate-fade-in" style={{ padding: '20px' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Lokasi di peta: <strong style={{ color: 'var(--text-main)' }}>{kontakList.filter(k => koordinatValid(k.lat, k.lng)).length} dari {kontakList.length}</strong> pelanggan sudah punya lokasi.
        </p>
        {filtered.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
            Tidak ada data pelanggan yang cocok dengan pencarian.
          </p>
        ) : (
          <>
            <div style={{ 
              overflowX: 'auto', 
              maxHeight: isExpanded ? '400px' : 'auto', 
              overflowY: isExpanded ? 'auto' : 'hidden',
              borderRadius: '8px'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', top: 0, background: 'var(--surface-solid)', zIndex: 1 }}>
                    <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>Tipe</th>
                    <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>Nama Pelanggan / Toko</th>
                    <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>Nomor Kontak / WA</th>
                    <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>Alamat Lengkap</th>
                    <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>Zona Ongkir</th>
                    <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>Lokasi</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>Hutang Aktif</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>Limit Hutang</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(isExpanded ? filtered : filtered.slice(0, 1)).map((kontak, idx) => {
                    const isDebt = (kontak.hutang_saat_ini || 0) > 0;
                    return (
                      <tr 
                        key={kontak.id} 
                        style={{ 
                          borderBottom: '1px solid var(--w-5)',
                          background: idx % 2 === 0 ? 'var(--zebra)' : 'transparent',
                          transition: 'background 0.2s',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {/* Tipe Badge */}
                        <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                          <span className={`badge ${kontak.tipe === 'reseller' ? 'badge-warning' : 'badge-primary'}`} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                            {kontak.tipe.toUpperCase()}
                          </span>
                        </td>

                        {/* Nama */}
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                          {kontak.nama}
                        </td>

                        {/* No HP */}
                        <td style={{ padding: '8px 12px', color: 'var(--c-sky)', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={13} color="#38bdf8" />
                            <span>{kontak.no_hp || '-'}</span>
                          </div>
                        </td>

                        {/* Alamat */}
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={13} color="#34d399" style={{ flexShrink: 0 }} />
                            <span>{kontak.alamat || '-'}</span>
                          </div>
                        </td>

                        {/* Zona Ongkir */}
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {zonaList.find(z => z.id === kontak.zona_id)?.nama_zona || <span className="badge badge-warning" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>Belum ada zona</span>}
                        </td>

                        {/* Lokasi di peta */}
                        <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                          {koordinatValid(kontak.lat, kontak.lng)
                            ? <a href={urlGoogleMaps(kontak.lat as number, kontak.lng as number)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c-sky)', fontWeight: 600 }}>Lihat peta</a>
                            : <span className="badge badge-warning" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>Belum ada</span>}
                        </td>

                        {/* Hutang Aktif */}
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: isDebt ? 'var(--c-red-strong)' : 'var(--c-green)', whiteSpace: 'nowrap' }}>
                          {AppStore.formatRupiah(kontak.hutang_saat_ini || 0)}
                        </td>

                        {/* Limit Hutang */}
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {AppStore.formatRupiah(kontak.limit_hutang || 0)}
                        </td>

                        {/* Action Buttons */}
                        <td style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                            <button 
                              onClick={() => openEditModal(kontak)} 
                              className="btn btn-secondary btn-sm" 
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }} 
                              title="Edit Data Kontak"
                            >
                              <Edit3 size={13} /> Edit
                            </button>
                            <button 
                              onClick={() => handleDelete(kontak.id, kontak.nama)} 
                              className="btn btn-danger btn-sm" 
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }} 
                              title="Hapus Kontak"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Click to Expand / Scroll Toggle Button */}
            {filtered.length > 1 && (
              <button 
                type="button" 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="btn btn-secondary btn-sm" 
                style={{ 
                  width: '100%', 
                  marginTop: '12px', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center', 
                  gap: '8px',
                  padding: '10px', 
                  fontWeight: 700,
                  background: isExpanded ? 'rgba(2, 132, 199, 0.2)' : 'var(--inset-80)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--c-sky)'
                }}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp size={16} /> Ciutkan / Sembunyikan (Tampilkan 1 Baris Utama)
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} /> Klik Untuk Buka &amp; Scroll Seluruh Daftar ({filtered.length} Pelanggan)
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

    </div>
  );
}
