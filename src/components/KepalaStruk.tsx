import React from 'react';
import { PengaturanDepo } from '@/lib/types';

interface KepalaStrukProps {
  pengaturan: PengaturanDepo;
  rapat?: boolean;          // jarak antar baris dirapatkan (struk shift/kas)
  tampilkanWa?: boolean;    // ikut menampilkan nomor WA toko bila Header Struk Cetak kosong
}

// Kepala struk di layar: memakai isian "Header Struk Cetak" di Pengaturan Toko.
// Baris pertama menjadi judul tebal. Bila isian itu kosong, dipakai Nama Depo, Alamat, dan WA.
export default function KepalaStruk({ pengaturan, rapat, tampilkanWa }: KepalaStrukProps) {
  const baris = (pengaturan.header_struk || '').split('\n').map(t => t.trim()).filter(Boolean);
  const judul: React.CSSProperties = { fontSize: '1.1rem', fontWeight: 'bold', margin: rapat ? 0 : undefined };
  const kecil: React.CSSProperties = { fontSize: '0.75rem', color: '#555', margin: rapat ? '2px 0' : undefined };

  if (baris.length > 0) {
    return (
      <>
        <h3 style={judul}>{baris[0]}</h3>
        {baris.slice(1).map((t, i) => <p key={i} style={kecil}>{t}</p>)}
      </>
    );
  }
  return (
    <>
      <h3 style={judul}>{pengaturan.nama_depo}</h3>
      <p style={kecil}>{pengaturan.alamat}</p>
      {tampilkanWa && <p style={kecil}>WA: {pengaturan.no_wa}</p>}
    </>
  );
}
