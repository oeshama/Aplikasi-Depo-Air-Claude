'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppStore } from '@/lib/store';
import { UserRole, UserApp } from '@/lib/types';
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
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>{pengaturan.nama_depo}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{pengaturan.tagline}</p>
        </div>

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
      </div>
    </div>
  );
}

