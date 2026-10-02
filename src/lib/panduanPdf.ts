import { jsPDF } from 'jspdf';
import { AppStore } from './store';
import { UserRole } from './types';
import { TOPIK, URUTAN_KELOMPOK, URUTAN_BELAJAR, Topik } from './panduan';
import { muatGambar } from './laporanPdf';

const HIJAU: [number, number, number] = [15, 118, 110];
const ABU: [number, number, number] = [100, 116, 139];
const GELAP: [number, number, number] = [15, 23, 42];
const L = 16, R = 194, LEBAR = R - L;
const BATAS_BAWAH = 280;

const NAMA_PERAN: Record<UserRole, string> = { owner: 'Owner (lengkap)', admin: 'Admin', kasir: 'Kasir', pengantar: 'Pengantar' };

// PDF Panduan Pemakaian untuk satu peran: sampul, daftar isi bernomor halaman (bisa diketuk), lalu semua topik.
export async function buatPdfPanduan(peran: UserRole): Promise<{ blob: Blob; namaFile: string }> {
  const peng = AppStore.getPengaturan();
  const barisKop = (peng.header_struk || peng.nama_depo || 'Depo Air').split('\n').map(s => s.trim()).filter(Boolean);
  const namaDepo = barisKop[0] || 'Depo Air';
  const topik = TOPIK.filter(t => t.peran.includes(peran));
  const kelompok = URUTAN_KELOMPOK.filter(k => topik.some(t => t.kelompok === k));
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // ===== Sampul =====
  let y = 30;
  if (peng.logo_url) {
    const g = await muatGambar(peng.logo_url);
    if (g) {
      const tinggi = 26; const lebar = Math.min(60, (g.w / g.h) * tinggi);
      try { doc.addImage(g.data, 'JPEG', (210 - lebar) / 2, y, lebar, tinggi); y += tinggi + 10; } catch { /* tanpa logo */ }
    }
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(26); doc.setTextColor(...HIJAU);
  doc.text('PANDUAN PEMAKAIAN', 105, y + 10, { align: 'center' });
  doc.setFontSize(14); doc.setTextColor(...GELAP);
  doc.text(namaDepo, 105, y + 20, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor(...ABU);
  doc.text(`Untuk peran: ${NAMA_PERAN[peran]}`, 105, y + 29, { align: 'center' });
  const tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.setFontSize(10);
  doc.text(`Dibuat ${tanggal}`, 105, y + 36, { align: 'center' });
  doc.setDrawColor(...HIJAU); doc.setLineWidth(0.8); doc.line(60, y + 41, 150, y + 41);

  const belajar = (URUTAN_BELAJAR[peran] || []).map(id => topik.find(t => t.id === id)).filter(Boolean) as Topik[];
  let yb = y + 54;
  if (belajar.length) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...HIJAU);
    doc.text('Mulai dari sini', L, yb); yb += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...GELAP);
    doc.text('Pelajari berurutan. Setiap topik hanya beberapa menit.', L, yb); yb += 6.5;
    belajar.forEach((t, i) => { doc.text(`${i + 1}. ${t.judul}`, L + 3, yb); yb += 5.6; });
  }
  doc.setFontSize(9); doc.setTextColor(...ABU);
  const catatanSampul = doc.splitTextToSize('Panduan ini mengikuti fitur aplikasi pada tanggal pembuatan. Kalau ada langkah yang membingungkan atau tampilan aplikasi berbeda, tanyakan ke owner.', LEBAR) as string[];
  doc.text(catatanSampul, L, 270);

  // ===== Ruang daftar isi (diisi belakangan, setelah nomor halaman diketahui) =====
  const barisToc = topik.length + kelompok.length;
  const halToc = Math.max(1, Math.ceil((barisToc * 6.2) / 245));
  for (let i = 0; i < halToc; i++) doc.addPage();
  doc.addPage();
  y = 18;

  const perlu = (tinggi: number) => { if (y + tinggi > BATAS_BAWAH) { doc.addPage(); y = 18; } };
  const halamanTopik = new Map<string, number>();
  const halamanKelompok = new Map<string, number>();

  // Paragraf yang boleh terpotong antar halaman, dengan indentasi bergantung
  const paragraf = (teks: string, x: number, lebar: number, ukuran: number, tinggiBaris: number, awalan?: string) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(ukuran); doc.setTextColor(...GELAP);
    const baris = doc.splitTextToSize(teks, lebar) as string[];
    baris.forEach((b, i) => {
      perlu(tinggiBaris);
      if (i === 0 && awalan) { doc.setFont('helvetica', 'bold'); doc.text(awalan, x - 6, y); doc.setFont('helvetica', 'normal'); }
      doc.text(b, x, y);
      y += tinggiBaris;
    });
  };

  const kotak = (label: string, teks: string, isi: [number, number, number], garis: [number, number, number], warnaLabel: [number, number, number]) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
    const baris = doc.splitTextToSize(teks, LEBAR - 8) as string[];
    const tinggi = 7 + baris.length * 4.4 + 2;
    perlu(tinggi + 2);
    doc.setFillColor(...isi); doc.setDrawColor(...garis); doc.setLineWidth(0.3);
    doc.roundedRect(L, y, LEBAR, tinggi, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...warnaLabel);
    doc.text(label.toUpperCase(), L + 4, y + 4.6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...GELAP);
    baris.forEach((b, i) => doc.text(b, L + 4, y + 9.4 + i * 4.4));
    y += tinggi + 2.5;
  };

  // ===== Isi =====
  kelompok.forEach(k => {
    perlu(54); // kop kelompok harus ikut bersama topik pertamanya
    halamanKelompok.set(k, doc.getNumberOfPages());
    doc.setFillColor(...HIJAU); doc.roundedRect(L, y, LEBAR, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
    doc.text(k.toUpperCase(), L + 4, y + 5.6);
    y += 14;

    topik.filter(t => t.kelompok === k).forEach(t => {
      perlu(34);
      halamanTopik.set(t.id, doc.getNumberOfPages());
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...GELAP);
      const judul = doc.splitTextToSize(t.judul, LEBAR) as string[];
      judul.forEach(j => { doc.text(j, L, y); y += 6; });
      doc.setFont('helvetica', 'italic'); doc.setFontSize(9.5); doc.setTextColor(...ABU);
      (doc.splitTextToSize(t.ringkas, LEBAR) as string[]).forEach(r => { doc.text(r, L, y); y += 4.6; });
      y += 2;
      if (t.buka) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...ABU);
        doc.text(`Menu: ${t.buka.label.replace(/^Buka /, '')}`, L, y); y += 5;
      }
      t.langkah.forEach((l, i) => {
        paragraf(l, L + 8, LEBAR - 8, 10.5, 5, `${i + 1}.`);
        y += 1.2;
      });
      y += 1;
      (t.tips || []).forEach(x => kotak('Tips', x, [236, 253, 245], [167, 243, 208], [4, 120, 87]));
      (t.hati || []).forEach(x => kotak('Perhatian', x, [254, 243, 199], [252, 211, 77], [146, 64, 14]));
      y += 6;
    });
  });

  // ===== Daftar isi =====
  doc.setPage(2);
  let yt = 22; let hal = 2;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...HIJAU);
  doc.text('Daftar Isi', L, yt); yt += 10;
  const barisIsi = (judul: string, nomor: number, tebal: boolean) => {
    if (yt > BATAS_BAWAH - 4) { hal += 1; doc.setPage(hal); yt = 22; }
    doc.setFont('helvetica', tebal ? 'bold' : 'normal'); doc.setFontSize(tebal ? 11 : 10); doc.setTextColor(...(tebal ? HIJAU : GELAP));
    const x = tebal ? L : L + 4;
    doc.text(judul, x, yt);
    if (!tebal) {
      const lebarJudul = doc.getTextWidth(judul);
      doc.setDrawColor(190, 198, 210); doc.setLineWidth(0.25); doc.setLineDashPattern([0.4, 1.2], 0);
      doc.line(x + lebarJudul + 2, yt - 0.8, R - 9, yt - 0.8);
      doc.setLineDashPattern([], 0);
    }
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...ABU);
    doc.text(String(nomor), R, yt, { align: 'right' });
    doc.link(x, yt - 4, R - x, 5.5, { pageNumber: nomor });
    yt += tebal ? 6.8 : 5.6;
  };
  kelompok.forEach(k => {
    yt += 1.5;
    barisIsi(k, halamanKelompok.get(k) || 1, true);
    topik.filter(t => t.kelompok === k).forEach(t => barisIsi(t.judul, halamanTopik.get(t.id) || 1, false));
  });

  // ===== Kaki halaman =====
  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2); doc.line(L, 287, R, 287);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...ABU);
    doc.text(`Panduan Pemakaian - ${namaDepo} - ${NAMA_PERAN[peran]}`, L, 291.5);
    doc.text(`Halaman ${i} dari ${total}`, R, 291.5, { align: 'right' });
  }

  const slug = namaDepo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'depo';
  return { blob: doc.output('blob'), namaFile: `panduan-${peran === 'owner' ? 'owner-lengkap' : peran}-${slug}.pdf` };
}
