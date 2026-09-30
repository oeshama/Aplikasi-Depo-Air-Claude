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
  themeColor: '#0369a1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // data-theme diatur oleh skrip di <head> sebelum halaman tampil (mencegah layar berkedip)
    <html lang="id" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "try{document.documentElement.setAttribute('data-theme',localStorage.getItem('depo_theme')==='dark'?'dark':'light')}catch(e){}"
          }}
        />
      </head>
      <body>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
