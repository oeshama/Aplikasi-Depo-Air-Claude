'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AppStore } from '@/lib/store';
import { namaCetak } from '@/lib/cetak';
import { UserApp, UserRole, ShiftKasir } from '@/lib/types';
import { bunyiNotifikasi } from '@/lib/audioAndTimer';
import { AUTH_AKTIF } from '@/lib/auth';
import GantiPasswordModal from '@/components/GantiPasswordModal';
import { 
  Droplets, ShoppingCart, Users, Package, MapPin, 
  LayoutDashboard, Truck, LogOut, UserCheck, Receipt, Settings, Menu, X, Sun, Moon, Bell, Wallet, Map, FileText, Inbox, BookOpen, KeyRound
} from 'lucide-react';
import { getTheme, setTheme, Theme } from '@/lib/theme';

import TutupShiftModal from '@/components/TutupShiftModal';
import { getSyncStatus, SyncStatus } from '@/lib/sync';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserApp | null>(null);
  const [depoName, setDepoName] = useState('');
  const [depoLogo, setDepoLogo] = useState<string>('');
  const [showTutupShiftModal, setShowTutupShiftModal] = useState<boolean>(false);
  const [pendingNextAction, setPendingNextAction] = useState<(() => void) | null>(null);
  // Shift yang sedang ditutup ditahan di sini: setelah ditutup tidak lagi "aktif", tapi struknya harus tetap tampil
  const [shiftDitutup, setShiftDitutup] = useState<ShiftKasir | null>(null);

  const loadSettings = () => {
    const p = AppStore.getPengaturan();
    setDepoName(namaCetak(p));
    setDepoLogo(p.logo_url || '');
  };

  const [kasDiTanganNav, setKasDiTanganNav] = useState<number>(0);
  const [notifCount, setNotifCount] = useState<number>(0);
  const [menungguSetoran, setMenungguSetoran] = useState<number>(0);
  const [showGantiPassword, setShowGantiPassword] = useState<boolean>(false);
  const [pesananMasukBaru, setPesananMasukBaru] = useState<number>(0);
  const [tampilPesananMasuk, setTampilPesananMasuk] = useState<boolean>(false);
  const pesananMasukSebelumnya = React.useRef<number | null>(null);

  const calculateKasDiTangan = () => {
    const activeShift = AppStore.getShiftAktif();
    const awalHariIni = new Date(); awalHariIni.setHours(0, 0, 0, 0);
    const kas = activeShift
      ? AppStore.hitungKasLaci(activeShift.saldo_awal, new Date(activeShift.waktu_buka).getTime())
      : AppStore.hitungKasLaci(0, awalHariIni.getTime());

    setKasDiTanganNav(Math.max(0, kas.ekspektasi));
    setNotifCount(AppStore.jumlahNotifikasiBelumDibaca());
    const baru = AppStore.jumlahPesananMasukBaru();
    if (pesananMasukSebelumnya.current !== null && baru > pesananMasukSebelumnya.current) bunyiNotifikasi();
    pesananMasukSebelumnya.current = baru;
    setPesananMasukBaru(baru);
    setTampilPesananMasuk(!!AppStore.getPengaturan().pesan_online_aktif || AppStore.getPesananMasuk().length > 0);
    setMenungguSetoran(AppStore.getSetoranOwner().filter(s => s.status === 'menunggu').length + AppStore.getUangPegangan().filter(x => x.jenis === 'kembali' && x.status === 'menunggu').length);
  };

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ mode: 'local', pending: 0 });
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    setThemeState(getTheme());
    const onTheme = () => setThemeState(getTheme());
    window.addEventListener('depo_theme_updated', onTheme);
    return () => window.removeEventListener('depo_theme_updated', onTheme);
  }, []);

  // Menu HP menutup sendiri setelah pindah halaman
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    setSyncStatus(getSyncStatus());
    const handleSync = (e: Event) => setSyncStatus((e as CustomEvent<SyncStatus>).detail);
    window.addEventListener('depo_sync_status', handleSync);
    return () => window.removeEventListener('depo_sync_status', handleSync);
  }, []);

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
    window.addEventListener('depo_setoran_kurir_updated', handleUpdate);
    window.addEventListener('depo_setoran_owner_updated', handleUpdate);
    window.addEventListener('depo_uang_pegangan_updated', handleUpdate);
    window.addEventListener('depo_pesanan_masuk_updated', handleUpdate);
    window.addEventListener('depo_notifikasi_updated', handleUpdate);

    return () => {
      window.removeEventListener('depo_pengaturan_updated', handleUpdate);
      window.removeEventListener('depo_user_updated', handleUpdate);
      window.removeEventListener('depo_pesanan_updated', handleUpdate);
      window.removeEventListener('depo_pengeluaran_updated', handleUpdate);
      window.removeEventListener('depo_shift_updated', handleUpdate);
      window.removeEventListener('depo_setoran_kurir_updated', handleUpdate);
      window.removeEventListener('depo_setoran_owner_updated', handleUpdate);
      window.removeEventListener('depo_uang_pegangan_updated', handleUpdate);
      window.removeEventListener('depo_pesanan_masuk_updated', handleUpdate);
      window.removeEventListener('depo_notifikasi_updated', handleUpdate);
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
        setShiftDitutup(shiftAktif);
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
        setPendingNextAction(() => doLogout);
        setShiftDitutup(shiftAktif);
        setShowTutupShiftModal(true);
        return;
      }
    }
    doLogout();
  };

  const doLogout = () => {
    AppStore.logout();
    window.location.href = '/login';
  };

  if (pathname === '/login') return null;

  const role = currentUser?.role;
  const linkClass = (active: boolean) => `btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`;
  const syncOk = syncStatus.mode === 'online' && syncStatus.pending === 0;
  const syncText = syncStatus.mode === 'online'
    ? (syncStatus.pending > 0 ? `Mengirim ${syncStatus.pending}` : 'Tersinkron')
    : `Offline${syncStatus.pending > 0 ? ` (${syncStatus.pending} antre)` : ''}`;

  return (
    <nav className="glass-card app-nav no-print" aria-label="Menu utama">
      <div className="nav-top">
        <Link href="/" className="nav-brand">
          <div style={{
            width: '38px', height: '38px', borderRadius: '12px', flexShrink: 0,
            background: 'linear-gradient(135deg, #0369a1 0%, var(--c-sky) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)',
            overflow: 'hidden', padding: depoLogo ? '4px' : '0'
          }}>
            {depoLogo ? (
              <img src={depoLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <Droplets size={22} color="#ffffff" aria-hidden="true" />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="nav-brand-name">{depoName}</div>
            <span className="nav-brand-sub" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Management PWA</span>
          </div>
        </Link>

        <div className="nav-actions">
          {syncStatus.mode !== 'local' && (
            <span
              role="status"
              aria-label={`Status sinkronisasi: ${syncText}`}
              title={syncStatus.mode === 'online'
                ? 'Data tersinkron dengan perangkat lain'
                : 'Tidak terhubung ke server. Data disimpan di perangkat ini dan dikirim otomatis saat online.'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '0.75rem', fontWeight: 700, padding: '6px 8px', borderRadius: '8px',
                color: syncOk ? 'var(--c-green)' : 'var(--c-amber)',
                background: syncOk ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              }}
            >
              <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor' }} />
              <span className="hide-mobile">{syncText}</span>
            </span>
          )}

          {role === 'kasir' && (
            <div
              style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--c-green)', borderRadius: '8px', padding: '5px 10px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              aria-label={`Kas di tangan ${AppStore.formatRupiah(kasDiTanganNav)}`}
            >
              <span className="hide-mobile" style={{ color: 'var(--text-muted)' }}>Kas di Tangan: </span>
              <span className="show-mobile" style={{ color: 'var(--text-muted)' }}>Kas </span>
              <strong style={{ color: 'var(--c-green)', fontWeight: 800 }}>{AppStore.formatRupiah(kasDiTanganNav)}</strong>
            </div>
          )}

          {(role === 'owner' || role === 'admin') && notifCount > 0 && (
            <Link
              href="/owner/dashboard"
              className="icon-btn"
              aria-label={`${notifCount} pemberitahuan baru, buka dashboard`}
              style={{ position: 'relative' }}
            >
              <Bell size={20} aria-hidden="true" />
              <span aria-hidden="true" style={{
                position: 'absolute', top: '2px', right: '2px', minWidth: '18px', height: '18px', padding: '0 4px',
                borderRadius: '9px', background: '#dc2626', color: '#ffffff', fontSize: '0.7rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>{notifCount}</span>
            </Link>
          )}

          <button
            type="button"
            className="icon-btn nav-menu-btn"
            aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={menuOpen}
            aria-controls="nav-panel"
            onClick={() => setMenuOpen(open => !open)}
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div id="nav-panel" className={`nav-panel ${menuOpen ? 'open' : ''}`}>
        <div className="nav-links">
          {role === 'kasir' && (
            <>
              <Link href="/kasir" aria-current={pathname === '/kasir' ? 'page' : undefined} className={linkClass(pathname === '/kasir')}>
                <ShoppingCart size={16} aria-hidden="true" /> POS Kasir
              </Link>
              {tampilPesananMasuk && (
                <Link href="/kasir/pesanan-masuk" aria-current={pathname === '/kasir/pesanan-masuk' ? 'page' : undefined} className={linkClass(pathname === '/kasir/pesanan-masuk')}>
                  <Inbox size={16} aria-hidden="true" /> Pesanan Online
                  {pesananMasukBaru > 0 && <span aria-label={`${pesananMasukBaru} pesanan baru`} style={{ marginLeft: '6px', minWidth: '20px', height: '20px', padding: '0 6px', borderRadius: '10px', background: '#dc2626', color: '#ffffff', fontSize: '0.72rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{pesananMasukBaru}</span>}
                </Link>
              )}
              <Link href="/kasir/shift" aria-current={pathname === '/kasir/shift' ? 'page' : undefined} className={linkClass(pathname === '/kasir/shift')}>
                <Receipt size={16} aria-hidden="true" /> Rekap Shift
              </Link>
              <Link href="/peta" aria-current={pathname === '/peta' ? 'page' : undefined} className={linkClass(pathname === '/peta')}>
                <Map size={16} aria-hidden="true" /> Peta Pelanggan
              </Link>
            </>
          )}

          {(role === 'admin' || role === 'owner') && (
            <Link href="/owner/dashboard" aria-current={pathname === '/owner/dashboard' ? 'page' : undefined} className={linkClass(pathname === '/owner/dashboard')}>
              <LayoutDashboard size={16} aria-hidden="true" /> {role === 'owner' ? 'Dashboard Owner' : 'Dashboard & Target Harian'}
            </Link>
          )}
          {role === 'owner' && (
            <Link href="/owner/keuangan" aria-current={pathname === '/owner/keuangan' ? 'page' : undefined} className={linkClass(pathname === '/owner/keuangan')}>
              <Wallet size={16} aria-hidden="true" /> Keuangan Owner
              {menungguSetoran > 0 && (
                <span aria-label={`${menungguSetoran} setoran menunggu`} style={{ marginLeft: '6px', minWidth: '20px', height: '20px', padding: '0 6px', borderRadius: '10px', background: '#dc2626', color: '#ffffff', fontSize: '0.72rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{menungguSetoran}</span>
              )}
            </Link>
          )}
          {role === 'owner' && tampilPesananMasuk && (
            <Link href="/kasir/pesanan-masuk" aria-current={pathname === '/kasir/pesanan-masuk' ? 'page' : undefined} className={linkClass(pathname === '/kasir/pesanan-masuk')}>
              <Inbox size={16} aria-hidden="true" /> Pesanan Online
              {pesananMasukBaru > 0 && <span aria-label={`${pesananMasukBaru} pesanan baru`} style={{ marginLeft: '6px', minWidth: '20px', height: '20px', padding: '0 6px', borderRadius: '10px', background: '#dc2626', color: '#ffffff', fontSize: '0.72rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{pesananMasukBaru}</span>}
            </Link>
          )}
          {role === 'owner' && (
            <Link href="/owner/laporan" aria-current={pathname === '/owner/laporan' ? 'page' : undefined} className={linkClass(pathname === '/owner/laporan')}>
              <FileText size={16} aria-hidden="true" /> Laporan PDF
            </Link>
          )}
          {(role === 'admin' || role === 'owner') && (
            <Link href="/admin/kontak" aria-current={pathname === '/admin/kontak' ? 'page' : undefined} className={linkClass(pathname === '/admin/kontak')}>
              <Users size={16} aria-hidden="true" /> Pelanggan & Reseller
            </Link>
          )}
          {(role === 'admin' || role === 'owner') && (
            <Link href="/peta" aria-current={pathname === '/peta' ? 'page' : undefined} className={linkClass(pathname === '/peta')}>
              <Map size={16} aria-hidden="true" /> Peta Pelanggan
            </Link>
          )}

          {role === 'owner' && (
            <>
              <Link href="/admin/produk" aria-current={pathname === '/admin/produk' ? 'page' : undefined} className={linkClass(pathname === '/admin/produk')}>
                <Package size={16} aria-hidden="true" /> Produk & Harga
              </Link>
              <Link href="/admin/zona" aria-current={pathname === '/admin/zona' ? 'page' : undefined} className={linkClass(pathname === '/admin/zona')}>
                <MapPin size={16} aria-hidden="true" /> Zona Ongkir
              </Link>
              <Link href="/admin/pengaturan" aria-current={pathname === '/admin/pengaturan' ? 'page' : undefined} className={linkClass(pathname === '/admin/pengaturan')}>
                <Settings size={16} aria-hidden="true" /> Pengaturan Toko
              </Link>
            </>
          )}

          {role === 'pengantar' && (
            <Link href="/pengantar" aria-current={pathname === '/pengantar' ? 'page' : undefined} className={linkClass(pathname === '/pengantar')}>
              <Truck size={16} aria-hidden="true" /> Antaran Lapangan
            </Link>
          )}

          <Link href="/panduan" aria-current={pathname === '/panduan' ? 'page' : undefined} className={linkClass(pathname === '/panduan')}>
            <BookOpen size={16} aria-hidden="true" /> Panduan
          </Link>
        </div>

        <div className="nav-user">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <UserCheck size={16} color="#38bdf8" aria-hidden="true" />
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{currentUser?.nama}</span>
            <span className="badge badge-primary">{role}</span>
          </div>

          {/* Pindah peran tanpa password hanya boleh untuk Owner */}
          {role === 'owner' && (
            <select
              aria-label="Pindah tampilan peran"
              value={role}
              onChange={(e) => handleRoleSwitch(e.target.value as UserRole)}
              className="form-select"
              style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }}
            >
              <option value="kasir">Tampilan: Kasir</option>
              <option value="owner">Tampilan: Owner</option>
              <option value="admin">Tampilan: Admin</option>
              <option value="pengantar">Tampilan: Pengantar</option>
            </select>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={theme === 'light' ? 'Ganti ke mode gelap' : 'Ganti ke mode terang'}
          >
            {theme === 'light' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
            {theme === 'light' ? 'Mode gelap' : 'Mode terang'}
          </button>

          {AUTH_AKTIF && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowGantiPassword(true)}>
              <KeyRound size={16} aria-hidden="true" /> Ganti password
            </button>
          )}

          <button onClick={handleLogoutClick} className="btn btn-secondary btn-sm" type="button">
            <LogOut size={16} aria-hidden="true" /> Keluar
          </button>
        </div>
      </div>

      <GantiPasswordModal isOpen={showGantiPassword} onClose={() => setShowGantiPassword(false)} />

      <TutupShiftModal
        isOpen={showTutupShiftModal}
        shiftAktif={shiftDitutup}
        onClose={() => { setShowTutupShiftModal(false); setShiftDitutup(null); }}
        onShiftClosed={() => {
          setShowTutupShiftModal(false);
          setShiftDitutup(null);
          if (pendingNextAction) {
            pendingNextAction();
            setPendingNextAction(null);
          } else {
            doLogout();
          }
        }}
      />
    </nav>
  );
}
