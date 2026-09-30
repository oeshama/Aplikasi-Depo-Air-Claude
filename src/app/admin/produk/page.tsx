'use client';

import React, { useState, useEffect } from 'react';
import { Produk, JenisWadah } from '@/lib/types';
import { AppStore } from '@/lib/store';
import { 
  Package, Plus, Check, Edit3, Trash2, Upload, 
  Droplets, Tag, Image as ImageIcon, X, AlertCircle 
} from 'lucide-react';

export default function AdminProdukPage() {
  const [produkList, setProdukList] = useState<Produk[]>([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields State
  const [namaProduk, setNamaProduk] = useState('');
  const [jenisWadah, setJenisWadah] = useState<JenisWadah>('galon');
  const [volumeLiter, setVolumeLiter] = useState<number>(19);
  const [satuanJual, setSatuanJual] = useState('galon');
  const [hargaTempat, setHargaTempat] = useState<number>(6500);
  const [gambarUrl, setGambarUrl] = useState<string>('');
  
  // Toggles State
  const [kenaOngkir, setKenaOngkir] = useState(true);
  const [dihitungPoin, setDihitungPoin] = useState(true);
  const [adaTukarGalon, setAdaTukarGalon] = useState(true);
  const [adalahGalon, setAdalahGalon] = useState(true);

  const loadProduk = () => {
    setProdukList(AppStore.getProduk());
  };

  useEffect(() => {
    loadProduk();
    window.addEventListener('depo_produk_updated', loadProduk);
    return () => window.removeEventListener('depo_produk_updated', loadProduk);
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setNamaProduk('');
    setJenisWadah('galon');
    setVolumeLiter(19);
    setSatuanJual('galon');
    setHargaTempat(6500);
    setGambarUrl('');
    setKenaOngkir(true);
    setDihitungPoin(true);
    setAdaTukarGalon(true);
    setAdalahGalon(true);
    setShowModal(true);
  };

  const openEditModal = (prod: Produk) => {
    setEditingId(prod.id);
    setNamaProduk(prod.nama_produk);
    setJenisWadah(prod.jenis_wadah);
    setVolumeLiter(prod.volume_liter);
    setSatuanJual(prod.satuan_jual);
    setHargaTempat(prod.harga_tempat);
    setGambarUrl(prod.gambar_url || '');
    setKenaOngkir(prod.kena_ongkir);
    setDihitungPoin(prod.dihitung_poin_loyalitas);
    setAdaTukarGalon(prod.ada_tukar_galon);
    setAdalahGalon(prod.adalah_galon);
    setShowModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('Ukuran gambar maksimal 3MB!');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setGambarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduk = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      // Edit mode
      const updated = produkList.map(p => {
        if (p.id === editingId) {
          return {
            ...p,
            nama_produk: namaProduk,
            jenis_wadah: jenisWadah,
            volume_liter: volumeLiter,
            satuan_jual: satuanJual,
            harga_tempat: hargaTempat,
            gambar_url: gambarUrl,
            kena_ongkir: kenaOngkir,
            dihitung_poin_loyalitas: dihitungPoin,
            ada_tukar_galon: adaTukarGalon,
            adalah_galon: adalahGalon,
          };
        }
        return p;
      });
      setProdukList(updated);
      AppStore.saveProduk(updated);
    } else {
      // Add mode
      const newProduk: Produk = {
        id: `prod-${Date.now()}`,
        nama_produk: namaProduk,
        jenis_wadah: jenisWadah,
        volume_liter: volumeLiter,
        satuan_jual: satuanJual,
        harga_tempat: hargaTempat,
        gambar_url: gambarUrl,
        kena_ongkir: kenaOngkir,
        dihitung_poin_loyalitas: dihitungPoin,
        ada_tukar_galon: adaTukarGalon,
        adalah_galon: adalahGalon,
        aktif: true
      };
      const updated = [...produkList, newProduk];
      setProdukList(updated);
      AppStore.saveProduk(updated);
    }

    setShowModal(false);
  };

  const handleDeleteProduk = (id: string, nama: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus produk "${nama}"?`)) {
      const updated = produkList.filter(p => p.id !== id);
      setProdukList(updated);
      AppStore.saveProduk(updated);
    }
  };

  const handleToggleAktif = (id: string) => {
    const updated = produkList.map(p => p.id === id ? { ...p, aktif: !p.aktif } : p);
    setProdukList(updated);
    AppStore.saveProduk(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Header */}
      <div className="glass-card animate-fade-in" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={24} color="#0284c7" /> Master Produk & Aturan Harga
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
            Daftar jenis wadah, gambar produk, volume liter, harga tempat, status ongkir per unit, dan poin loyalitas.
          </p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary">
          <Plus size={18} /> Tambah Produk Baru
        </button>
      </div>

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', overflowY: 'auto'
        }}>
          <div className="glass-card animate-fade-in" style={{ margin: 'auto',
            width: '100%', maxWidth: '600px', padding: '28px', background: 'var(--surface-solid)',
            maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--glass-border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {editingId ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h3>
              <button aria-label="Tutup" type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduk} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Product Image Upload Section */}
              <div style={{ background: 'var(--inset-60)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Gambar Produk</label>
                <div style={{
                  width: '90px', height: '90px', borderRadius: '16px', margin: '0 auto 10px auto',
                  background: 'rgba(2, 132, 199, 0.15)', border: '2px dashed var(--c-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                }}>
                  {gambarUrl ? (
                    <img src={gambarUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Droplets size={40} color="#38bdf8" />
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
                    <Upload size={14} /> Upload Foto Produk
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                  {gambarUrl && (
                    <button type="button" onClick={() => setGambarUrl('')} className="btn btn-danger btn-sm">
                      Hapus Foto
                    </button>
                  )}
                </div>
              </div>

              {/* Form Input Rows */}
              <div className="form-group">
                <label className="form-label">Nama Produk Wadah</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={namaProduk} 
                  onChange={(e) => setNamaProduk(e.target.value)}
                  placeholder="Contoh: Galon 19L, Botol 1.5L, Jerigen 30L" 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Jenis Wadah</label>
                  <select 
                    value={jenisWadah} 
                    onChange={(e) => setJenisWadah(e.target.value as JenisWadah)}
                    className="form-select"
                  >
                    <option value="galon">Galon</option>
                    <option value="jerigen">Jerigen</option>
                    <option value="botol">Botol</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Volume Air (Liter)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    className="form-input" 
                    value={volumeLiter} 
                    onChange={(e) => setVolumeLiter(Number(e.target.value))}
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Harga Produk Wadah (Rp)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={hargaTempat} 
                  onChange={(e) => setHargaTempat(Number(e.target.value))}
                  placeholder="6500"
                  required 
                />
              </div>



              {/* Toggles */}
              <div style={{ background: 'var(--inset-60)', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  <input type="checkbox" checked={kenaOngkir} onChange={(e) => setKenaOngkir(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                  Kena Tarif Ongkir Unit Saat Delivery?
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  <input type="checkbox" checked={dihitungPoin} onChange={(e) => setDihitungPoin(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                  Dihitung Poin Loyalitas (Beli 10 Gratis 1)?
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  <input type="checkbox" checked={adaTukarGalon} onChange={(e) => setAdaTukarGalon(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                  Bisa Tukar Galon/Wadah Depo?
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-success" style={{ flex: 1 }}>
                  {editingId ? 'Simpan Perubahan' : 'Tambah Produk'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Grid Cards Produk */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '16px' }}>
        {produkList.map(prod => (
          <div key={prod.id} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              {/* Product Card Header with Image */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '14px',
                  background: 'rgba(2, 132, 199, 0.2)', border: '1px solid var(--glass-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0
                }}>
                  {prod.gambar_url ? (
                    <img src={prod.gambar_url} alt={prod.nama_produk} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Droplets size={28} color="#38bdf8" />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>{prod.nama_produk}</h3>
                    <span className="badge badge-primary">{prod.jenis_wadah}</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Volume: {prod.volume_liter} Liter</span>
                </div>
              </div>

              {/* Price Details */}
              <div style={{ background: 'var(--inset-60)', padding: '10px 14px', borderRadius: '10px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Harga Produk:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--c-green)' }}>{AppStore.formatRupiah(prod.harga_tempat)}</span>
              </div>

              {/* Status Tags */}
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: prod.kena_ongkir ? 'var(--c-amber)' : 'var(--text-muted)' }}>
                  <span>Kena Tarif Ongkir Unit?</span>
                  <span style={{ fontWeight: 700 }}>{prod.kena_ongkir ? 'YA (Diisi Delivery)' : 'TIDAK (Ringan)'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: prod.dihitung_poin_loyalitas ? 'var(--c-sky)' : 'var(--text-muted)' }}>
                  <span>Dihitung Poin Loyalitas?</span>
                  <span style={{ fontWeight: 700 }}>{prod.dihitung_poin_loyalitas ? 'YA (Beli 10 Gratis 1)' : 'TIDAK'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: prod.ada_tukar_galon ? 'var(--c-green)' : 'var(--text-muted)' }}>
                  <span>Bisa Tukar Galon Depo?</span>
                  <span style={{ fontWeight: 700 }}>{prod.ada_tukar_galon ? 'YA' : 'TIDAK'}</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions: Edit, Delete, Toggle Active */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Status Produk
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={() => openEditModal(prod)} className="btn btn-secondary btn-sm" title="Edit Produk">
                  <Edit3 size={14} /> Edit
                </button>
                <button onClick={() => handleDeleteProduk(prod.id, prod.nama_produk)} className="btn btn-danger btn-sm" title="Hapus Produk">
                  <Trash2 size={14} />
                </button>
                <button 
                  onClick={() => handleToggleAktif(prod.id)} 
                  className={`btn btn-sm ${prod.aktif ? 'btn-success' : 'btn-secondary'}`}
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  {prod.aktif ? 'Aktif' : 'Off'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
