'use client';

import React, { useState, useEffect } from 'react';
import { PengaturanDepo, KomponenServis, Karyawan, UserApp, GalonPinjamanPelanggan, Kontak } from '@/lib/types';
import { AppStore } from '@/lib/store';
import LokasiField from '@/components/LokasiField';
import { PERIODE_TARGET, ambilTarget, aturTarget, LITER_PER_GALON } from '@/lib/target';
import { cetakUji } from '@/lib/cetak';
import {
  Settings, Image as ImageIcon, Upload, Save, Droplets, 
  CheckCircle, Trash2, AlertTriangle, Wrench, Plus, Gauge,
  Users, UserPlus, Phone, MapPin, DollarSign, Calendar, Edit3, X, UserCheck, Target, Camera, Printer,
  Bell, BellOff, Volume2, Clock, Package, KeyRound
} from 'lucide-react';

export default function AdminPengaturanPage() {
  const [pengaturan, setPengaturan] = useState<PengaturanDepo>(AppStore.getPengaturan());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');

  // Karyawan Modal State
  const [showKaryawanModal, setShowKaryawanModal] = useState(false);
  const [editingKaryawanId, setEditingKaryawanId] = useState<string | null>(null);

  // Karyawan Form State
  const [namaKaryawan, setNamaKaryawan] = useState('');
  const [jabatanKaryawan, setJabatanKaryawan] = useState('Pengantar / Driver');
  const [noHpKaryawan, setNoHpKaryawan] = useState('');
  const [alamatKaryawan, setAlamatKaryawan] = useState('');
  const [tanggalMasukKaryawan, setTanggalMasukKaryawan] = useState(AppStore.tanggalHariIni());
  const [gajiBasic, setGajiBasic] = useState<number>(2200000);
  const [uangMakanPerHari, setUangMakanPerHari] = useState<number>(25000);
  const [tanggalJatuhTempoGaji, setTanggalJatuhTempoGaji] = useState<number>(25);
  const [passwordKaryawan, setPasswordKaryawan] = useState<string>('123456');

  // Reset Database State
  const [resetOptions, setResetOptions] = useState({
    pesanan: false,
    kontak: false,
    produk: false,
    zona: false,
    servis: false,
    karyawan: false,
    keuangan: false,
    factoryAll: false
  });
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  const handleToggleResetOption = (key: keyof typeof resetOptions) => {
    if (key === 'factoryAll') {
      const val = !resetOptions.factoryAll;
      setResetOptions({
        pesanan: val,
        kontak: val,
        produk: val,
        zona: val,
        servis: val,
        karyawan: val,
        keuangan: val,
        factoryAll: val
      });
    } else {
      setResetOptions(prev => {
        const next = { ...prev, [key]: !prev[key] };
        const allChecked = next.pesanan && next.kontak && next.produk && next.zona && next.servis && next.karyawan && next.keuangan;
        return { ...next, factoryAll: allChecked };
      });
    }
  };

  const handleOpenResetModal = () => {
    const hasSelection = Object.values(resetOptions).some(val => val === true);
    if (!hasSelection) {
      alert('Pilih minimal satu kategori data yang ingin direset!');
      return;
    }
    setResetConfirmInput('');
    setShowResetConfirmModal(true);
  };

  const handleExecuteReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetConfirmInput.trim().toUpperCase() !== 'RESET') {
      alert('Ketik kata "RESET" dengan huruf kapital untuk mengonfirmasi!');
      return;
    }

    AppStore.resetSelectedData(resetOptions);
    setShowResetConfirmModal(false);
    setResetConfirmInput('');
    
    // Reset selection checkboxes
    setResetOptions({
      pesanan: false,
      kontak: false,
      produk: false,
      zona: false,
      servis: false,
      karyawan: false,
      keuangan: false,
      factoryAll: false
    });

    setResetSuccessMessage('Database berhasil direset! Halaman akan dimuat ulang...');
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const [currentUser, setCurrentUser] = useState<UserApp | null>(null);
  const isOwner = currentUser?.role === 'owner';

  // Stok Opname Modal State
  const [showStokOpnameModal, setShowStokOpnameModal] = useState(false);
  const [stokAirBakuInput, setStokAirBakuInput] = useState<number>(4200);
  const [stokGalonMilikInput, setStokGalonMilikInput] = useState<number>(500);
  const [stokGalonDiDepoInput, setStokGalonDiDepoInput] = useState<number>(360);
  const [stokGalonRusakInput, setStokGalonRusakInput] = useState<number>(15);
  const [meteranAirAwalInput, setMeteranAirAwalInput] = useState<number>(125000);
  const [pinjamanListState, setPinjamanListState] = useState<GalonPinjamanPelanggan[]>([]);
  const [komponenStokState, setKomponenStokState] = useState<KomponenServis[]>([]);

  // Form input pinjaman baru di modal
  const [newPinjamNama, setNewPinjamNama] = useState('');
  const [newPinjamKontakId, setNewPinjamKontakId] = useState('');
  const [newPinjamJumlah, setNewPinjamJumlah] = useState<number>(5);
  const [newPinjamCatatan, setNewPinjamCatatan] = useState('');

  // Stok Opname Handlers
  const handleOpenStokOpnameModal = () => {
    const curUser = AppStore.getCurrentUser();
    if (curUser?.role !== 'owner') {
      alert('Koreksi Stok Opname hanya dapat dilakukan oleh akun Owner!');
      return;
    }
    setStokAirBakuInput(pengaturan.stok_air_baku_saat_ini ?? 0);
    setStokGalonMilikInput(pengaturan.stok_galon_milik_depo ?? 500);
    setStokGalonDiDepoInput(pengaturan.stok_galon_di_depo ?? 360);
    setStokGalonRusakInput(pengaturan.stok_galon_rusak ?? 15);
    setMeteranAirAwalInput(pengaturan.meteran_air_awal_liter ?? 125000);
    setPinjamanListState(pengaturan.galon_pinjaman_pelanggan || []);
    setKomponenStokState(pengaturan.komponen_servis_list || []);
    setShowStokOpnameModal(true);
  };

  const [kontakList, setKontakList] = useState<Kontak[]>([]);

  useEffect(() => {
    const data = AppStore.getPengaturan();
    const curUser = AppStore.getCurrentUser();
    setCurrentUser(curUser);
    setKontakList(AppStore.getKontak());
    
    // Ensure default arrays & Stok Opname defaults
    if (!data.komponen_servis_list) data.komponen_servis_list = [];
    if (!data.karyawan_list) data.karyawan_list = [];
    if (!data.min_stok_air_baku_liter) data.min_stok_air_baku_liter = 2000;
    if (data.stok_air_baku_saat_ini === undefined) data.stok_air_baku_saat_ini = 0;
    if (data.stok_galon_milik_depo === undefined) data.stok_galon_milik_depo = 500;
    if (data.stok_galon_di_depo === undefined) data.stok_galon_di_depo = 360;
    if (data.stok_galon_rusak === undefined) data.stok_galon_rusak = 15;
    if (data.meteran_air_awal_liter === undefined) data.meteran_air_awal_liter = 125000;
    if (!data.galon_pinjaman_pelanggan) {
      data.galon_pinjaman_pelanggan = [
        { id: 'pinjam-1', kontak_id: 'kt-2', nama_pelanggan: 'Pak Hendra (Kompleks Merpati)', jumlah_galon: 10, catatan: 'Pinjam galon acara keluarga', tanggal_pinjam: '2026-09-01' },
        { id: 'pinjam-2', kontak_id: 'kt-3', nama_pelanggan: 'Ibu Ratna (Warteg Merdeka)', jumlah_galon: 25, catatan: 'Pinjam galon operasional warteg', tanggal_pinjam: '2026-09-05' },
        { id: 'pinjam-3', kontak_id: 'kt-4', nama_pelanggan: 'Toko Berkah (Reseller Pak Agus)', jumlah_galon: 90, catatan: 'Titip galon konsinyasi reseller', tanggal_pinjam: '2026-09-10' }
      ];
    }

    setPengaturan(data);
    setLogoPreview(data.logo_url || '');
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('Ukuran berkas gambar maksimal 3MB!');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        setPengaturan(prev => ({ ...prev, logo_url: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setPengaturan(prev => ({ ...prev, logo_url: '' }));
  };

  // Komponen Servis Handler
  const handleAddKomponen = () => {
    const newKomp: KomponenServis = {
      id: `komp-${Date.now()}`,
      nama_komponen: 'Komponen Baru (misal: Filter RO)',
      batas_liter: 5000,
      liter_terakhir_ganti: 0,
      keterangan: 'Deskripsi servis...',
      aktif: true
    };
    setPengaturan(prev => ({
      ...prev,
      komponen_servis_list: [...(prev.komponen_servis_list || []), newKomp]
    }));
  };

  const handleUpdateKomponen = (id: string, field: keyof KomponenServis, value: any) => {
    setPengaturan(prev => ({
      ...prev,
      komponen_servis_list: prev.komponen_servis_list.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleDeleteKomponen = (id: string) => {
    setPengaturan(prev => ({
      ...prev,
      komponen_servis_list: prev.komponen_servis_list.filter(item => item.id !== id)
    }));
  };

  // Karyawan Handlers
  const openAddKaryawanModal = () => {
    setEditingKaryawanId(null);
    setNamaKaryawan('');
    setJabatanKaryawan('Pengantar / Driver');
    setNoHpKaryawan('');
    setAlamatKaryawan('');
    setTanggalMasukKaryawan(AppStore.tanggalHariIni());
    setGajiBasic(2200000);
    setUangMakanPerHari(25000);
    setTanggalJatuhTempoGaji(25);
    setPasswordKaryawan('123456');
    setShowKaryawanModal(true);
  };

  const openEditKaryawanModal = (kary: Karyawan) => {
    setEditingKaryawanId(kary.id);
    setNamaKaryawan(kary.nama);
    setJabatanKaryawan(kary.jabatan);
    setNoHpKaryawan(kary.no_hp);
    setAlamatKaryawan(kary.alamat || '');
    setTanggalMasukKaryawan(kary.tanggal_masuk || AppStore.tanggalHariIni());
    setGajiBasic(kary.gaji_basic);
    setUangMakanPerHari(kary.uang_makan_per_hari);
    setTanggalJatuhTempoGaji(kary.tanggal_jatuh_tempo_gaji || 25);
    setPasswordKaryawan(kary.password || '123456');
    setShowKaryawanModal(true);
  };

  const handleSaveKaryawan = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingKaryawanId) {
      // Edit Mode
      const updatedList = (pengaturan.karyawan_list || []).map(k => {
        if (k.id === editingKaryawanId) {
          return {
            ...k,
            nama: namaKaryawan,
            jabatan: jabatanKaryawan,
            no_hp: noHpKaryawan,
            alamat: alamatKaryawan,
            tanggal_masuk: tanggalMasukKaryawan,
            gaji_basic: gajiBasic,
            uang_makan_per_hari: uangMakanPerHari,
            tanggal_jatuh_tempo_gaji: tanggalJatuhTempoGaji,
            password: passwordKaryawan.trim() || '123456'
          };
        }
        return k;
      });
      const updatedPengaturan = { ...pengaturan, karyawan_list: updatedList };
      setPengaturan(updatedPengaturan);
      AppStore.savePengaturan(updatedPengaturan);
    } else {
      // Add Mode
      const newKaryawan: Karyawan = {
        id: `kary-${Date.now()}`,
        nama: namaKaryawan,
        jabatan: jabatanKaryawan,
        no_hp: noHpKaryawan,
        alamat: alamatKaryawan,
        tanggal_masuk: tanggalMasukKaryawan,
        gaji_basic: gajiBasic,
        uang_makan_per_hari: uangMakanPerHari,
        insentif_per_galon: 0,
        tanggal_jatuh_tempo_gaji: tanggalJatuhTempoGaji,
        password: passwordKaryawan.trim() || '123456',
        aktif: true
      };
      const updatedList = [...(pengaturan.karyawan_list || []), newKaryawan];
      const updatedPengaturan = { ...pengaturan, karyawan_list: updatedList };
      setPengaturan(updatedPengaturan);
      AppStore.savePengaturan(updatedPengaturan);
    }

    setShowKaryawanModal(false);
  };

  const handleDeleteKaryawan = (id: string, nama: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data karyawan "${nama}"?`)) {
      const updatedList = (pengaturan.karyawan_list || []).filter(k => k.id !== id);
      const updatedPengaturan = { ...pengaturan, karyawan_list: updatedList };
      setPengaturan(updatedPengaturan);
      AppStore.savePengaturan(updatedPengaturan);
    }
  };

  const handleToggleAktifKaryawan = (id: string) => {
    const updatedList = (pengaturan.karyawan_list || []).map(k => 
      k.id === id ? { ...k, aktif: !k.aktif } : k
    );
    const updatedPengaturan = { ...pengaturan, karyawan_list: updatedList };
    setPengaturan(updatedPengaturan);
    AppStore.savePengaturan(updatedPengaturan);
  };

  const handleSubmitMain = (e: React.FormEvent) => {
    e.preventDefault();
    AppStore.savePengaturan(pengaturan);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  const handleAddPinjamanItem = () => {
    let nama = newPinjamNama.trim();
    if (newPinjamKontakId) {
      const found = kontakList.find(k => k.id === newPinjamKontakId);
      if (found) nama = found.nama;
    }
    if (!nama) {
      alert('Masukkan nama pelanggan / pilih pelanggan!');
      return;
    }
    if (newPinjamJumlah <= 0) {
      alert('Jumlah galon dipinjam harus lebih besar dari 0!');
      return;
    }
    const newItem: GalonPinjamanPelanggan = {
      id: `pinjam-${Date.now()}`,
      kontak_id: newPinjamKontakId || undefined,
      nama_pelanggan: nama,
      jumlah_galon: newPinjamJumlah,
      catatan: newPinjamCatatan.trim() || 'Pinjaman galon pelanggan',
      tanggal_pinjam: AppStore.tanggalHariIni()
    };
    setPinjamanListState(prev => [...prev, newItem]);
    setNewPinjamNama('');
    setNewPinjamKontakId('');
    setNewPinjamJumlah(5);
    setNewPinjamCatatan('');
  };

  const handleDeletePinjamanItem = (id: string) => {
    const itemToDelete = pinjamanListState.find(item => item.id === id);
    const updatedList = pinjamanListState.filter(item => item.id !== id);
    setPinjamanListState(updatedList);

    const updatedPengaturan = { ...pengaturan, galon_pinjaman_pelanggan: updatedList };
    setPengaturan(updatedPengaturan);
    AppStore.savePengaturan(updatedPengaturan);

    // Sync Kontak galon_dipinjam to 0 if no active loan remains
    const allKontak = AppStore.getKontak();
    const updatedKontak = allKontak.map(k => {
      const remaining = updatedList
        .filter(p => p.kontak_id === k.id || (p.nama_pelanggan && p.nama_pelanggan.toLowerCase() === k.nama.toLowerCase()))
        .reduce((acc, p) => acc + p.jumlah_galon, 0);
      return { ...k, galon_dipinjam: remaining };
    });
    AppStore.saveKontak(updatedKontak);
  };

  const handleClearAllPinjaman = () => {
    if (confirm('Apakah Anda yakin ingin mengosongkan SELURUH nama pelanggan yang meminjam galon menjadi Rp 0 / Kosong?')) {
      setPinjamanListState([]);
      const updatedPengaturan = { ...pengaturan, galon_pinjaman_pelanggan: [] };
      setPengaturan(updatedPengaturan);
      AppStore.savePengaturan(updatedPengaturan);

      const allKontak = AppStore.getKontak();
      const updatedKontak = allKontak.map(k => ({ ...k, galon_dipinjam: 0 }));
      AppStore.saveKontak(updatedKontak);
      alert('Seluruh data peminjam galon berhasil dikosongkan!');
    }
  };

  const handleUpdateKomponenStokInModal = (id: string, value: number) => {
    setKomponenStokState(prev => prev.map(k => k.id === id ? { ...k, stok_komponen: value } : k));
  };

  const handleSaveStokOpnameCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    const curUser = AppStore.getCurrentUser();
    if (curUser?.role !== 'owner') {
      alert('Akses ditolak! Hanya Owner yang diperbolehkan menyimpan koreksi Stok Opname.');
      return;
    }

    const updatedPengaturan: PengaturanDepo = {
      ...pengaturan,
      stok_air_baku_saat_ini: Number(stokAirBakuInput) || 0,
      stok_galon_milik_depo: Number(stokGalonMilikInput) || 0,
      stok_galon_di_depo: Number(stokGalonDiDepoInput) || 0,
      stok_galon_rusak: Number(stokGalonRusakInput) || 0,
      meteran_air_awal_liter: Number(meteranAirAwalInput) || 0,
      galon_pinjaman_pelanggan: pinjamanListState,
      komponen_servis_list: komponenStokState
    };

    setPengaturan(updatedPengaturan);
    AppStore.adjustMeterAndStokByOwner(
      Number(stokAirBakuInput) || 0,
      Number(meteranAirAwalInput) || 0
    );

    // Sync Kontak galon_dipinjam
    const allKontak = AppStore.getKontak();
    const updatedKontak = allKontak.map(k => {
      const remaining = pinjamanListState
        .filter(p => p.kontak_id === k.id || (p.nama_pelanggan && p.nama_pelanggan.toLowerCase() === k.nama.toLowerCase()))
        .reduce((acc, p) => acc + p.jumlah_galon, 0);
      return { ...k, galon_dipinjam: remaining };
    });
    AppStore.saveKontak(updatedKontak);

    setShowStokOpnameModal(false);
    alert('Koreksi Stok Opname (Galon Milik Depo, Pinjaman Pelanggan, Meteran Air Awal, & Stok Komponen Mesin) Berhasil Disimpan oleh Owner!');
  };

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div className="glass-card animate-fade-in" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Settings size={26} color="#0284c7" /> Pengaturan Depo, Karyawan & Notifikasi Servis
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              Kelola data karyawan & gaji, identitas toko, batas notifikasi air baku, dan komponen pemeliharaan mesin.
            </p>
          </div>
          {saveSuccess && (
            <span className="badge badge-success" style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={16} /> Berhasil Disimpan!
            </span>
          )}
        </div>
      </div>

      {/* SECTION 1: Manajemen Karyawan & Komponen Gaji (NEW USER REQUEST) */}
      <div className="glass-card animate-fade-in" style={{ padding: '24px', borderLeft: '4px solid var(--c-green-strong)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={22} color="#10b981" /> Data Karyawan & Ketentuan Komponen Gaji
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
              Kelola identitas karyawan, gaji basic bulanan, dan uang makan harian.
            </p>
          </div>
          <button type="button" onClick={openAddKaryawanModal} className="btn btn-primary">
            <UserPlus size={18} /> Tambah Karyawan Baru
          </button>
        </div>

        {/* Grid List Karyawan */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '16px' }}>
          {pengaturan.karyawan_list?.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>Belum ada data karyawan. Klik tombol di atas untuk menambah.</p>
          ) : (
            pengaturan.karyawan_list?.map(kary => (
              <div key={kary.id} className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>{kary.nama}</h4>
                      <span className="badge badge-primary" style={{ marginTop: '2px' }}>{kary.jabatan}</span>
                    </div>
                    <span className={`badge ${kary.aktif ? 'badge-success' : 'badge-danger'}`}>
                      {kary.aktif ? 'Aktif' : 'Off'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px' }}>
                    <div><Phone size={13} style={{ display: 'inline', marginRight: '4px' }} /> {kary.no_hp || '-'}</div>
                    <div><Calendar size={13} style={{ display: 'inline', marginRight: '4px' }} /> Masuk: {kary.tanggal_masuk || '-'}</div>
                    <div><KeyRound size={13} style={{ display: 'inline', marginRight: '4px', color: 'var(--c-amber-strong)' }} /> Password: <strong style={{ color: 'var(--c-amber-strong)' }}>{kary.password || '123456'}</strong></div>
                  </div>

                  {/* Salary Breakdown Box */}
                  <div style={{ background: 'var(--inset-70)', padding: '12px', borderRadius: '10px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Gaji Basic:</span>
                      <strong style={{ color: 'var(--c-green)' }}>{AppStore.formatRupiah(kary.gaji_basic)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Uang Makan:</span>
                      <strong style={{ color: 'var(--c-sky)' }}>{AppStore.formatRupiah(kary.uang_makan_per_hari)}/hari</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Jatuh Tempo Gaji:</span>
                      <strong style={{ color: 'var(--c-amber)' }}>Tgl {kary.tanggal_jatuh_tempo_gaji || 25} / bulan</strong>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button onClick={() => handleToggleAktifKaryawan(kary.id)} className={`btn btn-sm ${kary.aktif ? 'btn-success' : 'btn-secondary'}`} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                    {kary.aktif ? 'Aktif' : 'Status: Off'}
                  </button>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => openEditKaryawanModal(kary)} className="btn btn-secondary btn-sm" title="Edit Karyawan">
                      <Edit3 size={14} /> Edit
                    </button>
                    <button onClick={() => handleDeleteKaryawan(kary.id, kary.nama)} className="btn btn-danger btn-sm" title="Hapus Karyawan">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>

      </div>

      {/* SECTION STOK OPNAME DEPO & ASSET CONTROL (Khusus Owner) */}
      <div className="glass-card animate-fade-in" style={{ padding: '24px', borderLeft: '4px solid var(--c-sky)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={22} color="#38bdf8" /> Stok Opname Depo & Koreksi Stok Aset
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
              Ringkasan stok galon fisik milik depo, galon dipinjamkan ke pelanggan, meteran air awal, dan stok komponen mesin.
            </p>
          </div>

          <div>
            {isOwner ? (
              <button 
                type="button" 
                onClick={handleOpenStokOpnameModal} 
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-sky) 100%)', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Koreksi Stok Opname (Owner Only)
              </button>
            ) : (
              <span className="badge badge-warning" style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Hanya Owner yang dapat mengkoreksi Stok Opname
              </span>
            )}
          </div>
        </div>

        {/* Grid 4 Key Opname Highlights */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          
          <div style={{ background: 'var(--inset-70)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL GALON MILIK DEPO</span>
            <h4 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--c-sky)', marginTop: '4px' }}>
              {pengaturan.stok_galon_milik_depo ?? 500} Galon
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aset fisik galon total</span>
          </div>

          <div style={{ background: 'var(--inset-70)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>GALON DI LOKASI DEPO</span>
            <h4 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--c-green)', marginTop: '4px' }}>
              {pengaturan.stok_galon_di_depo ?? 360} Galon
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stok ready / siap isi & antar</span>
          </div>

          <div style={{ background: 'var(--inset-70)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>DIPINJAM PELANGGAN</span>
            <h4 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--c-amber)', marginTop: '4px' }}>
              {(pengaturan.galon_pinjaman_pelanggan || []).reduce((acc, p) => acc + p.jumlah_galon, 0)} Galon
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dari {(pengaturan.galon_pinjaman_pelanggan || []).length} pelanggan / reseller</span>
          </div>

          <div style={{ background: 'var(--inset-70)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>GALON RUSAK / AFKIR</span>
            <h4 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--c-red)', marginTop: '4px' }}>
              {pengaturan.stok_galon_rusak ?? 15} Galon
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pecah / tidak terpakai</span>
          </div>

        </div>

        {/* Two Columns: Galon Dipinjam Pelanggan & Meteran Air + Stok Komponen */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(350px, 100%), 1fr))', gap: '16px' }}>
          
          {/* Card: Rekap Galon Dipinjam Pelanggan */}
          <div style={{ background: 'var(--inset-60)', padding: '18px', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="#fbbf24" /> Daftar Dipinjam Pelanggan Siapa Aja
              </h4>
              {(pengaturan.galon_pinjaman_pelanggan || []).length > 0 && (
                <button 
                  type="button" 
                  onClick={handleClearAllPinjaman}
                  className="btn btn-danger btn-sm"
                  style={{ fontSize: '0.72rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  title="Kosongkan seluruh nama pelanggan peminjam galon"
                >
                  <Trash2 size={12} /> Kosongkan Semua
                </button>
              )}
            </div>
            
            {(pengaturan.galon_pinjaman_pelanggan || []).length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Belum ada galon dipinjamkan.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(pengaturan.galon_pinjaman_pelanggan || []).map((item, idx) => (
                  <div key={item.id || idx} style={{ background: 'rgba(2, 132, 199, 0.08)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{item.nama_pelanggan}</strong>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: '2px' }}>{item.catatan || 'Dipinjamkan'}</p>
                    </div>
                    <span className="badge badge-warning" style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                      {item.jumlah_galon} Galon
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card: Meteran Air Awal & Stok Komponen Mesin */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Meteran Air Awal Box */}
            <div style={{ background: 'var(--inset-60)', padding: '18px', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gauge size={18} color="#38bdf8" /> Meteran Air Awal (Flowmeter Baseline)
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Angka Awal / Baseline:</span>
                  <h5 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-sky)' }}>
                    {(pengaturan.meteran_air_awal_liter ?? 125000).toLocaleString('id-ID')} Liter
                  </h5>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Konversi M³:</span>
                  <h5 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-green)' }}>
                    {((pengaturan.meteran_air_awal_liter ?? 125000) / 1000).toFixed(1)} M³
                  </h5>
                </div>
              </div>
            </div>

            {/* Stok Komponen Mesin Box */}
            <div style={{ background: 'var(--inset-60)', padding: '18px', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wrench size={18} color="#f59e0b" /> Stok Komponen Mesin & Sparepart Cadangan
              </h4>

              {(pengaturan.komponen_servis_list || []).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Belum ada komponen mesin tercatat.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(pengaturan.komponen_servis_list || []).map((komp) => (
                    <div key={komp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.83rem', borderBottom: '1px dashed var(--w-10)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-2)' }}>{komp.nama_komponen}</span>
                      <strong style={{ color: (komp.stok_komponen ?? 0) <= 2 ? 'var(--c-red)' : 'var(--c-green)' }}>
                        {komp.stok_komponen ?? 0} Pcs Cadangan
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmitMain} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* SECTION 2: Logo & Nama Toko */}
        <div className="glass-card animate-fade-in" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={22} color="#0284c7" /> Logo & Nama Resmi Depo/Toko
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '24px', alignItems: 'flex-start' }}>
            
            {/* Logo Preview & Uploader */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '140px', height: '140px', borderRadius: '16px',
                border: '2px dashed var(--accent)', background: 'var(--inset-60)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                position: 'relative'
              }}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo Depo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '10px' }}>
                    <Droplets size={40} color="#0284c7" style={{ opacity: 0.6 }} />
                    <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>Belum ada logo</p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
                  <Upload size={14} /> Upload Logo
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>

                {logoPreview && (
                  <button type="button" onClick={handleRemoveLogo} className="btn btn-danger btn-sm" title="Hapus Logo">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PNG, JPG, WEBP (Max 3MB)</span>
            </div>

            {/* Nama & Tagline Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nama Depo / Toko</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={pengaturan.nama_depo} 
                  onChange={(e) => setPengaturan(prev => ({ ...prev, nama_depo: e.target.value }))}
                  placeholder="Contoh: Depo Air Lam-Lam"
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nama Owner / Pemilik Depo</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={pengaturan.nama_owner || 'Owner Budi'} 
                  onChange={(e) => setPengaturan(prev => ({ ...prev, nama_owner: e.target.value }))}
                  placeholder="Contoh: Budi Santoso / Pak Hendra"
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <KeyRound size={15} color="#f59e0b" /> Password Login Owner (Default: 123456)
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={pengaturan.password_owner || '123456'} 
                  onChange={(e) => setPengaturan(prev => ({ ...prev, password_owner: e.target.value }))}
                  placeholder="Password akun Owner (default: 123456)"
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tagline / Slogan</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={pengaturan.tagline} 
                  onChange={(e) => setPengaturan(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="Contoh: Air Isi Ulang Higienis & Berkualitas"
                />
              </div>
            </div>

          </div>
        </div>

        {/* SECTION Target Penjualan Harian & Periode */}
        <div className="glass-card animate-fade-in" style={{ padding: '24px', borderLeft: '4px solid var(--c-green-strong)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={22} color="#10b981" /> Target Penjualan Harian & Periode
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            Atur target omzet (Rp), volume penjualan galon, dan volume penjualan liter untuk harian, mingguan, bulanan, dan tahunan yang tampil di Dashboard Owner.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {PERIODE_TARGET.map(per => (
              <div key={per.id} style={{ background: 'var(--inset-70)', padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--c-sky)', marginBottom: '10px' }}>Target {per.label}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor={`tg-omzet-${per.id}`}>Omzet (Rp)</label>
                    <input id={`tg-omzet-${per.id}`} type="number" inputMode="numeric" min="0" className="form-input" value={ambilTarget(pengaturan, 'omzet', per.id)} onChange={(e) => setPengaturan(prev => aturTarget(prev, 'omzet', per.id, Number(e.target.value)))} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor={`tg-galon-${per.id}`}>Volume galon (galon)</label>
                    <input id={`tg-galon-${per.id}`} type="number" inputMode="numeric" min="0" className="form-input" value={ambilTarget(pengaturan, 'galon', per.id)} onChange={(e) => setPengaturan(prev => aturTarget(prev, 'galon', per.id, Number(e.target.value)))} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor={`tg-liter-${per.id}`}>Volume liter (liter)</label>
                    <input id={`tg-liter-${per.id}`} type="number" inputMode="numeric" min="0" className="form-input" value={ambilTarget(pengaturan, 'liter', per.id)} onChange={(e) => setPengaturan(prev => aturTarget(prev, 'liter', per.id, Number(e.target.value)))} />
                  </div>
                </div>
              </div>
            ))}
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Volume liter dihitung dari semua produk (botol, jerigen, galon) sesuai isi tiap wadah. Kalau belum diisi, targetnya otomatis target galon dikali {LITER_PER_GALON} liter. Isi 0 untuk tidak memakai target.
            </p>
          </div>
        </div>

        {/* SECTION Foto Meteran Air Depo */}
        <div className="glass-card animate-fade-in" style={{ padding: '24px', borderLeft: '4px solid var(--c-sky)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={22} color="#38bdf8" /> Foto Meteran Air Depo
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '14px' }}>
            Saat kasir mengisi meteran air awal (buka shift) dan akhir (tutup shift), aplikasi bisa meminta foto meterannya sebagai bukti. Foto dikecilkan otomatis, dan yang lebih lama dari 60 hari dihapus sendiri.
          </p>
          <div className="seg-grid" role="radiogroup" aria-label="Aturan foto meteran air">
            {([
              ['wajib', 'Wajib foto'],
              ['opsional', 'Boleh dilewati'],
              ['nonaktif', 'Tidak usah foto'],
            ] as const).map(([nilai, label]) => (
              <button
                key={nilai}
                type="button"
                role="radio"
                aria-checked={(pengaturan.foto_meter_mode || 'opsional') === nilai}
                className="seg-btn"
                onClick={() => setPengaturan(prev => ({ ...prev, foto_meter_mode: nilai }))}
              >
                {label}
              </button>
            ))}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '10px' }}>
            {(pengaturan.foto_meter_mode || 'opsional') === 'wajib' && 'Kasir tidak bisa membuka atau menutup shift sebelum memfoto meteran.'}
            {(pengaturan.foto_meter_mode || 'opsional') === 'opsional' && 'Kolom foto tampil, tapi kasir boleh melewatinya.'}
            {(pengaturan.foto_meter_mode || 'opsional') === 'nonaktif' && 'Kolom foto tidak tampil di buka dan tutup shift.'}
            {' '}Ingat tekan Simpan Seluruh Pengaturan di bawah setelah memilih.
          </p>
        </div>

        {/* SECTION Printer Struk */}
        <div className="glass-card animate-fade-in" style={{ padding: '24px', borderLeft: '4px solid var(--c-primary)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={22} color="#38bdf8" /> Printer Struk
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '14px' }}>
            Atur cara mencetak struk penjualan ke printer thermal. Pengaturan ini berlaku di semua perangkat.
          </p>

          <div className="form-label" id="label-printer-metode" style={{ marginBottom: '6px' }}>Cara mencetak</div>
          <div className="seg-grid" role="radiogroup" aria-labelledby="label-printer-metode" style={{ marginBottom: '14px' }}>
            {([
              ['dialog', 'Dialog cetak browser'],
              ['rawbt', 'Aplikasi RawBT (printer Bluetooth)'],
            ] as const).map(([nilai, label]) => (
              <button
                key={nilai}
                type="button"
                role="radio"
                aria-checked={(pengaturan.printer_metode || 'dialog') === nilai}
                className="seg-btn"
                onClick={() => setPengaturan(prev => ({ ...prev, printer_metode: nilai }))}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="form-label" id="label-printer-lebar" style={{ marginBottom: '6px' }}>Lebar kertas</div>
          <div className="seg-grid" role="radiogroup" aria-labelledby="label-printer-lebar" style={{ marginBottom: '14px' }}>
            {([58, 80] as const).map(mm => (
              <button
                key={mm}
                type="button"
                role="radio"
                aria-checked={(pengaturan.printer_lebar_mm || 58) === mm}
                className="seg-btn"
                onClick={() => setPengaturan(prev => ({ ...prev, printer_lebar_mm: mm }))}
              >
                {mm} mm
              </button>
            ))}
          </div>

          {pengaturan.printer_metode === 'rawbt' && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!pengaturan.printer_cetak_otomatis}
                onChange={(e) => setPengaturan(prev => ({ ...prev, printer_cetak_otomatis: e.target.checked }))}
                style={{ width: '20px', height: '20px', marginTop: '2px' }}
              />
              <span>
                <strong style={{ display: 'block' }}>Cetak otomatis setelah bayar</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Struk langsung dikirim ke printer begitu transaksi diproses.</span>
              </span>
            </label>
          )}

          {pengaturan.printer_metode === 'rawbt' && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!pengaturan.printer_buka_laci}
                onChange={(e) => setPengaturan(prev => ({ ...prev, printer_buka_laci: e.target.checked }))}
                style={{ width: '20px', height: '20px', marginTop: '2px' }}
              />
              <span>
                <strong style={{ display: 'block' }}>Buka laci kas saat bayar tunai</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Aktifkan hanya bila laci kas sudah dicolok ke printer (port RJ11/RJ12). Belum diuji dengan laci.</span>
              </span>
            </label>
          )}

          <button type="button" className="btn btn-secondary" onClick={() => cetakUji(pengaturan)} style={{ marginBottom: '14px' }}>
            <Printer size={16} aria-hidden="true" /> Uji cetak
          </button>

          <details style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0 12px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, minHeight: '48px', display: 'flex', alignItems: 'center' }}>Cara memasang printer Bluetooth (Android)</summary>
            <ol style={{ margin: '0 0 12px', paddingLeft: '20px', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Nyalakan printer, lalu di Pengaturan HP buka Bluetooth dan sambungkan (pairing) printernya. Kodenya biasanya 0000 atau 1234.</li>
              <li>Pasang aplikasi <strong>RawBT</strong> dari Play Store (gratis).</li>
              <li>Buka RawBT, pilih printer yang tadi disambungkan, dan atur lebar kertas 58 mm di dalam RawBT.</li>
              <li>Di sini pilih <strong>Aplikasi RawBT</strong>, tekan Simpan Seluruh Pengaturan di bawah, lalu tekan <strong>Uji cetak</strong>. Pertama kali, Android bisa bertanya aplikasi mana yang dipakai: pilih RawBT.</li>
              <li>Kalau uji cetak rapi, coba satu transaksi. Struk keluar dari tombol Cetak Thermal di struk, atau otomatis bila pilihan di atas diaktifkan.</li>
            </ol>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 12px' }}>
              Pengaturan ini berlaku untuk struk penjualan dan struk buka/tutup shift. Bukti pengeluaran dan rekap shift di halaman Rekap Shift masih memakai dialog cetak browser.
            </p>
          </details>
        </div>

        {/* SECTION Notifikasi & Alarm Keterlambatan Pengiriman */}
        <div className="glass-card animate-fade-in" style={{ padding: '24px', borderLeft: '4px solid var(--c-red-strong)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={22} color="#ef4444" /> Pengaturan Notifikasi & Alarm Keterlambatan Pengiriman
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
                Atur status aktif alarm pengingat, batas menit keterlambatan pengiriman, durasi snooze, dan mode suara alarm.
              </p>
            </div>
            <span className={`badge ${pengaturan.notifikasi_alarm_aktif !== false ? 'badge-danger' : 'badge-secondary'}`}>
              {pengaturan.notifikasi_alarm_aktif !== false ? 'Alarm Active' : 'Alarm Nonaktif'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            
            {/* Status Master Switch */}
            <div style={{ background: 'var(--inset-60)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Master Alarm Pengiriman</span>
                  <input 
                    type="checkbox" 
                    checked={pengaturan.notifikasi_alarm_aktif !== false} 
                    onChange={(e) => setPengaturan(prev => ({ ...prev, notifikasi_alarm_aktif: e.target.checked }))}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </label>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginTop: '6px' }}>
                  {pengaturan.notifikasi_alarm_aktif !== false 
                    ? 'Alarm pengingat pengiriman aktif dan berbunyi jika ada pesanan terlambat.' 
                    : 'Alarm suara pengiriman dimatikan sepenuhnya (Silent/Off).'}
                </p>
              </div>
            </div>

            {/* Mode Suara Alarm */}
            <div style={{ background: 'var(--inset-60)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-main)' }}>Tipe / Mode Alarm Suara</label>
                <select 
                  value={pengaturan.mode_suara_alarm || 'beep_suara'}
                  onChange={(e) => setPengaturan(prev => ({ ...prev, mode_suara_alarm: e.target.value as any }))}
                  className="form-select"
                  style={{ marginTop: '4px' }}
                >
                  <option value="beep_suara">Audio Beep Synthesizer (Aktif Suara Siren)</option>
                  <option value="silent">Notifikasi Visual Saja (Silent / Tanpa Suara)</option>
                </select>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginTop: '6px' }}>
                  Pilih apakah alarm membunyikan audio sirine atau hanya tanda merah visual.
                </p>
              </div>
            </div>

            {/* Batas Menit Keterlambatan */}
            <div style={{ background: 'var(--inset-60)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  Batas Keterlambatan (Berapa Menit Alarm Bunyi)
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={pengaturan.batas_keterlambatan_menit ?? 90} 
                    onChange={(e) => setPengaturan(prev => ({ ...prev, batas_keterlambatan_menit: Math.max(1, Number(e.target.value)) }))}
                    placeholder="90"
                    min={1}
                    required 
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Menit</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--c-amber)', marginTop: '6px' }}>
                  Default: 90 Menit (1.5 Jam). Pesanan pending &gt;= durasi ini akan memicu alarm.
                </p>
              </div>
            </div>

            {/* Durasi Snooze Menit */}
            <div style={{ background: 'var(--inset-60)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  Durasi Snooze / Tunda Alarm (Menit)
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={pengaturan.durasi_snooze_menit ?? 15} 
                    onChange={(e) => setPengaturan(prev => ({ ...prev, durasi_snooze_menit: Math.max(1, Number(e.target.value)) }))}
                    placeholder="15"
                    min={1}
                    required 
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Menit</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--c-sky)', marginTop: '6px' }}>
                  Default: 15 Menit. Alarm diam sementara dan berbunyi lagi jika durasi snooze berakhir.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 3: Notifikasi Stok Air Baku */}
        <div className="glass-card animate-fade-in" style={{ padding: '24px', borderLeft: '4px solid var(--c-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Droplets size={22} color="#0284c7" /> Batas Notifikasi Stok Air Baku Menipis
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
                Atur status aktif notifikasi dan batas minimum air baku di tangki utama. Sistem akan memberi alert merah jika stok di bawah batas ini.
              </p>
            </div>
            <span className={`badge ${pengaturan.notifikasi_air_baku_aktif !== false ? 'badge-primary' : 'badge-secondary'}`}>
              {pengaturan.notifikasi_air_baku_aktif !== false ? 'Notifikasi Air Baku Aktif' : 'Notifikasi Dimatikan'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            
            {/* Status Master Switch Air Baku */}
            <div style={{ background: 'var(--inset-60)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Master Notifikasi Air Baku</span>
                  <input 
                    type="checkbox" 
                    checked={pengaturan.notifikasi_air_baku_aktif !== false} 
                    onChange={(e) => setPengaturan(prev => ({ ...prev, notifikasi_air_baku_aktif: e.target.checked }))}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </label>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginTop: '6px' }}>
                  {pengaturan.notifikasi_air_baku_aktif !== false 
                    ? 'Notifikasi & alarm peringatan stok air baku menipis aktif.' 
                    : 'Notifikasi & alarm stok air baku menipis dimatikan (Off).'}
                </p>
              </div>
            </div>

            <div style={{ background: 'var(--inset-60)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-main)' }}>Batas Minimum Notifikasi (Liter)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={pengaturan.min_stok_air_baku_liter} 
                  onChange={(e) => setPengaturan(prev => ({ ...prev, min_stok_air_baku_liter: Number(e.target.value) }))}
                  placeholder="2000"
                  style={{ marginTop: '4px' }}
                  required 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--c-amber)', marginTop: '6px', display: 'block' }}>Default: ≤ 2.000 Liter</span>
              </div>
            </div>

            <div style={{ background: 'var(--inset-60)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-main)' }}>Stok Air Baku Tangki Saat Ini (Liter)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={pengaturan.stok_air_baku_saat_ini} 
                  onChange={(e) => setPengaturan(prev => ({ ...prev, stok_air_baku_saat_ini: Number(e.target.value) }))}
                  placeholder="5000"
                  style={{ marginTop: '4px' }}
                  required 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--c-green)', marginTop: '6px', display: 'block' }}>Kapasitas tangki aktif</span>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 4: Komponen Mesin & Jadwal Servis (Satuan Liter) */}
        <div className="glass-card animate-fade-in" style={{ padding: '24px', borderLeft: '4px solid var(--c-amber-strong)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wrench size={22} color="#f59e0b" /> Komponen Mesin & Jadwal Servis (Satuan Liter)
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
                Notifikasi otomatis berdasarkan akumulasi liter air yang diproduksi & terjual.
              </p>
            </div>
            <button type="button" onClick={handleAddKomponen} className="btn btn-primary btn-sm">
              <Plus size={16} /> Tambah Komponen Baru
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pengaturan.komponen_servis_list?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>Belum ada komponen servis. Klik tombol di atas untuk menambah.</p>
            ) : (
              pengaturan.komponen_servis_list?.map((komp, idx) => (
                <div key={komp.id} style={{
                  background: 'var(--inset-60)', border: '1px solid var(--glass-border)',
                  borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>Komponen #{idx + 1}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={komp.aktif} 
                          onChange={(e) => handleUpdateKomponen(komp.id, 'aktif', e.target.checked)}
                          style={{ width: '16px', height: '16px' }}
                        /> Notifikasi Aktif
                      </label>
                      <button type="button" onClick={() => handleDeleteKomponen(komp.id)} className="btn btn-danger btn-sm" aria-label="Hapus komponen" style={{ padding: '4px 8px' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Nama Komponen / Filter</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={komp.nama_komponen}
                        onChange={(e) => handleUpdateKomponen(komp.id, 'nama_komponen', e.target.value)}
                        placeholder="Contoh: Filter Spun 0.1 Micron"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Batas Servis (Satuan Liter)</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={komp.batas_liter}
                        onChange={(e) => handleUpdateKomponen(komp.id, 'batas_liter', Number(e.target.value))}
                        placeholder="5000"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Liter Terakhir Diganti</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={komp.liter_terakhir_ganti}
                        onChange={(e) => handleUpdateKomponen(komp.id, 'liter_terakhir_ganti', Number(e.target.value))}
                        placeholder="0"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Stok Sparepart Cadangan (Pcs)</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={komp.stok_komponen ?? 0}
                        onChange={(e) => handleUpdateKomponen(komp.id, 'stok_komponen', Number(e.target.value))}
                        placeholder="0"
                        min={0}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Keterangan / Catatan Servis</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={komp.keterangan || ''}
                      onChange={(e) => handleUpdateKomponen(komp.id, 'keterangan', e.target.value)}
                      placeholder="Lokasi atau spesifikasi komponen..."
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SECTION 5: Kontak & Alamat Depo */}
        <div className="glass-card animate-fade-in" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>
            Informasi Alamat & Struk
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Nomor WhatsApp Bisnis Depo</label>
              <input 
                type="text" 
                className="form-input" 
                value={pengaturan.no_wa}
                onChange={(e) => setPengaturan(prev => ({ ...prev, no_wa: e.target.value }))}
                placeholder="081234567890"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Galon Poin Loyalitas</label>
              <input 
                type="number" 
                className="form-input" 
                value={pengaturan.target_loyalitas_galon}
                onChange={(e) => setPengaturan(prev => ({ ...prev, target_loyalitas_galon: Number(e.target.value) }))}
                placeholder="10"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Alamat Depo Air</label>
            <textarea 
              className="form-textarea" 
              rows={2}
              value={pengaturan.alamat}
              onChange={(e) => setPengaturan(prev => ({ ...prev, alamat: e.target.value }))}
              placeholder="Alamat lengkap depo..."
              required
            />
          </div>

          {/* Lokasi depo: dasar peta sebaran pelanggan dan validasi zona ongkir */}
          <div style={{ background: 'var(--inset-50)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={18} color="#0369a1" aria-hidden="true" /> Lokasi Depo di Peta
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Dipakai untuk menghitung jarak pelanggan ke depo (peta sebaran dan validasi zona ongkir).
              Batas jarak tiap zona diatur di menu <a href="/admin/zona" style={{ color: 'var(--c-sky)', fontWeight: 600 }}>Zona Ongkir</a>.
              Tekan <strong>Simpan Pengaturan</strong> di bagian bawah setelah memilih lokasi.
            </p>
            <LokasiField
              idDasar="lokasi-depo"
              lat={pengaturan.lokasi_depo_lat}
              lng={pengaturan.lokasi_depo_lng}
              onChange={(la, ln) => setPengaturan(prev => ({ ...prev, lokasi_depo_lat: la, lokasi_depo_lng: ln }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Header Struk Cetak</label>
              <textarea 
                className="form-textarea" 
                rows={3}
                value={pengaturan.header_struk}
                onChange={(e) => setPengaturan(prev => ({ ...prev, header_struk: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Footer Struk Cetak</label>
              <textarea 
                className="form-textarea" 
                rows={3}
                value={pengaturan.footer_struk}
                onChange={(e) => setPengaturan(prev => ({ ...prev, footer_struk: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: DANGER ZONE - Reset Database (Pilihan Data) */}
        <div className="glass-card animate-fade-in" style={{ padding: '24px', borderLeft: '4px solid var(--c-red-strong)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-red-soft)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={22} color="#ef4444" /> Reset Database (Pilihan Data Kategori)
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
                Pilih kategori data yang ingin direset atau dihapus secara aman dari penyimpanan lokal.
              </p>
            </div>
            {resetSuccessMessage && (
              <span className="badge badge-success" style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} /> {resetSuccessMessage}
              </span>
            )}
          </div>

          {/* Selective Options Checkboxes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginTop: '16px' }}>
            
            {/* Option 1: Pesanan & Omzet */}
            <label style={{
              background: resetOptions.pesanan ? 'rgba(239, 68, 68, 0.2)' : 'var(--inset-60)',
              border: resetOptions.pesanan ? '1px solid var(--c-red-strong)' : '1px solid var(--glass-border)',
              borderRadius: '12px', padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '10px', transition: 'all 0.2s'
            }}>
              <input 
                type="checkbox" 
                checked={resetOptions.pesanan} 
                onChange={() => handleToggleResetOption('pesanan')}
                style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--c-red-strong)' }}
              />
              <div>
                <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem', display: 'block' }}>Riwayat Transaksi & Laporan</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Hapus semua nota penjualan, riwayat POS & reset laporan omzet Laba Rugi</span>
              </div>
            </label>

            {/* Option 2: Kontak & Hutang */}
            <label style={{
              background: resetOptions.kontak ? 'rgba(239, 68, 68, 0.2)' : 'var(--inset-60)',
              border: resetOptions.kontak ? '1px solid var(--c-red-strong)' : '1px solid var(--glass-border)',
              borderRadius: '12px', padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '10px', transition: 'all 0.2s'
            }}>
              <input 
                type="checkbox" 
                checked={resetOptions.kontak} 
                onChange={() => handleToggleResetOption('kontak')}
                style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--c-red-strong)' }}
              />
              <div>
                <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem', display: 'block' }}>Data Pelanggan & Reseller</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Kembalikan daftar pelanggan & nol-kan seluruh catatan piutang/hutang</span>
              </div>
            </label>

            {/* Option 3: Produk & Harga */}
            <label style={{
              background: resetOptions.produk ? 'rgba(239, 68, 68, 0.2)' : 'var(--inset-60)',
              border: resetOptions.produk ? '1px solid var(--c-red-strong)' : '1px solid var(--glass-border)',
              borderRadius: '12px', padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '10px', transition: 'all 0.2s'
            }}>
              <input 
                type="checkbox" 
                checked={resetOptions.produk} 
                onChange={() => handleToggleResetOption('produk')}
                style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--c-red-strong)' }}
              />
              <div>
                <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem', display: 'block' }}>Data Produk & Wadah</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Reset daftar produk & harga ke pengaturan standar awal</span>
              </div>
            </label>

            {/* Option 4: Zona Ongkir */}
            <label style={{
              background: resetOptions.zona ? 'rgba(239, 68, 68, 0.2)' : 'var(--inset-60)',
              border: resetOptions.zona ? '1px solid var(--c-red-strong)' : '1px solid var(--glass-border)',
              borderRadius: '12px', padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '10px', transition: 'all 0.2s'
            }}>
              <input 
                type="checkbox" 
                checked={resetOptions.zona} 
                onChange={() => handleToggleResetOption('zona')}
                style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--c-red-strong)' }}
              />
              <div>
                <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem', display: 'block' }}>Data Zona Ongkir</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Reset daftar zona pengiriman & tarif per unit ke default</span>
              </div>
            </label>

            {/* Option 5: Notifikasi & Servis Mesin */}
            <label style={{
              background: resetOptions.servis ? 'rgba(239, 68, 68, 0.2)' : 'var(--inset-60)',
              border: resetOptions.servis ? '1px solid var(--c-red-strong)' : '1px solid var(--glass-border)',
              borderRadius: '12px', padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '10px', transition: 'all 0.2s'
            }}>
              <input 
                type="checkbox" 
                checked={resetOptions.servis} 
                onChange={() => handleToggleResetOption('servis')}
                style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--c-red-strong)' }}
              />
              <div>
                <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem', display: 'block' }}>Counter Servis & Air Baku</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Reset akumulasi liter produksi komponen mesin & stok air baku</span>
              </div>
            </label>

            {/* Option 6: Karyawan */}
            <label style={{
              background: resetOptions.karyawan ? 'rgba(239, 68, 68, 0.2)' : 'var(--inset-60)',
              border: resetOptions.karyawan ? '1px solid var(--c-red-strong)' : '1px solid var(--glass-border)',
              borderRadius: '12px', padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '10px', transition: 'all 0.2s'
            }}>
              <input 
                type="checkbox" 
                checked={resetOptions.karyawan} 
                onChange={() => handleToggleResetOption('karyawan')}
                style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--c-red-strong)' }}
              />
              <div>
                <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem', display: 'block' }}>Data Karyawan & Gaji</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Mengosongkan seluruh daftar karyawan & komponen gaji</span>
              </div>
            </label>

            {/* Option 7: Keuangan Owner */}
            <label style={{
              background: resetOptions.keuangan ? 'rgba(239, 68, 68, 0.2)' : 'var(--inset-60)',
              border: resetOptions.keuangan ? '1px solid var(--c-red-strong)' : '1px solid var(--glass-border)',
              borderRadius: '12px', padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '10px', transition: 'all 0.2s'
            }}>
              <input
                type="checkbox"
                checked={resetOptions.keuangan}
                onChange={() => handleToggleResetOption('keuangan')}
                style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--c-red-strong)' }}
              />
              <div>
                <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem', display: 'block' }}>Keuangan Owner</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Kas besar, rekening, buku kas, dan setoran ke owner. Penjualan dan shift tidak ikut terhapus</span>
              </div>
            </label>

          </div>

          {/* Option 7: Factory Reset All */}
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--glass-border)' }}>
            <label style={{
              background: resetOptions.factoryAll ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.1)',
              border: '2px dashed var(--c-red-strong)',
              borderRadius: '12px', padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  checked={resetOptions.factoryAll} 
                  onChange={() => handleToggleResetOption('factoryAll')}
                  style={{ width: '20px', height: '20px', accentColor: 'var(--c-red-strong)' }}
                />
                <div>
                  <strong style={{ color: 'var(--c-red-strong)', fontSize: '1rem', display: 'block' }}>FACTORY RESET TOTAL (PILIH SEMUA)</strong>
                  <span style={{ color: 'var(--c-red-soft)', fontSize: '0.8rem' }}>Bersihkan seluruh sistem & kembalikan ke kondisi awal instalasi baru</span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={handleOpenResetModal}
                className="btn btn-danger" 
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <Trash2 size={16} /> Reset Data Terpilih
              </button>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
          <Save size={20} /> Simpan Seluruh Pengaturan Depo & Karyawan
        </button>

      </form>

      {/* Global Modal Form Add/Edit Karyawan (Placed outside glass-cards at page root for top-level z-index depth) */}
      {showKaryawanModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px', overflowY: 'auto'
        }}>
          <div className="glass-card animate-fade-in" style={{ margin: 'auto',
            width: '100%', maxWidth: '560px', padding: '28px', background: 'var(--surface-solid)',
            maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--glass-border)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {editingKaryawanId ? 'Edit Data Karyawan & Gaji' : 'Tambah Karyawan Baru'}
              </h3>
              <button aria-label="Tutup" type="button" onClick={() => setShowKaryawanModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveKaryawan} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Identitas Karyawan */}
              <div style={{ background: 'var(--inset-60)', padding: '16px', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--c-sky)', marginBottom: '12px' }}>Identitas Karyawan</h4>
                
                <div className="form-group">
                  <label className="form-label">Nama Lengkap Karyawan</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={namaKaryawan} 
                    onChange={(e) => setNamaKaryawan(e.target.value)} 
                    placeholder="Contoh: Doni Pengantar" 
                    required 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Jabatan / Role</label>
                    <select 
                      value={jabatanKaryawan} 
                      onChange={(e) => setJabatanKaryawan(e.target.value)} 
                      className="form-select"
                    >
                      <option value="Pengantar / Driver">Pengantar / Driver</option>
                      <option value="Kasir POS">Kasir POS</option>
                      <option value="Admin Depo">Admin Depo</option>
                      <option value="Operator RO">Operator RO</option>
                      <option value="Pencuci Galon">Pencuci Galon</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nomor WhatsApp / HP</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={noHpKaryawan} 
                      onChange={(e) => setNoHpKaryawan(e.target.value)} 
                      placeholder="08..." 
                      required 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Tanggal Masuk Kerja</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={tanggalMasukKaryawan} 
                      onChange={(e) => setTanggalMasukKaryawan(e.target.value)} 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Alamat Tinggal</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={alamatKaryawan} 
                      onChange={(e) => setAlamatKaryawan(e.target.value)} 
                      placeholder="Alamat rumah..." 
                    />
                  </div>
                </div>
              </div>

              {/* Struktur Gaji */}
              <div style={{ background: 'var(--inset-60)', padding: '16px', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--c-green)', marginBottom: '12px' }}>Ketentuan & Komponen Gaji</h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Gaji Basic / Pokok Bulanan (Rp)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={gajiBasic} 
                      onChange={(e) => setGajiBasic(Number(e.target.value))} 
                      placeholder="2200000" 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Uang Makan per Hari (Rp)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={uangMakanPerHari} 
                      onChange={(e) => setUangMakanPerHari(Number(e.target.value))} 
                      placeholder="25000" 
                      required 
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label">Tanggal Jatuh Tempo Gaji Bulanan (Tgl 1 - 31)</label>
                  <input 
                    type="number" 
                    min={1}
                    max={31}
                    className="form-input" 
                    value={tanggalJatuhTempoGaji} 
                    onChange={(e) => setTanggalJatuhTempoGaji(Math.min(31, Math.max(1, Number(e.target.value))))} 
                    placeholder="25" 
                    required 
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>Default: Tanggal 25 setiap bulannya</span>
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <KeyRound size={15} color="#f59e0b" /> Password / PIN Login Akun (Default: 123456)
                  </label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={passwordKaryawan} 
                    onChange={(e) => setPasswordKaryawan(e.target.value)} 
                    placeholder="Masukkan password / PIN baru..." 
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowKaryawanModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-success" style={{ flex: 1 }}>
                  {editingKaryawanId ? 'Simpan Perubahan' : 'Tambah Karyawan'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Global Modal Confirmation Reset Database */}
      {showResetConfirmModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px', overflowY: 'auto'
        }}>
          <div className="glass-card animate-fade-in" style={{ margin: 'auto',
            width: '100%', maxWidth: '480px', padding: '28px', background: 'var(--surface-solid)',
            border: '2px solid var(--c-red-strong)', boxShadow: '0 0 35px rgba(239, 68, 68, 0.4)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px'
              }}>
                <AlertTriangle size={32} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Konfirmasi Reset Data Depo
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                Tindakan ini akan menghapus data kategori yang Anda pilih secara permanen!
              </p>
            </div>

            <form onSubmit={handleExecuteReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--inset-70)', padding: '14px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Kategori yang akan di-reset:</span>
                <ul style={{ paddingLeft: '20px', color: 'var(--c-red-soft)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {resetOptions.factoryAll ? (
                    <li style={{ color: 'var(--c-red-strong)', fontWeight: 800 }}>FACTORY RESET TOTAL (Seluruh Database)</li>
                  ) : (
                    <>
                      {resetOptions.pesanan && <li>Riwayat Transaksi & Laporan Penjualan</li>}
                      {resetOptions.kontak && <li>Data Pelanggan, Reseller & Piutang</li>}
                      {resetOptions.produk && <li>Data Produk & Wadah</li>}
                      {resetOptions.zona && <li>Data Zona Ongkir</li>}
                      {resetOptions.servis && <li>Notifikasi Servis & Counter Air Baku</li>}
                      {resetOptions.karyawan && <li>Data Karyawan & Gaji</li>}
                      {resetOptions.keuangan && <li>Keuangan Owner (kas besar, rekening, buku kas, setoran)</li>}
                    </>
                  )}
                </ul>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--c-red-soft)' }}>
                  Ketik kata <strong>"RESET"</strong> di bawah untuk mengonfirmasi:
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={resetConfirmInput} 
                  onChange={(e) => setResetConfirmInput(e.target.value)}
                  placeholder="Ketik RESET..." 
                  required
                  style={{ borderColor: 'var(--c-red-strong)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowResetConfirmModal(false)} 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="btn btn-danger" 
                  style={{ flex: 1, fontWeight: 700 }}
                >
                  <Trash2 size={16} /> Ya, Reset Data Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Koreksi Stok Opname (Owner Only) */}
      {showStokOpnameModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px', overflowY: 'auto'
        }}>
          <div className="glass-card animate-fade-in" style={{ margin: 'auto',
            width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto',
            padding: '28px', background: 'var(--surface-solid)', border: '2px solid var(--c-sky)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={22} color="#38bdf8" /> Koreksi Stok Opname Aset Depo (Khusus Owner)
              </h3>
              <button aria-label="Tutup" onClick={() => setShowStokOpnameModal(false)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStokOpnameCorrection} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* 1. Galon Physical Assets */}
              <div style={{ background: 'var(--inset-70)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--c-sky)', marginBottom: '12px' }}>
                  1. Stok Galon Milik Depo & Status Fisik
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Total Galon Milik Depo (Pcs)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={stokGalonMilikInput}
                      onChange={(e) => setStokGalonMilikInput(Number(e.target.value))}
                      min={0}
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Galon di Depo (Ready/Kosong)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={stokGalonDiDepoInput}
                      onChange={(e) => setStokGalonDiDepoInput(Number(e.target.value))}
                      min={0}
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Galon Rusak / Afkir</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={stokGalonRusakInput}
                      onChange={(e) => setStokGalonRusakInput(Number(e.target.value))}
                      min={0}
                      required 
                    />
                  </div>
                </div>
              </div>

              {/* 2. Meteran Air Awal & Stok Air Baku Tangki */}
              <div style={{ background: 'var(--inset-70)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--c-sky)', marginBottom: '12px' }}>
                  2. Stok Air Baku Tangki &amp; Meteran Air Awal
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Stok Air Baku Tangki Depo (Liter)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={stokAirBakuInput}
                      onChange={(e) => setStokAirBakuInput(Number(e.target.value))}
                      placeholder="4200"
                      min={0}
                      required 
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      Air fisik yang tersisa di dalam tangki depo.
                    </span>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Meteran Air Awal (Baseline Flowmeter)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={meteranAirAwalInput}
                      onChange={(e) => setMeteranAirAwalInput(Number(e.target.value))}
                      placeholder="125000"
                      min={0}
                      required 
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      Setara {((Number(meteranAirAwalInput) || 0) / 1000).toFixed(1)} M³ awal pada meteran.
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Galon Dipinjam Pelanggan */}
              <div style={{ background: 'var(--inset-70)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--c-amber)', margin: 0 }}>
                    3. Galon Dipinjam Pelanggan Siapa Aja
                  </h4>
                  {pinjamanListState.length > 0 && (
                    <button 
                      type="button" 
                      onClick={handleClearAllPinjaman}
                      className="btn btn-danger btn-sm"
                      style={{ fontSize: '0.72rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="Kosongkan seluruh data peminjam galon"
                    >
                      <Trash2 size={12} /> Kosongkan Semua
                    </button>
                  )}
                </div>

                {/* Form Tambah Item Pinjaman */}
                <div style={{ background: 'rgba(2, 132, 199, 0.1)', padding: '12px', borderRadius: '10px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--c-sky)' }}>+ Tambah Data Pinjaman Pelanggan</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '8px' }}>
                    <select 
                      value={newPinjamKontakId} 
                      onChange={(e) => {
                        setNewPinjamKontakId(e.target.value);
                        const f = kontakList.find(k => k.id === e.target.value);
                        if (f) setNewPinjamNama(f.nama);
                      }}
                      className="form-select"
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                    >
                      <option value="">-- Pilih dari Kontak / Ketik Manual --</option>
                      {kontakList.map(k => (
                        <option key={k.id} value={k.id}>{k.nama} ({k.tipe})</option>
                      ))}
                    </select>

                    <input 
                      type="number" 
                      className="form-input" 
                      value={newPinjamJumlah} 
                      onChange={(e) => setNewPinjamJumlah(Number(e.target.value))}
                      placeholder="Jml"
                      min={1}
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                    />
                  </div>

                  {!newPinjamKontakId && (
                    <input 
                      type="text" 
                      className="form-input" 
                      value={newPinjamNama}
                      onChange={(e) => setNewPinjamNama(e.target.value)}
                      placeholder="Nama Pelanggan Peminjam..."
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                    />
                  )}

                  <input 
                    type="text" 
                    className="form-input" 
                    value={newPinjamCatatan}
                    onChange={(e) => setNewPinjamCatatan(e.target.value)}
                    placeholder="Catatan / Keperluan pinjam..."
                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                  />

                  <button type="button" onClick={handleAddPinjamanItem} className="btn btn-primary btn-sm" style={{ marginTop: '4px' }}>
                    <Plus size={14} /> Tambahkan ke Daftar Pinjaman
                  </button>
                </div>

                {/* Table Daftar Pinjaman */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {pinjamanListState.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum ada data pinjaman.</p>
                  ) : (
                    pinjamanListState.map((p, idx) => (
                      <div key={p.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--inset-60)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{p.nama_pelanggan}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>{p.catatan || 'Dipinjam'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge badge-warning">{p.jumlah_galon} Galon</span>
                          <button type="button" onClick={() => handleDeletePinjamanItem(p.id)} className="btn btn-danger btn-sm" aria-label="Hapus data peminjam galon" style={{ padding: '2px 6px' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>

              {/* 4. Stok Komponen Mesin */}
              <div style={{ background: 'var(--inset-70)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--c-amber-strong)', marginBottom: '12px' }}>
                  4. Stok Komponen Mesin & Sparepart (Pcs Cadangan)
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {komponenStokState.map((k) => (
                    <div key={k.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '12px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>{k.nama_komponen}</span>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={k.stok_komponen ?? 0}
                        onChange={(e) => handleUpdateKomponenStokInModal(k.id, Number(e.target.value))}
                        min={0}
                        style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowStokOpnameModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-sky) 100%)', fontWeight: 700 }}>
                  <Save size={16} /> Simpan Koreksi Stok Opname
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
