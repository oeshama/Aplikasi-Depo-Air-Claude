'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppStore } from '@/lib/store';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const user = AppStore.getCurrentUser();
    if (!user) {
      router.push('/login');
    } else if (user.role === 'kasir') {
      router.push('/kasir');
    } else if (user.role === 'owner') {
      router.push('/owner/dashboard');
    } else if (user.role === 'admin') {
      router.push('/owner/dashboard');
    } else if (user.role === 'pengantar') {
      router.push('/pengantar');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card" style={{ padding: '30px', textAlign: 'center' }}>
        <p style={{ color: '#94a3b8' }}>Mengarahkan ke Halaman Sesuai Peran User...</p>
      </div>
    </div>
  );
}
