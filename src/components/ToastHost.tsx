'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ToastItem {
  id: number;
  text: string;
  tone: 'info' | 'error' | 'success';
}

const ERROR_HINT = /(tidak boleh|tidak bisa|tidak dapat|wajib|harus|gagal|melebihi|kurang dari|salah|tidak ditemukan|tidak terdaftar|belum dapat|ditolak|❌|⚠)/i;
const SUCCESS_HINT = /(berhasil|tersimpan|ditambahkan|dikonfirmasi|terkirim)/i;

function detectTone(text: string): ToastItem['tone'] {
  if (ERROR_HINT.test(text)) return 'error';
  if (SUCCESS_HINT.test(text)) return 'success';
  return 'info';
}

// Mengganti window.alert (kotak dialog yang memblokir layar) dengan notifikasi kecil
// yang hilang sendiri. Semua pemanggilan alert() di aplikasi otomatis memakai ini.
export default function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    const originalAlert = window.alert;

    const dismiss = (id: number) => setToasts(list => list.filter(t => t.id !== id));

    window.alert = (message?: unknown) => {
      const text = String(message ?? '').trim();
      if (!text) return;
      const id = nextId.current++;
      const tone = detectTone(text);
      setToasts(list => [...list.slice(-2), { id, text, tone }]);
      // Pesan error dibiarkan lebih lama supaya sempat dibaca
      setTimeout(() => dismiss(id), tone === 'error' ? 8000 : 4500);
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" role="region" aria-label="Notifikasi">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast ${t.tone}`}
          role={t.tone === 'error' ? 'alert' : 'status'}
          onClick={() => setToasts(list => list.filter(x => x.id !== t.id))}
          title="Ketuk untuk menutup"
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
