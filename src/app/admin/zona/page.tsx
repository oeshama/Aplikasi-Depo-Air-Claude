'use client';

import React, { useState, useEffect } from 'react';
import { ZoneOngkir } from '@/lib/types';
import { AppStore } from '@/lib/store';
import { jarakZonaKm } from '@/lib/geo';
import { MapPin, Plus, Edit3, Trash2, Check, X, Layers } from 'lucide-react';

export default function AdminZonaPage() {
  const [zonaList, setZonaList] = useState<ZoneOngkir[]>([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields State
  const [namaZona, setNamaZona] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [tarifPerGalon, setTarifPerGalon] = useState<number>(3000);
  const [urutan, setUrutan] = useState<number>(1);
  const [jarakMaks, setJarakMaks] = useState<number | ''>('');
  const [tanpaBatas, setTanpaBatas] = useState<boolean>(false);

  const loadZona = () => {
    const list = AppStore.getZona();
    // sort by urutan asc
    list.sort((a, b) => a.urutan - b.urutan);
    setZonaList(list);
  };

  useEffect(() => {
    loadZona();
    window.addEventListener('depo_zona_updated', loadZona);
    return () => window.removeEventListener('depo_zona_updated', loadZona);
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setNamaZona(`Zona ${zonaList.length + 1}`);
    setKeterangan('Area pengiriman...');
    setTarifPerGalon(3000);
    setUrutan(zonaList.length + 1);
    setJarakMaks('');
    setTanpaBatas(false);
    setShowModal(true);
  };

  const openEditModal = (zona: ZoneOngkir) => {
    setEditingId(zona.id);
    setNamaZona(zona.nama_zona);
    setKeterangan(zona.keterangan || '');
    setTarifPerGalon(zona.tarif_per_galon);
    setUrutan(zona.urutan);
    const batas = jarakZonaKm(zona);
    setJarakMaks(batas === null ? '' : batas);
    setTanpaBatas(batas === null);
    setShowModal(true);
  };

  const handleSaveZona = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      // Edit mode
      const updated = zonaList.map(z => {
        if (z.id === editingId) {
          return {
            ...z,
            nama_zona: namaZona,
            keterangan: keterangan,
            tarif_per_galon: tarifPerGalon,
            urutan: urutan,
            jarak_maks_km: tanpaBatas ? null : Number(jarakMaks)
          };
        }
        return z;
      });
      setZonaList(updated);
      AppStore.saveZona(updated);
    } else {
      // Add mode
      const newZona: ZoneOngkir = {
        id: `zn-${Date.now()}`,
        nama_zona: namaZona,
        keterangan: keterangan,
        tarif_per_galon: tarifPerGalon,
        aktif: true,
        urutan: urutan,
        jarak_maks_km: tanpaBatas ? null : Number(jarakMaks)
      };
      const updated = [...zonaList, newZona];
      setZonaList(updated);
      AppStore.saveZona(updated);
    }

    setShowModal(false);
  };

  const handleDeleteZona = (id: string, nama: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus "${nama}"?`)) {
      const updated = zonaList.filter(z => z.id !== id);
      setZonaList(updated);
      AppStore.saveZona(updated);
    }
  };

  const handleToggleAktif = (id: string) => {
    const updated = zonaList.map(z => z.id === id ? { ...z, aktif: !z.aktif } : z);
    setZonaList(updated);
    AppStore.saveZona(updated);
  };

  const handleInlineTarifUpdate = (id: string, tarifBaru: number) => {
    const updated = zonaList.map(z => z.id === id ? { ...z, tarif_per_galon: tarifBaru } : z);
    setZonaList(updated);
    AppStore.saveZona(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Header */}
      <div className="glass-card animate-fade-in" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={24} color="#0284c7" /> Pengaturan Zona & Tarif Ongkir Unit
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
            Ongkir dihitung per unit galon/jerigen 30L saat delivery. Tambah, edit, atau sesuaikan tarif zona kapan saja.
          </p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary">
          <Plus size={18} /> Tambah Zona Baru
        </button>
      </div>

      {/* Add / Edit Zona Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', overflowY: 'auto'
        }}>
          <div className="glass-card animate-fade-in" style={{ margin: 'auto',
            width: '100%', maxWidth: '480px', padding: '28px', background: 'var(--surface-solid)',
            border: '1px solid var(--glass-border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {editingId ? 'Edit Zona Ongkir' : 'Tambah Zona Ongkir Baru'}
              </h3>
              <button aria-label="Tutup" type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveZona} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nama Zona Ongkir</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={namaZona} 
                  onChange={(e) => setNamaZona(e.target.value)}
                  placeholder="Contoh: Zona 1 (≤ 1 km), Zona Khusus Industri" 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Keterangan Jangkauan / Area</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={keterangan} 
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Contoh: Perumahan Merpati & sekitar depo" 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Tarif Ongkir per Unit (Rp)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={tarifPerGalon} 
                    onChange={(e) => setTarifPerGalon(Number(e.target.value))}
                    placeholder="3000" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Urutan Tampilan</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={urutan} 
                    onChange={(e) => setUrutan(Number(e.target.value))}
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="jarak-maks-zona">Batas jarak dari depo (km)</label>
                <input
                  id="jarak-maks-zona"
                  type="number"
                  step="0.1"
                  min="0"
                  className="form-input"
                  value={tanpaBatas ? '' : jarakMaks}
                  onChange={(e) => setJarakMaks(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={tanpaBatas ? 'Tanpa batas' : 'Contoh: 3'}
                  disabled={tanpaBatas}
                  required={!tanpaBatas}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '44px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={tanpaBatas} onChange={(e) => setTanpaBatas(e.target.checked)} style={{ width: '20px', height: '20px' }} />
                  Tanpa batas (zona terjauh)
                </label>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Pelanggan yang jaraknya sampai batas ini (garis lurus dari depo) masuk zona ini. Dipakai untuk memeriksa apakah zona pelanggan sudah sesuai.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-success" style={{ flex: 1 }}>
                  {editingId ? 'Simpan Perubahan' : 'Tambah Zona'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid Cards Zona */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {zonaList.map(zona => (
          <div key={zona.id} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>{zona.nama_zona}</h3>
                <span className={`badge ${zona.aktif ? 'badge-warning' : 'badge-danger'}`}>
                  Urutan {zona.urutan}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', minHeight: '36px' }}>{zona.keterangan || '-'}</p>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-sky)', marginBottom: '14px' }}>
                {jarakZonaKm(zona) === null ? 'Jarak: tanpa batas (zona terjauh)' : 'Jarak: sampai ' + jarakZonaKm(zona) + ' km dari depo'}
              </p>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tarif Ongkir per Unit (Rp)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={zona.tarif_per_galon}
                  onChange={(e) => handleInlineTarifUpdate(zona.id, Number(e.target.value))}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                onClick={() => handleToggleAktif(zona.id)} 
                className={`btn btn-sm ${zona.aktif ? 'btn-success' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              >
                {zona.aktif ? 'Status: Aktif' : 'Status: Off'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={() => openEditModal(zona)} className="btn btn-secondary btn-sm" title="Edit Zona">
                  <Edit3 size={14} /> Edit
                </button>
                <button onClick={() => handleDeleteZona(zona.id, zona.nama_zona)} className="btn btn-danger btn-sm" title="Hapus Zona">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
