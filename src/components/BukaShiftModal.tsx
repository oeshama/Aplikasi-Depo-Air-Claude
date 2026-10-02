'use client';

import React, { useState, useEffect } from 'react';
import { AppStore } from '@/lib/store';
import { ShiftKasir, UserApp } from '@/lib/types';
import FotoMeterField from '@/components/FotoMeterField';
import KepalaStruk from '@/components/KepalaStruk';
import { cetakStrukBaris, namaCetak, susunStrukBukaShift } from '@/lib/cetak';
import { AUTH_AKTIF } from '@/lib/auth';
import { Lock, Droplets, Banknote, ShieldCheck, User, KeyRound, Printer, Share2, CheckCircle2, X } from 'lucide-react';

interface BukaShiftModalProps {
  isOpen: boolean;
  onShiftOpened: (shift: ShiftKasir) => void;
  // Diisi = popup boleh ditutup (buka shift nanti). Kosong = wajib diisi.
  onClose?: () => void;
  // Dipanggil sesaat sebelum shift dibuat, supaya halaman induk tidak menutup popup sebelum struk tampil
  onSubmitted?: () => void;
}

export default function BukaShiftModal({ isOpen, onShiftOpened, onClose, onSubmitted }: BukaShiftModalProps) {
  const [kasAwal, setKasAwal] = useState<number>(0);
  const [sisaLaci, setSisaLaci] = useState<number>(0);
  const [fotoMeter, setFotoMeter] = useState<string | null>(null);
  const [modalOwner, setModalOwner] = useState<number>(0); // modal untuk laci yang dicatat owner dari kas besar
  const [meterAwal, setMeterAwal] = useState<number>(0);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const [openedShiftResult, setOpenedShiftResult] = useState<{
    shift: ShiftKasir;
    petugasNama: string;
    kasAwal: number;
    meterAwal: number;
  } | null>(null);

  // Dynamic User & Karyawan List from Pengaturan Toko
  const getUsersAndEmployees = () => {
    return AppStore.getUsers();
  };

  const userList = getUsersAndEmployees();

  useEffect(() => {
    if (isOpen) {
      const p = AppStore.getPengaturan();
      setMeterAwal(p.meteran_air_awal_liter ?? 0);
      // Bawaan 0; bila owner sudah mencatat "modal untuk laci" dari kas besar, angkanya muncul otomatis
      const modal = AppStore.getModalLaciTersedia();
      setModalOwner(modal);
      setFotoMeter(null);
      setKasAwal(modal);
      setSisaLaci(AppStore.getSisaLaciShiftTerakhir());
      const cur = AppStore.getCurrentUser();
      setSelectedUserId(cur ? cur.id : (userList[0]?.id || 'usr-owner'));
      setPassword('');
      setOpenedShiftResult(null);
    }
  }, [isOpen]);

  // Esc menutup popup (hanya saat formulir, bukan saat struk sudah tampil)
  useEffect(() => {
    if (!isOpen || !onClose || openedShiftResult) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, openedShiftResult]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId) {
      alert('Pilih Nama User / Karyawan yang bertugas!');
      return;
    }

    // Mode akun: pengguna sudah login dengan akunnya sendiri, jadi tidak ada password kedua
    if (!AUTH_AKTIF && (!password || password.trim() === '')) {
      alert('Password / PIN wajib diisi!');
      return;
    }

    if (kasAwal < 0 || isNaN(kasAwal)) {
      alert('Kas Awal wajib diisi dengan nominal angka yang valid!');
      return;
    }
    if (meterAwal < 0 || isNaN(meterAwal)) {
      alert('Meteran Air Awal wajib diisi dengan angka liter yang valid!');
      return;
    }

    const modeFoto = AppStore.getModeFotoMeter();
    if (modeFoto === 'wajib' && !fotoMeter) {
      alert('Foto meteran air depo wajib diambil dulu.');
      return;
    }

    // Find target user
    const targetUser = userList.find(u => u.id === selectedUserId) || userList[0] || {
      id: selectedUserId || 'usr-owner',
      nama: 'Kasir',
      role: 'kasir',
      username: 'kasir',
      password: '123456'
    };

    const expectedPassword = targetUser.password || '123456';
    if (!AUTH_AKTIF && password.trim() !== expectedPassword.trim()) {
      alert(`Password / PIN untuk "${targetUser.nama}" salah! Silakan periksa kembali.`);
      return;
    }
    // Mode akun: kasir hanya boleh membuka shift atas namanya sendiri
    const penggunaMasuk = AppStore.getCurrentUser();
    if (AUTH_AKTIF && penggunaMasuk.role !== 'owner' && penggunaMasuk.role !== 'admin' && targetUser.id !== penggunaMasuk.id) {
      alert('Anda hanya bisa membuka shift atas nama sendiri.');
      return;
    }

    // Set active current user in store
    const fullUser: UserApp = {
      id: targetUser.id,
      nama: targetUser.nama,
      username: targetUser.username || targetUser.nama.toLowerCase(),
      role: (targetUser.role as any) || 'kasir',
      password: expectedPassword,
      aktif: true
    };
    if (!AUTH_AKTIF) {
      AppStore.setCurrentUser(fullUser);
      AppStore.startSession(); // password sudah diverifikasi: masa login 12 jam dihitung ulang
    }

    onSubmitted?.();
    const newShift = AppStore.bukaShift(Number(kasAwal), Number(meterAwal), fullUser.id, fullUser.nama);
    if (fotoMeter && modeFoto !== 'nonaktif' && !AppStore.simpanFotoMeter(newShift.id, 'awal', fotoMeter)) {
      alert('Shift sudah dibuka, tapi foto meteran tidak tersimpan (penyimpanan perangkat penuh).');
    }
    
    setOpenedShiftResult({
      shift: newShift,
      petugasNama: fullUser.nama,
      kasAwal: Number(kasAwal),
      meterAwal: Number(meterAwal)
    });
  };

  const handlePrint = () => {
    if (!openedShiftResult) {
      window.print();
      return;
    }
    const owner = AppStore.getUsers().find((u: UserApp) => u.role === 'owner');
    cetakStrukBaris(susunStrukBukaShift({
      kasir: openedShiftResult.petugasNama,
      waktuBuka: openedShiftResult.shift.waktu_buka,
      kasAwal: openedShiftResult.kasAwal,
      meterAwal: openedShiftResult.meterAwal,
      ownerNama: owner?.nama || ''
    }, AppStore.getPengaturan()));
  };

  const handleSendWAOwner = () => {
    if (!openedShiftResult) return;
    const { shift, petugasNama, kasAwal, meterAwal } = openedShiftResult;
    const pengaturan = AppStore.getPengaturan();
    const users = AppStore.getUsers();
    const ownerUser = users.find((u: UserApp) => u.role === 'owner');
    const rawPhone = ownerUser?.no_hp || pengaturan.no_wa || '';
    
    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    let msg = `*🔓 LAPORAN PEMBUKAAN SHIFT KASIR*\n`;
    msg += `--------------------------------\n`;
    msg += `*Depo:* ${namaCetak(pengaturan)}\n`;
    msg += `*Kasir Bertugas:* ${petugasNama}\n`;
    msg += `*Waktu Buka:* ${new Date(shift.waktu_buka).toLocaleString('id-ID')}\n`;
    msg += `--------------------------------\n`;
    msg += `*💵 Modal Kas Awal Laci:* ${AppStore.formatRupiah(kasAwal)}\n`;
    msg += `*💧 Meteran Air Awal Depo:* ${meterAwal.toLocaleString('id-ID')} Liter\n`;
    msg += `--------------------------------\n`;
    msg += `_Laporan pembukaan shift otomatis dari Kasir ${namaCetak(pengaturan)}_`;

    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    
    window.open(url, '_blank');
  };

  const handleStartTransaction = () => {
    if (openedShiftResult) {
      onShiftOpened(openedShiftResult.shift);
    }
  };

  const pengaturan = AppStore.getPengaturan();
  const users = AppStore.getUsers();
  const ownerUser = users.find((u: UserApp) => u.role === 'owner');
  const rawPhone = ownerUser?.no_hp || pengaturan.no_wa || '';

  return (
    // Lembar dari bawah di HP (kotak di tengah di laptop). Wajib diisi, jadi tidak ada tombol tutup.
    <div className="sheet-overlay" style={{ zIndex: 1200 }}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-buka-shift"
        style={{ padding: 0, border: '2px solid var(--c-primary)', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header Banner */}
        <div className="no-print" style={{
          padding: '20px 24px', background: openedShiftResult ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(2, 132, 199, 0.2) 100%)' : 'linear-gradient(135deg, rgba(2, 132, 199, 0.3) 0%, rgba(16, 185, 129, 0.2) 100%)',
          borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '14px'
        }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '14px', background: openedShiftResult ? 'linear-gradient(135deg, var(--c-green-strong), var(--c-green-deep))' : 'linear-gradient(135deg, var(--c-primary), var(--c-sky))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)'
          }}>
            {openedShiftResult ? <CheckCircle2 size={26} color="#ffffff" /> : <ShieldCheck size={26} color="#ffffff" />}
          </div>
          <div>
            <h3 id="judul-buka-shift" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              {openedShiftResult ? 'SHIFT KASIR BERHASIL DIBUKA!' : 'ENTRI BUKA SHIFT KASIR'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              {openedShiftResult ? 'Struk Bukti Pembukaan Shift Transaksi' : 'Pilih User / Karyawan, Password, Kas Awal & Meteran Awal'}
            </p>
          </div>
          {onClose && !openedShiftResult && (
            <button
              type="button"
              className="icon-btn"
              onClick={onClose}
              aria-label="Tutup, buka shift nanti"
              style={{ marginLeft: 'auto', flexShrink: 0 }}
            >
              <X size={20} aria-hidden="true" />
            </button>
          )}
        </div>

        {!openedShiftResult ? (
          /* Input Form View */
          <form onSubmit={handleSubmit} style={{ padding: '20px 20px calc(24px + env(safe-area-inset-bottom))' }}>
            {/* Info Alert */}
            <div style={{
              padding: '12px 16px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '12px', color: 'var(--c-sky)', fontSize: '0.82rem', marginBottom: '18px', display: 'flex', gap: '8px'
            }}>
              <Lock size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Perhatian Kasir:</strong> Pilih Nama User / Karyawan bertugas dan masukkan Password untuk membuka shift transaksi hari ini.
              </div>
            </div>

            {/* 1. Nama User / Karyawan Dropdown */}
            {AUTH_AKTIF && AppStore.getCurrentUser().role !== 'owner' && AppStore.getCurrentUser().role !== 'admin' ? (
              <p style={{ margin: '0 0 16px', fontWeight: 700 }}>Petugas shift: {AppStore.getCurrentUser().nama}</p>
            ) : (
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={16} color="#38bdf8" /> Nama User / Karyawan (Kasir Bertugas) <span style={{ color: 'var(--c-red)' }}>*</span>
              </label>
              <select
                className="form-input"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
                style={{ fontSize: '1rem', fontWeight: 700, padding: '12px 14px', backgroundColor: 'var(--surface-input)', color: 'var(--text-main)' }}
              >
                {userList.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nama} ({u.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
            )}

            {/* 2. Password / PIN Kasir (hanya cara login lama) */}
            {!AUTH_AKTIF && (
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <KeyRound size={16} color="#fbbf24" /> Password / PIN Kasir <span style={{ color: 'var(--c-red)' }}>*</span>
              </label>
              <input 
                type="password" 
                className="form-input" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan Password / PIN"
                required
                style={{ fontSize: '1rem', fontWeight: 700, padding: '12px 14px' }}
              />
            </div>
            )}

            {/* 3. Modal Kas Awal */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Banknote size={16} color="#34d399" /> Modal Kas Awal Di Laci (Rp) <span style={{ color: 'var(--c-red)' }}>*</span>
              </label>
              <input 
                type="number" 
                className="form-input" 
                value={kasAwal}
                onChange={(e) => setKasAwal(Number(e.target.value))}
                placeholder="0 jika laci kosong"
                required 
                min="0"
                style={{ fontSize: '1.1rem', fontWeight: 700, padding: '12px 14px' }}
              />
              {modalOwner > 0 && (
                <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Modal dari owner (kas besar): <strong style={{ color: 'var(--text-main)' }}>{AppStore.formatRupiah(modalOwner)}</strong>
                </div>
              )}
              {sisaLaci > 0 && kasAwal !== modalOwner + sisaLaci && (
                <div role="status" style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>Sisa laci shift sebelumnya: <strong style={{ color: 'var(--text-main)' }}>{AppStore.formatRupiah(sisaLaci)}</strong></span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setKasAwal(modalOwner + sisaLaci)}>{modalOwner > 0 ? 'Tambahkan' : 'Gunakan'}</button>
                </div>
              )}
            </div>

            {/* 4. Meteran Air Awal */}
            <div className="form-group" style={{ marginBottom: '22px' }}>
              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Droplets size={16} color="#38bdf8" /> Meteran Air Awal Depo (Liter) <span style={{ color: 'var(--c-red)' }}>*</span>
              </label>
              <input 
                type="number" 
                className="form-input" 
                value={meterAwal} 
                onChange={(e) => setMeterAwal(Number(e.target.value))}
                placeholder="Contoh: 5000"
                required 
                min="0"
                style={{ fontSize: '1.1rem', fontWeight: 700, padding: '12px 14px' }}
              />
            </div>

            {AppStore.getModeFotoMeter() !== 'nonaktif' && (
              <FotoMeterField id="foto-meter-awal" label="Foto meteran air awal" value={fotoMeter} onChange={setFotoMeter} wajib={AppStore.getModeFotoMeter() === 'wajib'} />
            )}

            <button 
              type="submit" 
              className="btn btn-primary btn-lg" 
              style={{ width: '100%', padding: '14px', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              BUKA SHIFT KASIR &amp; CEK STRUK
            </button>
            {onClose && (
              <p style={{ marginTop: '12px', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Belum siap? Tutup dulu dengan tombol X. Shift wajib dibuka sebelum menerima pembayaran.
              </p>
            )}
          </form>
        ) : (
          /* Receipt View */
          <div>
            <div style={{
              padding: '24px', background: '#ffffff', color: '#000000', fontFamily: 'monospace', fontSize: '0.85rem',
              lineHeight: '1.4', maxHeight: '65vh', overflowY: 'auto'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                {pengaturan.logo_url && (
                  <img src={pengaturan.logo_url} alt={pengaturan.nama_depo} style={{ maxHeight: '45px', maxWidth: '120px', objectFit: 'contain', marginBottom: '6px' }} />
                )}
                <KepalaStruk pengaturan={pengaturan} rapat />
                <p style={{ fontSize: '0.75rem', color: '#555', margin: '2px 0' }}>Telp/WA Owner: {rawPhone || '-'}</p>
                <p style={{ marginTop: '8px', marginBottom: '4px' }}>================================</p>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold', textTransform: 'uppercase', margin: '4px 0' }}>
                  STRUK PEMBUKAAN SHIFT KASIR
                </h4>
                <p style={{ margin: 0 }}>================================</p>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div>Kasir Bertugas : <b>{openedShiftResult.petugasNama}</b></div>
                <div>Waktu Buka Shift : {new Date(openedShiftResult.shift.waktu_buka).toLocaleString('id-ID')}</div>
                <p style={{ margin: '6px 0 4px 0' }}>--------------------------------</p>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem' }}>
                  <span>MODAL KAS AWAL LACI</span>
                  <span>{AppStore.formatRupiah(openedShiftResult.kasAwal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem', marginTop: '6px' }}>
                  <span>METERAN AIR AWAL</span>
                  <span>{openedShiftResult.meterAwal.toLocaleString('id-ID')} Liter</span>
                </div>
              </div>

              {/* Tanda Tangan */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', textAlign: 'center', marginTop: '24px', fontSize: '0.75rem' }}>
                <div>
                  <p style={{ margin: 0 }}>Petugas Shift</p>
                  <div style={{ height: '35px' }}></div>
                  <p style={{ fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '2px', margin: 0 }}>
                    ( {openedShiftResult.petugasNama} )
                  </p>
                  <span style={{ fontSize: '0.65rem', color: '#666' }}>Kasir</span>
                </div>
                <div>
                  <p style={{ margin: 0 }}>Pengelola Depo</p>
                  <div style={{ height: '35px' }}></div>
                  <p style={{ fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '2px', margin: 0 }}>
                    ( {ownerUser?.nama || 'Owner / Supervisor'} )
                  </p>
                  <span style={{ fontSize: '0.65rem', color: '#666' }}>Owner</span>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '0.7rem', color: '#666' }}>
                <p style={{ margin: '4px 0' }}>================================</p>
                <p style={{ margin: 0 }}>{pengaturan.footer_struk || 'Struk Buka Shift Sah Depo Air'}</p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="no-print" style={{
              padding: '16px 20px calc(16px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--glass-border)',
              display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--inset-90)'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button onClick={handlePrint} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700 }}>
                  <Printer size={16} /> Cetak Struk
                </button>
                <button onClick={handleSendWAOwner} className="btn btn-success" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700 }}>
                  <Share2 size={16} /> Kirim WA ke Owner
                </button>
              </div>
              <button onClick={handleStartTransaction} className="btn btn-primary btn-lg" style={{ width: '100%', fontWeight: 800 }}>
                Buka Shift &amp; Mulai Transaksi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


