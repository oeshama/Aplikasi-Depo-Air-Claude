'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppStore } from '@/lib/store';
import { namaCetak } from '@/lib/cetak';
import { UserRole, UserApp } from '@/lib/types';
import { AUTH_AKTIF, masukDenganAkun, DOMAIN_LOGIN } from '@/lib/auth';
import { Droplets, User, ArrowRight, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const availableUsers = AppStore.getUsers();
  const kasirUser = availableUsers.find(u => u.role === 'kasir');
  const defaultUsername = kasirUser ? kasirUser.username : (availableUsers[0]?.username || 'kasir');

  const [selectedUsername, setSelectedUsername] = useState(defaultUsername);
  const [customUsername, setCustomUsername] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [password, setPassword] = useState('');
  const [pengaturan, setPengaturan] = useState(AppStore.getPengaturan());

  // Sesi login habis (12 jam): jelaskan kenapa diminta login lagi
  const [sesiBerakhir] = useState<boolean>(() => {
    try {
      return localStorage.getItem('depo_session_expired') === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (sesiBerakhir) localStorage.removeItem('depo_session_expired');
  }, [sesiBerakhir]);

  // Mode login akun: email atau nama pengguna + password, diperiksa oleh Supabase
  const [masukan, setMasukan] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');

  useEffect(() => {
    // Sudah punya sesi akun yang masih berlaku: langsung ke halaman utama
    if (AUTH_AKTIF) {
      const u = AppStore.getSessionUser();
      if (u) redirectUser(u.role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoginAkun = async (e: React.FormEvent) => {
    e.preventDefault();
    setGalat('');
    setSibuk(true);
    const hasil = await masukDenganAkun(masukan, password);
    if (!hasil.ok) { setGalat(hasil.pesan); setSibuk(false); return; }
    AppStore.setCurrentUser(hasil.user);
    AppStore.startSession();
    redirectUser(hasil.user.role);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const targetUsername = (isCustomMode ? customUsername : selectedUsername).toLowerCase().trim();

    if (!targetUsername) {
      alert('Pilih atau masukkan Nama User / Karyawan!');
      return;
    }

    if (!password || password.trim() === '') {
      alert('Password wajib diisi!');
      return;
    }

    const foundUser = availableUsers.find(u => u.username === targetUsername || u.nama.toLowerCase() === targetUsername);

    if (foundUser) {
      const expectedPassword = foundUser.password || '123456';
      if (password.trim() !== expectedPassword.trim()) {
        alert(`Password / PIN untuk user "${foundUser.nama}" salah! Silakan periksa kembali.`);
        return;
      }

      const fullUser: UserApp = {
        id: foundUser.id,
        nama: foundUser.nama,
        username: foundUser.username,
        role: (foundUser.role as UserRole) || 'kasir',
        password: expectedPassword,
        aktif: true
      };
      AppStore.setCurrentUser(fullUser);
      AppStore.startSession();
      redirectUser(fullUser.role);
    } else {
      alert(`User "${targetUsername}" tidak terdaftar. Tambahkan karyawan lewat Pengaturan Toko terlebih dahulu.`);
    }
  };

  const redirectUser = (role: UserRole) => {
    let dest = '/kasir';
    if (role === 'owner' || role === 'admin') dest = '/owner/dashboard';
    else if (role === 'pengantar') dest = '/pengantar';
    else dest = '/kasir';
    
    if (typeof window !== 'undefined') {
      window.location.href = dest;
    } else {
      router.push(dest);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '85vh', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '20px',
            background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-sky) 100%)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '16px', boxShadow: '0 8px 24px rgba(2, 132, 199, 0.4)',
            overflow: 'hidden', padding: pengaturan.logo_url ? '6px' : '0'
          }}>
            {pengaturan.logo_url ? (
              <img src={pengaturan.logo_url} alt={pengaturan.nama_depo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <Droplets size={40} color="#ffffff" />
            )}
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>{namaCetak(pengaturan)}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{pengaturan.tagline}</p>
        </div>

        {sesiBerakhir && (
          <div role="alert" style={{
            marginBottom: '16px', padding: '12px 14px', borderRadius: '12px', fontSize: '0.9rem',
            background: 'rgba(245, 158, 11, 0.14)', border: '1px solid rgba(180, 83, 9, 0.4)', color: 'var(--c-amber)'
          }}>
            Sesi login sudah berakhir (batas 12 jam). Silakan login lagi.
          </div>
        )}

        {AUTH_AKTIF ? (
          <form onSubmit={handleLoginAkun}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" htmlFor="login-akun">
                <User size={14} style={{ display: 'inline', marginRight: '4px' }} aria-hidden="true" /> Email atau nama pengguna
              </label>
              <input
                id="login-akun"
                type="text"
                className="form-input"
                autoComplete="username"
                autoCapitalize="none"
                value={masukan}
                onChange={(e) => setMasukan(e.target.value)}
                placeholder="nama@email.com atau nama pengguna"
                required
              />
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Tanpa email? Cukup ketik nama pengguna dari owner. Aplikasi menambahkan @{DOMAIN_LOGIN} sendiri.
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" htmlFor="login-password-input">
                <KeyRound size={14} style={{ display: 'inline', marginRight: '4px' }} aria-hidden="true" /> Password
              </label>
              <input
                id="login-password-input"
                type="password"
                className="form-input"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
              />
            </div>
            {galat && <p role="alert" style={{ color: 'var(--c-red)', fontWeight: 600, margin: '0 0 10px' }}>{galat}</p>}
            <button type="submit" disabled={sibuk} className="btn btn-primary" style={{ width: '100%', marginTop: '8px', padding: '14px', fontWeight: 800 }}>
              {sibuk ? 'MEMERIKSA...' : 'MASUK KE SISTEM'} <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>
        ) : (
        <form onSubmit={handleLogin}>
          {/* User / Karyawan Selection */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0 }}>
                <User size={14} style={{ display: 'inline', marginRight: '4px' }} /> Nama User / Karyawan
              </label>
              <button
                type="button"
                onClick={() => setIsCustomMode(!isCustomMode)}
                style={{ background: 'none', border: 'none', color: 'var(--c-sky)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {isCustomMode ? 'Pilih dari Daftar' : 'Ketik Manual'}
              </button>
            </div>

            {!isCustomMode ? (
              <select
                className="form-input"
                value={selectedUsername}
                onChange={(e) => setSelectedUsername(e.target.value)}
                style={{ fontSize: '0.95rem', fontWeight: 600, backgroundColor: 'var(--surface-input)', color: 'var(--text-main)' }}
              >
                {availableUsers.map(u => (
                  <option key={u.id} value={u.username}>
                    {u.nama} ({u.role.toUpperCase()})
                  </option>
                ))}
              </select>
            ) : (
              <input 
                type="text" 
                className="form-input"
                value={customUsername}
                onChange={(e) => setCustomUsername(e.target.value)}
                placeholder="Ketik Nama User / Karyawan"
                required
              />
            )}
          </div>

          {/* Password Field */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">
              <KeyRound size={14} style={{ display: 'inline', marginRight: '4px' }} /> Password / PIN
            </label>
            <input 
              id="login-password-input"
              type="password" 
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan Password / PIN"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px', padding: '14px', fontWeight: 800 }}>
            MASUK KE SISTEM <ArrowRight size={18} />
          </button>
        </form>
        )}
      </div>
    </div>
  );
}

