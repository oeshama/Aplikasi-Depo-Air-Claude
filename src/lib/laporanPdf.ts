import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AppStore } from './store';
import { DataLaporan, perubahanPersen } from './laporan';

const HIJAU: [number, number, number] = [15, 118, 110];
const ABU: [number, number, number] = [100, 116, 139];
const GELAP: [number, number, number] = [15, 23, 42];

function rp(n: number): string {
  const neg = n < 0;
  return (neg ? '-' : '') + 'Rp ' + Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function angka(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function teksPerubahan(sekarang: number, sebelum: number): string {
  const p = perubahanPersen(sekarang, sebelum);
  if (p === null) return 'baru';
  return (p > 0 ? '+' : '') + p + '%';
}
const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function muatGambar(src: string): Promise<{ data: string; w: number; h: number } | null> {
  return new Promise(resolve => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          const ctx = c.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0);
          resolve({ data: c.toDataURL('image/jpeg', 0.85), w: img.naturalWidth, h: img.naturalHeight });
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = src;
      setTimeout(() => resolve(null), 4000);
    } catch { resolve(null); }
  });
}

export async function buatPdfLaporan(d: DataLaporan): Promise<{ blob: Blob; namaFile: string }> {
  const peng = AppStore.getPengaturan();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const L = 14, R = 196, LEBAR = R - L;
  const barisKop = (peng.header_struk || peng.nama_depo || 'Depo Air').split('\n').map(s => s.trim()).filter(Boolean);
  const namaDepo = barisKop[0] || 'Depo Air';
  const judul = d.rentang.jenis === 'mingguan' ? 'LAPORAN MINGGUAN' : 'LAPORAN BULANAN';
  let y = 14;

  // Kop
  let xTeks = L;
  if (peng.logo_url) {
    const g = await muatGambar(peng.logo_url);
    if (g) {
      const tinggi = 16; const lebar = Math.min(30, (g.w / g.h) * tinggi);
      try { doc.addImage(g.data, 'JPEG', L, y - 4, lebar, tinggi); xTeks = L + lebar + 4; } catch { /* logo gagal, lanjut tanpa */ }
    }
  }
  doc.setTextColor(...GELAP); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text(namaDepo, xTeks, y + 1);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...ABU);
  barisKop.slice(1, 4).forEach((b, i) => doc.text(b, xTeks, y + 6 + i * 4));
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...HIJAU);
  doc.text(judul, R, y + 1, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GELAP);
  doc.text(d.rentang.label, R, y + 6, { align: 'right' });
  y += 20;
  doc.setDrawColor(...HIJAU); doc.setLineWidth(0.6); doc.line(L, y, R, y);
  y += 6;

  const perlu = (tinggi: number) => { if (y + tinggi > 282) { doc.addPage(); y = 16; } };
  const judulBagian = (t: string) => {
    perlu(24);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...HIJAU);
    doc.text(t.toUpperCase(), L, y); y += 2;
  };
  const tabel = (head: string[], body: (string | number)[][], opsi: { kananDari?: number; tebalBarisAkhir?: boolean } = {}) => {
    autoTable(doc, {
      startY: y + 1, margin: { left: L, right: 210 - R }, head: [head], body: body.map(b => b.map(String)),
      theme: 'grid', styles: { fontSize: 8.5, cellPadding: 1.6, textColor: GELAP, lineColor: [226, 232, 240], lineWidth: 0.2 },
      headStyles: { fillColor: HIJAU, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: Object.fromEntries(head.map((_, i) => [i, { halign: i >= (opsi.kananDari ?? 1) ? 'right' : 'left' }])) as any,
      didParseCell: (h) => { if (opsi.tebalBarisAkhir && h.section === 'body' && h.row.index === body.length - 1) h.cell.styles.fontStyle = 'bold'; }
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  };
  const catatan = (t: string) => {
    perlu(8); doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...ABU);
    const baris = doc.splitTextToSize(t, LEBAR) as string[]; doc.text(baris, L, y); y += baris.length * 3.6 + 3;
  };

  // 1. Ringkasan eksekutif: kartu angka
  judulBagian('1. Ringkasan eksekutif');
  y += 2;
  const kartu = [
    { t: 'Omzet', v: rp(d.ini.omzet), s: `${teksPerubahan(d.ini.omzet, d.sebelumnya.omzet)} vs ${d.rentang.jenis === 'mingguan' ? 'minggu lalu' : 'bulan lalu'}` },
    { t: 'Laba bersih', v: rp(d.ini.labaBersih), s: `margin ${d.marginPersen}%` },
    { t: 'Transaksi', v: angka(d.ini.transaksi), s: `${teksPerubahan(d.ini.transaksi, d.sebelumnya.transaksi)} vs sebelumnya` },
    { t: 'Galon terjual', v: angka(d.ini.galon), s: `${angka(d.ini.liter)} liter` }
  ];
  const lk = (LEBAR - 3 * 3) / 4;
  kartu.forEach((k, i) => {
    const x = L + i * (lk + 3);
    doc.setFillColor(240, 253, 250); doc.setDrawColor(204, 235, 230); doc.roundedRect(x, y, lk, 20, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...ABU); doc.text(k.t, x + 3, y + 5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(k.v.length > 13 ? 9.5 : 11); doc.setTextColor(...GELAP); doc.text(k.v, x + 3, y + 11.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...ABU); doc.text(k.s, x + 3, y + 16.5);
  });
  y += 26;

  const baris: string[][] = [
    ['Omzet', rp(d.ini.omzet), rp(d.sebelumnya.omzet), teksPerubahan(d.ini.omzet, d.sebelumnya.omzet)],
    ['Jumlah transaksi', angka(d.ini.transaksi), angka(d.sebelumnya.transaksi), teksPerubahan(d.ini.transaksi, d.sebelumnya.transaksi)],
    ['Galon terjual', angka(d.ini.galon), angka(d.sebelumnya.galon), teksPerubahan(d.ini.galon, d.sebelumnya.galon)],
    ['Volume terjual (liter)', angka(d.ini.liter), angka(d.sebelumnya.liter), teksPerubahan(d.ini.liter, d.sebelumnya.liter)],
    ['Laba bersih', rp(d.ini.labaBersih), rp(d.sebelumnya.labaBersih), teksPerubahan(d.ini.labaBersih, d.sebelumnya.labaBersih)]
  ];
  tabel(['Ukuran', d.rentang.label, d.sebelumnya.label, 'Perubahan'], baris);

  const adaTarget = d.target.omzet > 0 || d.target.galon > 0 || d.target.liter > 0;
  if (adaTarget) {
    const pct = (a: number, t: number) => t > 0 ? Math.round((a / t) * 100) + '%' : '-';
    tabel(['Capaian target', 'Realisasi', 'Target', 'Capaian'], [
      ['Omzet', rp(d.ini.omzet), d.target.omzet > 0 ? rp(d.target.omzet) : '-', pct(d.ini.omzet, d.target.omzet)],
      ['Galon', angka(d.ini.galon), d.target.galon > 0 ? angka(d.target.galon) : '-', pct(d.ini.galon, d.target.galon)],
      ['Liter', angka(d.ini.liter), d.target.liter > 0 ? angka(d.target.liter) : '-', pct(d.ini.liter, d.target.liter)]
    ]);
  }

  // Grafik batang omzet per hari
  judulBagian(d.rentang.jenis === 'mingguan' ? 'Omzet per hari' : 'Omzet per hari (satu batang = satu tanggal)');
  const tinggiGrafik = 38; const dasar = y + tinggiGrafik + 4;
  perlu(tinggiGrafik + 14);
  const dasarY = y + tinggiGrafik + 4;
  const maks = Math.max(1, ...d.perHari.map(h => h.omzet));
  const n = d.perHari.length; const slot = LEBAR / n; const lb = Math.min(14, slot * 0.7);
  doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.2); doc.line(L, dasarY, R, dasarY);
  d.perHari.forEach((h, i) => {
    const t = (h.omzet / maks) * tinggiGrafik; const x = L + i * slot + (slot - lb) / 2;
    if (t > 0) { doc.setFillColor(...HIJAU); doc.rect(x, dasarY - t, lb, t, 'F'); }
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...ABU);
    if (n <= 7) {
      doc.setFontSize(7.5); doc.text(`${HARI[h.tanggal.getDay()]} ${h.tanggal.getDate()}`, x + lb / 2, dasarY + 4, { align: 'center' });
      if (h.omzet > 0) { doc.setFontSize(6.5); doc.setTextColor(...GELAP); doc.text(angka(h.omzet / 1000) + 'rb', x + lb / 2, dasarY - t - 1, { align: 'center' }); }
    } else {
      doc.setFontSize(6); if ((i + 1) % 2 === 1 || n <= 16) doc.text(String(h.tanggal.getDate()), x + lb / 2, dasarY + 3.5, { align: 'center' });
    }
  });
  void dasar;
  y = dasarY + 9;

  // 2. Laba rugi
  judulBagian('2. Laba rugi');
  tabel(['Komponen', 'Jumlah'], [
    ['Omzet penjualan', rp(d.ini.omzet)],
    [`Harga pokok air (${angka(d.ini.liter)} L x ${d.hppPerLiter.toFixed(1).replace('.', ',')}/L${d.hppDiperkirakan ? ', perkiraan' : ''})`, '- ' + rp(d.ini.hpp)],
    ['Laba kotor', rp(d.labaKotor)],
    ...d.biayaPerKategori.map(b => [b.label, '- ' + rp(b.nominal)]),
    ['Laba bersih', rp(d.ini.labaBersih)]
  ], { tebalBarisAkhir: true });
  catatan('Harga pokok dihitung dari rata-rata biaya pembelian air baku dibagi volume air yang masuk. Pembelian air baku dan pengembalian kasbon tidak dihitung sebagai biaya operasional. Angka sama dengan Dashboard Owner.');

  // 3. Uang
  judulBagian('3. Uang');
  const u = d.uang;
  tabel(['Arus kas periode ini', 'Jumlah'], [
    ['Penjualan tunai langsung', rp(u.tunaiLangsung)],
    ['Setoran uang dari kurir', rp(u.setoranKurir)],
    ['Penjualan non-tunai (transfer, QRIS, dll)', rp(u.nonTunai)],
    ['Penjualan dicatat hutang', rp(u.hutangBaru)],
    ['Pengeluaran dari laci kasir', '- ' + rp(u.pengeluaranLaci)],
    ['Pengeluaran dari kas besar / rekening owner', '- ' + rp(u.pengeluaranKasOwner)],
    ['Pengeluaran dari uang pegangan kasir', '- ' + rp(u.pengeluaranPegangan)],
    ['Uang pegangan yang masih dipegang kasir (saat ini)', rp(u.peganganDiKasir)],
    ['Uang laci diserahkan ke owner', rp(u.diserahkanOwner)]
  ]);
  if (u.selisihKasir.length) {
    tabel(['Selisih kasir', 'Shift', 'Selisih laci', 'Selisih setoran'], u.selisihKasir.map(k => [k.kasir, k.shift, rp(k.selisihLaci), rp(k.selisihSetoran)]), { kananDari: 1 });
  }
  if (u.saldoAkhir) {
    tabel(['Saldo akhir periode (kas owner)', 'Saldo'], [...u.saldoAkhir.map(s => [s.nama, rp(s.saldo)]), ['Total', rp(u.saldoAkhir.reduce((a, s) => a + s.saldo, 0))]], { tebalBarisAkhir: true });
  } else {
    catatan('Saldo kas besar dan rekening belum ditampilkan karena fitur Keuangan Owner belum dimulai.');
  }

  // 4. Piutang dan karyawan
  judulBagian('4. Piutang pelanggan');
  if (d.piutang.jumlahPelanggan === 0) catatan('Tidak ada pelanggan yang berhutang.');
  else {
    tabel(['Penunggak terbesar', 'Hutang'], [...d.piutang.teratas.map(p => [p.nama, rp(p.hutang)]), [`Total ${d.piutang.jumlahPelanggan} pelanggan`, rp(d.piutang.total)]], { tebalBarisAkhir: true });
    catatan('Posisi piutang adalah keadaan saat laporan dibuat.');
  }
  judulBagian('Karyawan');
  tabel(['Biaya karyawan periode ini', 'Jumlah'], [
    ['Gaji dibayar', rp(d.karyawan.gajiDibayar)],
    ['Kasbon diberikan', rp(d.karyawan.kasbonDiberikan)],
    ['Kasbon dikembalikan', rp(d.karyawan.kasbonDikembalikan)],
    ['Ongkir kurir dibayar', rp(d.karyawan.ongkirDibayar)],
    ['Sisa kasbon yang masih berjalan (saat ini)', rp(d.karyawan.kasbonAktif)]
  ]);

  // 5. Pelanggan dan produk
  judulBagian('5. Pelanggan dan produk');
  if (d.pelanggan.teratas.length) tabel(['Pelanggan teratas', 'Pesanan', 'Omzet'], d.pelanggan.teratas.map(p => [p.nama, p.pesanan, rp(p.omzet)]));
  tabel(['Aktivitas pelanggan', 'Jumlah'], [
    ['Pelanggan baru pertama kali membeli', d.pelanggan.baruBertransaksi],
    ['Pelanggan aktif (membeli dalam 30 hari terakhir)', d.pelanggan.aktif],
    ['Sudah lama tidak membeli', d.pelanggan.lamaTidakBeli],
    ['Belum pernah membeli', d.pelanggan.belumPernah]
  ]);
  if (d.produk.length) tabel(['Produk terlaris', 'Terjual', 'Nilai'], d.produk.map(p => [p.nama, angka(p.jumlah), rp(p.omzet)]));

  // 6. Air baku
  judulBagian('6. Air baku');
  const a = d.airBaku;
  const rowsAir: (string | number)[][] = [
    ['Stok air baku saat ini', angka(a.stokSekarang) + ' L' + (a.stokSekarang < a.minimum ? '  (di bawah batas ' + angka(a.minimum) + ' L)' : '')],
    ['Dibeli pada periode ini', angka(a.dibeliLiter) + ' L  /  ' + rp(a.dibeliBiaya)],
    ['Terjual pada periode ini (hitungan penjualan)', angka(a.terjualLiter) + ' L']
  ];
  if (a.pemakaianMeterLiter !== null) {
    const sel = a.pemakaianMeterLiter - a.terjualLiter;
    rowsAir.push(['Terpakai menurut meteran shift', angka(a.pemakaianMeterLiter) + ' L']);
    rowsAir.push(['Selisih meteran dan penjualan', (sel > 0 ? '+' : '') + angka(sel) + ' L']);
  }
  tabel(['Ukuran', 'Nilai'], rowsAir);

  // Footer tiap halaman
  const total = doc.getNumberOfPages();
  const dibuat = new Date().toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  for (let i = 1; i <= total; i++) {
    doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...ABU);
    doc.text(`${namaDepo} - ${judul.toLowerCase()} ${d.rentang.label} - dibuat ${dibuat}`, L, 290);
    doc.text(`Halaman ${i} dari ${total}`, R, 290, { align: 'right' });
  }

  const slug = namaDepo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'depo';
  const namaFile = `laporan-${d.rentang.jenis}-${d.rentang.kunci}-${slug}.pdf`;
  return { blob: doc.output('blob'), namaFile };
}
