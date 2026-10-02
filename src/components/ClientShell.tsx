'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AppStore } from '@/lib/store';
import { initSync } from '@/lib/sync';
import { watchFormLabels } from '@/lib/a11y';
import { UserRole } from '@/lib/types';
import Navbar from '@/components/Navbar';
import ToastHost from '@/components/ToastHost';

// Halaman yang boleh dibuka tiap peran (prefix path)
const ROLE_ACCESS: Record<UserRole, string[]> = {
  owner: ['/owner', '/admin', '/kasir', '/pengantar', '/peta'],
  admin: ['/owner/dashboard', '/admin/kontak', '/peta'],
  kasir: ['/kasir', '/peta'],
  pengantar: ['/pengantar'],
};

export function homeForRole(role: UserRole): string {
  if (role === 'owner' || role === 'admin') return '/owner/dashboard';
  if (role === 'pengantar') return '/pengantar';
  return '/kasir';
}

// Semua data aplikasi ada di localStorage, jadi halaman hanya dirender di browser
// (mencegah hydration error) dan dicek dulu sesi login-nya.
export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Halaman untuk pelanggan: tanpa login, tanpa menu, dan TIDAK mengunduh data toko ke HP pelanggan
  const publik = pathname === '/pesan' || (pathname || '').startsWith('/pesan/');
  const [synced, setSynced] = useState(false);
  const [allowed, setAllowed] = useState(false);

  // Ambil data terbaru dari Supabase sebelum halaman membaca localStorage
  useEffect(() => {
    if (publik) { setSynced(true); return; }
    initSync().finally(() => setSynced(true));
  }, [publik]);

  useEffect(() => watchFormLabels(), []);

  useEffect(() => {
    if (!synced) return;
    setAllowed(false);
    if (publik) {
      setAllowed(true);
      return;
    }
    if (pathname === '/login') {
      setAllowed(true);
      return;
    }

    const user = AppStore.getSessionUser();
    if (!user) {
      window.location.replace('/login');
      return;
    }

    if (pathname !== '/') {
      const ok = ROLE_ACCESS[user.role]?.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
      if (!ok) {
        window.location.replace(homeForRole(user.role));
        return;
      }
    }

    setAllowed(true);
  }, [pathname, synced, publik]);

  // Sesi login berakhir setelah 12 jam: cek berkala dan saat aplikasi dibuka kembali
  useEffect(() => {
    if (!synced || pathname === '/login' || publik) return;

    const check = () => {
      if (!AppStore.getSessionUser()) window.location.replace('/login');
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    const timer = setInterval(check, 60 * 1000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
    };
  }, [synced, pathname, publik]);

  let content: React.ReactNode = null;

  if (!synced) {
    content = (
      <div role="status" style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Menyinkronkan data...
      </div>
    );
  } else if (allowed && publik) {
    content = <main id="konten-utama" tabIndex={-1} style={{ outline: 'none' }}>{children}</main>;
  } else if (allowed) {
    content = (
      <>
        <a href="#konten-utama" className="skip-link">Lewati ke konten utama</a>
        <Navbar />
        <main id="konten-utama" tabIndex={-1} style={{ padding: '0 16px 40px 16px', maxWidth: '1280px', margin: '0 auto', outline: 'none' }}>
          {children}
        </main>
      </>
    );
  }

  return (
    <>
      <ToastHost />
      {content}
    </>
  );
}
