import type { Metadata, Viewport } from 'next';
import './globals.css';
import ClientShell from '@/components/ClientShell';

export const metadata: Metadata = {
  title: 'Depo Air Isi Ulang - Sistem Kasir & Manajemen PWA',
  description: 'Aplikasi Manajemen Depo Air Isi Ulang PWA untuk Penjualan, Pengiriman, Galon, Karyawan, dan Keuangan.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192.png',
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0284c7',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
