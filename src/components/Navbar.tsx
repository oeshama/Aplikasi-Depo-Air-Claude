'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AppStore } from '@/lib/store';
import { UserApp, UserRole } from '@/lib/types';
import { 
  Droplets, ShoppingCart, Users, Package, MapPin, 
  LayoutDashboard, Truck, LogOut, UserCheck, Receipt, Settings
} from 'lucide-react';

import TutupShiftModal from '@/components/TutupShiftModal';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserApp | null>(null);
  const [depoName, setDepoName] = useState('Depo Air Clean & Fresh');
  const [depoLogo, setDepoLogo] = useState<string>('');
  const [showTutupShiftModal, setShowTutupShiftModal] = useState<boolean>(false);
  const [pendingNextAction, setPendingNextAction] = useState<(() => void) | null>(null);

  const loadSettings = () => {
    const p = AppStore.getPengaturan();
    setDepoName(p.nama_depo);
    setDepoLogo(p.logo_url || '');
  };

  const [kasDiTanganNav, setKasDiTanganNav] = useState<number>(0);

  const calculateKasDiTangan = () => {
    const activeShift = AppStore.getShiftAktif();
    const modalAwal = activeShift ? activeShift.saldo_awal : 0;
    const shiftBukaTime = activeShift ? new Date(activeShift.waktu_buka).getTime() : 0;
    const allPesanan = AppStore.getPesanan();
    const allPengeluaran = AppStore.getPengeluaran();

    const shiftPesanan = activeShift 
      ? allPesanan.filter(p => new Date(p.created_at).getTime() >= shiftBukaTime) 
      : allPesanan.filter(p => new Date(p.created_at).toDateString() === new Date().toDateString());
    
    const shiftPengeluaran = activeShift 
      ? allPengeluaran.filter(p => new Date(p.tanggal).getTime() >= shiftBukaTime)
      : allPengeluaran.filter(p => new Date(p.tanggal).toDateString() === new Date().toDateString());

    const tunaiMasuk = shiftPesanan
      .filter(p => p.pembayaran_details.some(d => d.metode === 'tunai'))
      .reduce((acc, p) => acc + p.total_akhir, 0);

    const kasKeluar = shiftPengeluaran
      .filter(p => p.tipe_arus_kas !== 'masuk' && p.kategori !== 'pengembalian_kasbon')
      .reduce((acc, p) => acc + p.nominal, 0);

    const kasbonKembali = shiftPengeluaran
      .filter(p => p.tipe_arus_kas === 'masuk' || p.kategori === 'pengembalian_kasbon')
      .reduce((acc, p) => acc + p.nominal, 0);

    setKasDiTanganNav(Math.max(0, (modalAwal + tunaiMasuk + kasbonKembali) - kasKeluar));
  };

  useEffect(() => {
    setCurrentUser(AppStore.getCurrentUser());
    loadSettings();
    calculateKasDiTangan();

    const handleUpdate = () => {
      loadSettings();
      setCurrentUser(AppStore.getCurrentUser());
      calculateKasDiTangan();
    };

    window.addEventListener('depo_pengaturan_updated', handleUpdate);
    window.addEventListener('depo_user_updated', handleUpdate);
    window.addEventListener('depo_pesanan_updated', handleUpdate);
    window.addEventListener('depo_pengeluaran_updated', handleUpdate);
    window.addEventListener('depo_shift_updated', handleUpdate);

    return () => {
      window.removeEventListener('depo_pengaturan_updated', handleUpdate);
      window.removeEventListener('depo_user_updated', handleUpdate);
      window.removeEventListener('depo_pesanan_updated', handleUpdate);
      window.removeEventListener('depo_pengeluaran_updated', handleUpdate);
      window.removeEventListener('depo_shift_updated', handleUpdate);
    };
  }, []);

  const performRoleSwitch = (role: UserRole) => {
    const users = AppStore.getUsers();
    let found = users.find(u => u.role === role);
    if (!found) {
      found = users[0];
    }
    if (found) {
      const switchedUser: UserApp = {
        ...found,
        role: role
      };
      AppStore.setCurrentUser(switchedUser);
      setCurrentUser(switchedUser);

      let dest = '/kasir';
      if (role === 'kasir') dest = '/kasir';
      else if (role === 'owner' || role === 'admin') dest = '/owner/dashboard';
      else if (role === 'pengantar') dest = '/pengantar';

      if (typeof window !== 'undefined') {
        window.location.href = dest;
      } else {
        router.push(dest);
      }
    }
  };

  const handleRoleSwitch = (targetRole: UserRole) => {
    if (currentUser?.role === 'kasir' && targetRole !== 'kasir') {
      const shiftAktif = AppStore.getShiftAktif(currentUser.id);
      if (shiftAktif) {
        setPendingNextAction(() => () => performRoleSwitch(targetRole));
        setShowTutupShiftModal(true);
        return;
      }
    }
    performRoleSwitch(targetRole);
  };

  const handleLogoutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentUser?.role === 'kasir') {
      const shiftAktif = AppStore.getShiftAktif(currentUser.id);
      if (shiftAktif) {
        setPendingNextAction(() => () => {
          if (typeof window !== 'undefined') window.location.href = '/login';
          else router.push('/login');
        });
        setShowTutupShiftModal(true);
        return;
      }
    }
    if (typeof window !== 'undefined') window.location.href = '/login';
    else router.push('/login');
  };

  if (pathname === '/login') return null;

  return (
    <nav className="glass-card no-print" style={{ margin: '12px 16px', padding: '12px 20px', borderRadius: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        {/* Brand with Custom Logo Support */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)',
            overflow: 'hidden', padding: depoLogo ? '4px' : '0'
          }}>
            {depoLogo ? (
              <img src={depoLogo} alt={depoName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <Droplets size={24} color="#ffffff" />
            )}
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', lineHeight: '1.2' }}>{depoName}</h1>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Management PWA</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {currentUser?.role === 'kasir' && (
            <>
              <Link href="/kasir" className={`btn btn-sm ${pathname === '/kasir' ? 'btn-primary' : 'btn-secondary'}`}>
                <ShoppingCart size={16} /> POS Kasir
              </Link>
              <Link href="/kasir/shift" className={`btn btn-sm ${pathname === '/kasir/shift' ? 'btn-primary' : 'btn-secondary'}`}>
                <Receipt size={16} /> Rekap Shift
              </Link>
            </>
          )}

          {/* Admin Role: Access to Dashboard & Target Harian, Pelanggan & Reseller */}
          {currentUser?.role === 'admin' && (
            <>
              <Link href="/owner/dashboard" className={`btn btn-sm ${pathname.startsWith('/owner') ? 'btn-primary' : 'btn-secondary'}`}>
                <LayoutDashboard size={16} /> Dashboard & Target Harian
              </Link>
              <Link href="/admin/kontak" className={`btn btn-sm ${pathname === '/admin/kontak' ? 'btn-primary' : 'btn-secondary'}`}>
                <Users size={16} /> Pelanggan & Reseller
              </Link>
            </>
          )}

          {/* Owner Role: Full Access to Dashboard, Pelanggan, Produk, Zona, and Pengaturan */}
          {currentUser?.role === 'owner' && (
            <>
              <Link href="/owner/dashboard" className={`btn btn-sm ${pathname.startsWith('/owner') ? 'btn-primary' : 'btn-secondary'}`}>
                <LayoutDashboard size={16} /> Dashboard Owner
              </Link>
              <Link href="/admin/kontak" className={`btn btn-sm ${pathname === '/admin/kontak' ? 'btn-primary' : 'btn-secondary'}`}>
                <Users size={16} /> Pelanggan & Reseller
              </Link>
              <Link href="/admin/produk" className={`btn btn-sm ${pathname === '/admin/produk' ? 'btn-primary' : 'btn-secondary'}`}>
                <Package size={16} /> Produk & Harga
              </Link>
              <Link href="/admin/zona" className={`btn btn-sm ${pathname === '/admin/zona' ? 'btn-primary' : 'btn-secondary'}`}>
                <MapPin size={16} /> Zona Ongkir
              </Link>
              <Link href="/admin/pengaturan" className={`btn btn-sm ${pathname === '/admin/pengaturan' ? 'btn-primary' : 'btn-secondary'}`}>
                <Settings size={16} /> Pengaturan Toko
              </Link>
            </>
          )}

          {currentUser?.role === 'pengantar' && (
            <Link href="/pengantar" className={`btn btn-sm ${pathname === '/pengantar' ? 'btn-primary' : 'btn-secondary'}`}>
              <Truck size={16} /> Antaran Lapangan
            </Link>
          )}
        </div>

        {/* User Info & Quick Switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#94a3b8' }}>
            <UserCheck size={16} color="#38bdf8" />
            <span style={{ fontWeight: 600, color: '#f8fafc' }}>{currentUser?.nama}</span>
            <span className="badge badge-primary">{currentUser?.role}</span>
          </div>

          {currentUser?.role === 'kasir' && (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #34d399', borderRadius: '8px', padding: '4px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#94a3b8' }}>Kas di Tangan:</span>
              <strong style={{ color: '#34d399', fontWeight: 800 }}>{AppStore.formatRupiah(kasDiTanganNav)}</strong>
            </div>
          )}

          <select 
            value={currentUser?.role || 'kasir'} 
            onChange={(e) => handleRoleSwitch(e.target.value as UserRole)}
            className="form-select"
            style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }}
          >
            <option value="kasir">Switch to: Kasir</option>
            <option value="owner">Switch to: Owner</option>
            <option value="admin">Switch to: Admin</option>
            <option value="pengantar">Switch to: Pengantar</option>
          </select>

          <button onClick={handleLogoutClick} className="btn btn-secondary btn-sm" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <TutupShiftModal
        isOpen={showTutupShiftModal}
        shiftAktif={currentUser ? AppStore.getShiftAktif(currentUser.id) : null}
        onClose={() => setShowTutupShiftModal(false)}
        onShiftClosed={() => {
          setShowTutupShiftModal(false);
          if (pendingNextAction) {
            pendingNextAction();
            setPendingNextAction(null);
          } else {
            router.push('/login');
          }
        }}
      />
    </nav>
  );
}
