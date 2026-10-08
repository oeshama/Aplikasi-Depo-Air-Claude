'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { StatusPush, statusPush, aktifkanPush, matikanPush, kirimNotifikasiUji } from '@/lib/push';
import { BellRing, BellOff, Send } from 'lucide-react';

// Tombol di menu: mengaktifkan notifikasi di HP ini, mengujinya, atau mematikannya.
export default function NotifikasiPushTombol() {
  const [status, setStatus] = useState<StatusPush | 'memuat'>('memuat');
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState('');

  const muat = useCallback(async () => setStatus(await statusPush()), []);
  useEffect(() => { muat(); }, [muat]);

  if (status === 'memuat' || status === 'tidak_didukung') return null;

  const aktifkan = async () => {
    setSibuk(true); setPesan('');
    const h = await aktifkanPush();
    setPesan(h.pesan);
    await muat();
    setSibuk(false);
  };
  const uji = async () => { setSibuk(true); setPesan(''); const h = await kirimNotifikasiUji(); setPesan(h.pesan); setSibuk(false); };
  const matikan = async () => { setSibuk(true); await matikanPush(); setPesan('Notifikasi dimatikan di HP ini.'); await muat(); setSibuk(false); };

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
      {status === 'belum' && (
        <button type="button" className="btn btn-primary btn-sm" onClick={aktifkan} disabled={sibuk}>
          <BellRing size={16} aria-hidden="true" /> {sibuk ? 'Mengaktifkan...' : 'Aktifkan notifikasi'}
        </button>
      )}
      {status === 'diblokir' && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPesan('Notifikasi diblokir. Di Chrome: ketuk ikon gembok di samping alamat, pilih Izin atau Pengaturan situs, lalu izinkan Notifikasi. Muat ulang aplikasi setelahnya.')}>
          <BellOff size={16} aria-hidden="true" /> Notifikasi diblokir
        </button>
      )}
      {status === 'aktif' && (
        <>
          <button type="button" className="btn btn-secondary btn-sm" onClick={uji} disabled={sibuk}><Send size={16} aria-hidden="true" /> Uji notifikasi</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={matikan} disabled={sibuk}><BellOff size={16} aria-hidden="true" /> Matikan</button>
        </>
      )}
      {pesan && <span role="status" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexBasis: '100%' }}>{pesan}</span>}
    </div>
  );
}
