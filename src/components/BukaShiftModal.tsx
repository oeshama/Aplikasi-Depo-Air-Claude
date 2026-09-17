'use client';

import React, { useState, useEffect } from 'react';
import { AppStore } from '@/lib/store';
import { ShiftKasir, UserApp } from '@/lib/types';
import { Lock, Droplets, Banknote, ShieldCheck, User, KeyRound, Printer, Share2, CheckCircle2, X } from 'lucide-react';

interface BukaShiftModalProps {
  isOpen: boolean;
  onShiftOpened: (shift: ShiftKasir) => void;
}

export default function BukaShiftModal({ isOpen, onShiftOpened }: BukaShiftModalProps) {
  const [kasAwal, setKasAwal] = useState<number>(100000);
  const [meterAwal, setMeterAwal] = useState<number>(0);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [password, setPassword] = useState<string>('123456');

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
      const cur = AppStore.getCurrentUser();
      setSelectedUserId(cur ? cur.id : (userList[0]?.id || 'usr-owner'));
      setPassword('123456');
      setOpenedShiftResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId) {
      alert('Pilih Nama User / Karyawan yang bertugas!');
      return;
    }

    if (!password || password.trim() === '') {
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

    // Find target user
    const targetUser = userList.find(u => u.id === selectedUserId) || userList[0] || {
      id: selectedUserId || 'usr-owner',
      nama: 'Kasir',
      role: 'kasir',
      username: 'kasir',
      password: '123456'
    };

    const expectedPassword = targetUser.password || '123456';
    if (password.trim() !== expectedPassword.trim()) {
      alert(`❌ Password / PIN untuk "${targetUser.nama}" salah! Silakan periksa kembali.`);
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
    AppStore.setCurrentUser(fullUser);

    const newShift = AppStore.bukaShift(Number(kasAwal), Number(meterAwal), fullUser.id, fullUser.nama);
    
    setOpenedShiftResult({
      shift: newShift,
      petugasNama: fullUser.nama,
      kasAwal: Number(kasAwal),
      meterAwal: Number(meterAwal)
    });
  };

  const handlePrint = () => {
    window.print();
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
    msg += `*Depo:* ${pengaturan.nama_depo}\n`;
    msg += `*Kasir Bertugas:* ${petugasNama}\n`;
    msg += `*Waktu Buka:* ${new Date(shift.waktu_buka).toLocaleString('id-ID')}\n`;
    msg += `--------------------------------\n`;
    msg += `*💵 Modal Kas Awal Laci:* ${AppStore.formatRupiah(kasAwal)}\n`;
    msg += `*💧 Meteran Air Awal Depo:* ${meterAwal.toLocaleString('id-ID')} Liter\n`;
    msg += `--------------------------------\n`;
    msg += `_Laporan pembukaan shift otomatis dari Kasir ${pengaturan.nama_depo}_`;

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
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px'
    }}>
      <div className="glass-card animate-fade-in" style={{
        width: '100%', maxWidth: '460px', backgroundColor: '#0f172a', border: '2px solid #0284c7',
        borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header Banner */}
        <div className="no-print" style={{
          padding: '20px 24px', background: openedShiftResult ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(2, 132, 199, 0.2) 100%)' : 'linear-gradient(135deg, rgba(2, 132, 199, 0.3) 0%, rgba(16, 185, 129, 0.2) 100%)',
          borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '14px'
        }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '14px', background: openedShiftResult ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #0284c7, #38bdf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)'
          }}>
            {openedShiftResult ? <CheckCircle2 size={26} color="#ffffff" /> : <ShieldCheck size={26} color="#ffffff" />}
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              {openedShiftResult ? 'SHIFT KASIR BERHASIL DIBUKA!' : 'ENTRI BUKA SHIFT KASIR'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
              {openedShiftResult ? 'Struk Bukti Pembukaan Shift Transaksi' : 'Pilih User / Karyawan, Password, Kas Awal & Meteran Awal'}
            </p>
          </div>
        </div>

        {!openedShiftResult ? (
          /* Input Form View */
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            {/* Info Alert */}
            <div style={{
              padding: '12px 16px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '12px', color: '#38bdf8', fontSize: '0.82rem', marginBottom: '18px', display: 'flex', gap: '8px'
            }}>
              <Lock size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Perhatian Kasir:</strong> Pilih Nama User / Karyawan bertugas dan masukkan Password untuk membuka shift transaksi hari ini.
              </div>
            </div>

            {/* 1. Nama User / Karyawan Dropdown */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={16} color="#38bdf8" /> Nama User / Karyawan (Kasir Bertugas) <span style={{ color: '#f87171' }}>*</span>
              </label>
              <select
                className="form-input"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
                style={{ fontSize: '1rem', fontWeight: 700, padding: '12px 14px', backgroundColor: '#1e293b', color: '#f8fafc' }}
              >
                {userList.map(u => (
                  <option key={u.id} value={u.id}>
                    👤 {u.nama} ({u.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Password / PIN Kasir */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <KeyRound size={16} color="#fbbf24" /> Password / PIN Kasir <span style={{ color: '#f87171' }}>*</span>
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

            {/* 3. Modal Kas Awal */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Banknote size={16} color="#34d399" /> Modal Kas Awal Di Laci (Rp) <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input 
                type="number" 
                className="form-input" 
                value={kasAwal} 
                onChange={(e) => setKasAwal(Number(e.target.value))}
                placeholder="Contoh: 100000"
                required 
                min="0"
                style={{ fontSize: '1.1rem', fontWeight: 700, padding: '12px 14px' }}
              />
            </div>

            {/* 4. Meteran Air Awal */}
            <div className="form-group" style={{ marginBottom: '22px' }}>
              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Droplets size={16} color="#38bdf8" /> Meteran Air Awal Depo (Liter) <span style={{ color: '#f87171' }}>*</span>
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

            <button 
              type="submit" 
              className="btn btn-primary btn-lg" 
              style={{ width: '100%', padding: '14px', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              🔓 BUKA SHIFT KASIR &amp; CEK STRUK
            </button>
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
                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>{pengaturan.nama_depo}</h3>
                <p style={{ fontSize: '0.75rem', color: '#555', margin: '2px 0' }}>{pengaturan.alamat}</p>
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
              padding: '16px 20px', borderTop: '1px solid var(--glass-border)',
              display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(15, 23, 42, 0.95)'
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
                🚀 Buka Shift &amp; Mulai Transaksi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


